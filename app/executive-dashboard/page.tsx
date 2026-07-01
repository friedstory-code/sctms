import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ExecutiveDashboardPage() {
  await auth();

  const [areas, operators, assessments, targets, certifications, sessions, planItems] =
    await Promise.all([
      prisma.productionArea.findMany({ orderBy: { name: "asc" } }),
      prisma.operator.findMany({ where: { active: true }, include: { productionArea: true } }),
      prisma.assessment.findMany({ orderBy: { assessmentDate: "desc" } }),
      prisma.roleProfileTarget.findMany(),
      prisma.certification.findMany({ include: { operator: true, domain: true } }),
      prisma.trainingSession.findMany({ include: { enrollments: true } }),
      prisma.trainingPlanItem.findMany(),
    ]);

  const domains = await prisma.domain.findMany({ orderBy: { code: "asc" } });

  // --- per-area stats ---
  const areaStats = areas.map((area) => {
    const areaOperators = operators.filter((o) => o.productionAreaId === area.id);

    let green = 0, amber = 0, red = 0, grey = 0;
    for (const op of areaOperators) {
      for (const domain of domains) {
        const latest = assessments.find(
          (a) => a.operatorId === op.id && a.domainId === domain.id
        );
        const level = latest?.level ?? 0;
        const target = targets.find(
          (t) => t.roleProfile === op.roleProfile && t.domainId === domain.id
        )?.targetLevel ?? 0;

        if (!latest) grey++;
        else if (level >= target) green++;
        else if (target - level === 1) amber++;
        else red++;
      }
    }

    const total = green + amber + red + grey;
    const completionPct = total > 0 ? Math.round((green / total) * 100) : 0;

    return {
      areaId: area.id,
      areaName: area.name,
      headcount: areaOperators.length,
      green, amber, red, grey,
      total,
      completionPct,
    };
  });

  // --- certification alerts ---
  const now = Date.now();
  const expiring = certifications.filter((c) => {
    if (!c.expiryDate) return false;
    const days = (new Date(c.expiryDate).getTime() - now) / 86400000;
    return days >= 0 && days <= 90;
  });
  const expired = certifications.filter((c) => {
    if (!c.expiryDate) return false;
    return new Date(c.expiryDate).getTime() < now;
  });

  // --- training activity (last 30 days) ---
  const cutoff = new Date(Date.now() - 30 * 86400000);
  const recentSessions = sessions.filter((s) => new Date(s.date) >= cutoff);
  const recentAttendance = recentSessions.flatMap((s) =>
    s.enrollments.filter((e) => e.attendance === "ATTENDED")
  ).length;

  // --- plan completion ---
  const completedPlanItems = planItems.filter(
    (i) => i.status === "COMPLETED" || i.status === "ASSESSED"
  ).length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sc-page-title">Executive Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Cross-area competency health, certification compliance, and training activity at a glance.
        </p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="sc-stat-card">
          <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted)" }}>Total operators</div>
          <div className="text-3xl font-bold sc-page-title mt-1">{operators.length}</div>
        </div>
        <div className="sc-stat-card">
          <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted)" }}>Sessions last 30 days</div>
          <div className="text-3xl font-bold sc-page-title mt-1">{recentSessions.length}</div>
          <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>{recentAttendance} attendances</div>
        </div>
        <div className="sc-stat-card" style={{ borderLeftColor: "var(--status-amber-text)" }}>
          <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted)" }}>Certs expiring ≤ 90 days</div>
          <div className="text-3xl font-bold mt-1" style={{ color: "var(--status-amber-text)" }}>{expiring.length}</div>
        </div>
        <div className="sc-stat-card" style={{ borderLeftColor: "var(--status-red-text)" }}>
          <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted)" }}>Expired certifications</div>
          <div className="text-3xl font-bold mt-1" style={{ color: "var(--status-red-text)" }}>{expired.length}</div>
        </div>
      </div>

      {/* Competency health per area */}
      <div>
        <h2 className="font-semibold sc-page-title text-base mb-4">Competency health by area</h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {areaStats.map((a) => (
            <div key={a.areaId} className="sc-card p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-semibold">{a.areaName}</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>{a.headcount} operators</div>
                </div>
                <span
                  className="text-lg font-bold"
                  style={{ color: a.completionPct >= 80 ? "var(--status-green-text)" : a.completionPct >= 50 ? "var(--status-amber-text)" : "var(--status-red-text)" }}
                >
                  {a.completionPct}%
                </span>
              </div>

              {/* Stacked bar */}
              <div className="flex h-3 rounded-full overflow-hidden mb-3" style={{ background: "var(--border)" }}>
                {a.total > 0 && (
                  <>
                    <div style={{ width: `${(a.green / a.total) * 100}%`, background: "var(--status-green-text)" }} />
                    <div style={{ width: `${(a.amber / a.total) * 100}%`, background: "var(--status-amber-text)" }} />
                    <div style={{ width: `${(a.red / a.total) * 100}%`, background: "var(--status-red-text)" }} />
                    <div style={{ width: `${(a.grey / a.total) * 100}%`, background: "var(--border)" }} />
                  </>
                )}
              </div>

              <div className="flex gap-3 text-xs" style={{ color: "var(--muted)" }}>
                <span className="sc-badge sc-badge-green">{a.green} at target</span>
                <span className="sc-badge sc-badge-amber">{a.amber} close</span>
                <span className="sc-badge sc-badge-red">{a.red} gap</span>
                <span className="sc-badge sc-badge-grey">{a.grey} unassessed</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Certification alerts */}
      {(expiring.length > 0 || expired.length > 0) && (
        <div>
          <h2 className="font-semibold sc-page-title text-base mb-4">Certification alerts</h2>
          <div className="sc-card overflow-x-auto">
            <table className="min-w-full sc-table">
              <thead>
                <tr>
                  <th>Operator</th>
                  <th>Domain</th>
                  <th>Expiry date</th>
                  <th>Days remaining</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {[...expired, ...expiring].map((c) => {
                  const days = c.expiryDate
                    ? Math.round((new Date(c.expiryDate).getTime() - now) / 86400000)
                    : null;
                  const isExpired = days !== null && days < 0;
                  return (
                    <tr key={c.id}>
                      <td className="font-medium">{c.operator.fullName}</td>
                      <td>{c.domain.code} — {c.domain.name}</td>
                      <td>{c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : "—"}</td>
                      <td style={{ color: isExpired ? "var(--status-red-text)" : "var(--status-amber-text)" }}>
                        {isExpired ? `${Math.abs(days!)} days ago` : `${days} days`}
                      </td>
                      <td>
                        <span className={isExpired ? "sc-badge sc-badge-red" : "sc-badge sc-badge-amber"}>
                          {isExpired ? "EXPIRED" : "EXPIRING SOON"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Training plan progress */}
      <div>
        <h2 className="font-semibold sc-page-title text-base mb-4">Training plan progress</h2>
        <div className="sc-card p-5">
          <div className="flex items-center gap-4 mb-2">
            <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${planItems.length > 0 ? Math.round((completedPlanItems / planItems.length) * 100) : 0}%`,
                  background: "var(--brand-600)",
                  transition: "width 0.4s ease",
                }}
              />
            </div>
            <span className="text-sm font-semibold sc-page-title whitespace-nowrap">
              {completedPlanItems} / {planItems.length} items completed
            </span>
          </div>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Across all training plans currently active in the system.
          </p>
        </div>
      </div>
    </div>
  );
}
