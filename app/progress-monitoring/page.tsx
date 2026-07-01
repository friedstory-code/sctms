import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ProgressMonitoringPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;

  const operators = await prisma.operator.findMany({
    where: { active: true },
    include: {
      productionArea: true,
      assessments: { orderBy: { assessmentDate: "asc" } },
      trainingPlans: { include: { items: true } },
      enrollments: { include: { session: true } },
    },
    orderBy: { fullName: "asc" },
  });

  const domains = await prisma.domain.findMany({ orderBy: { code: "asc" } });
  const targets = await prisma.roleProfileTarget.findMany();

  const rows = operators.map((op) => {
    const domainSummaries = domains.map((d) => {
      const assessmentsForDomain = op.assessments
        .filter((a) => a.domainId === d.id)
        .sort((a, b) => new Date(a.assessmentDate).getTime() - new Date(b.assessmentDate).getTime());

      const target = targets.find((t) => t.roleProfile === op.roleProfile && t.domainId === d.id)?.targetLevel ?? 0;
      const currentLevel = assessmentsForDomain.at(-1)?.level ?? 0;
      const gap = Math.max(0, target - currentLevel);
      return { domainCode: d.code, currentLevel, target, gap };
    });

    const totalGap = domainSummaries.reduce((sum, d) => sum + d.gap, 0);
    const totalDomains = domainSummaries.length;
    const domainsAtTarget = domainSummaries.filter((d) => d.gap === 0).length;
    const completionPct = Math.round((domainsAtTarget / totalDomains) * 100);

    const planItems = op.trainingPlans.flatMap((p) => p.items);
    const completedItems = planItems.filter((i) => i.status === "COMPLETED" || i.status === "ASSESSED").length;

    const sessionsAttended = op.enrollments.filter((e) => e.attendance === "ATTENDED").length;

    return {
      operatorId: op.id,
      fullName: op.fullName,
      employeeId: op.employeeId,
      roleProfile: op.roleProfile,
      productionArea: op.productionArea.name,
      completionPct,
      domainsAtTarget,
      totalDomains,
      totalGap,
      planItems: planItems.length,
      completedItems,
      sessionsAttended,
      domainSummaries,
    };
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sc-page-title">Progress Monitoring</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Per-operator view of competency gap closure, training plan completion, and session attendance.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="sc-stat-card">
          <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted)" }}>Active operators</div>
          <div className="text-2xl font-bold sc-page-title mt-1">{operators.length}</div>
        </div>
        <div className="sc-stat-card">
          <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted)" }}>Avg. completion</div>
          <div className="text-2xl font-bold sc-page-title mt-1">
            {operators.length > 0 ? Math.round(rows.reduce((s, r) => s + r.completionPct, 0) / rows.length) : 0}%
          </div>
        </div>
        <div className="sc-stat-card">
          <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted)" }}>Fully competent</div>
          <div className="text-2xl font-bold mt-1" style={{ color: "var(--status-green-text)" }}>
            {rows.filter((r) => r.totalGap === 0).length}
          </div>
        </div>
        <div className="sc-stat-card" style={{ borderLeftColor: "var(--status-red-text)" }}>
          <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted)" }}>Gaps remaining</div>
          <div className="text-2xl font-bold mt-1" style={{ color: "var(--status-red-text)" }}>
            {rows.reduce((s, r) => s + r.totalGap, 0)}
          </div>
        </div>
      </div>

      {/* Per-operator progress table */}
      <div className="sc-card overflow-x-auto">
        <table className="min-w-full sc-table">
          <thead>
            <tr>
              <th>Operator</th>
              <th>Area</th>
              <th>Role</th>
              <th>Domains at target</th>
              <th>Completion</th>
              <th>Plan items done</th>
              <th>Sessions attended</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.operatorId}>
                <td className="font-medium">{row.fullName}</td>
                <td style={{ color: "var(--muted)" }}>{row.productionArea}</td>
                <td style={{ color: "var(--muted)" }}>{row.roleProfile}</td>
                <td>{row.domainsAtTarget} / {row.totalDomains}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--border)", minWidth: 80 }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${row.completionPct}%`,
                          background: row.completionPct === 100 ? "var(--status-green-text)" : "var(--brand-600)",
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold">{row.completionPct}%</span>
                  </div>
                </td>
                <td>{row.completedItems} / {row.planItems}</td>
                <td>{row.sessionsAttended}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center p-6" style={{ color: "var(--muted)" }}>No operators yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Domain breakdown per operator */}
      {rows.length > 0 && (
        <div>
          <h2 className="font-semibold sc-page-title text-base mb-4">Domain-level breakdown</h2>
          <div className="sc-card overflow-x-auto">
            <table className="min-w-full sc-table">
              <thead>
                <tr>
                  <th>Operator</th>
                  {domains.map((d) => (
                    <th key={d.id} className="text-center">{d.code}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.operatorId}>
                    <td className="font-medium">{row.fullName}</td>
                    {row.domainSummaries.map((ds) => (
                      <td key={ds.domainCode} className="text-center">
                        <span className={`sc-badge ${ds.gap === 0 ? "sc-badge-green" : ds.gap === 1 ? "sc-badge-amber" : "sc-badge-red"}`}>
                          {ds.currentLevel}/{ds.target}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
