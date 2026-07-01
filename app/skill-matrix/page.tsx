import { auth } from "@/lib/auth";
import { getSkillMatrixData, getProductionAreas, addOperator, addAssessment } from "./actions";
import { prisma } from "@/lib/prisma";

const BADGE: Record<string, string> = {
  GREEN: "sc-badge sc-badge-green",
  AMBER: "sc-badge sc-badge-amber",
  RED: "sc-badge sc-badge-red",
  GREY: "sc-badge sc-badge-grey",
};

export default async function SkillMatrixPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const canEdit = ["ADMIN", "MANAGER", "SUPERVISOR"].includes(role);

  const { matrix, domains } = await getSkillMatrixData();
  const areas = await getProductionAreas();
  const operators = await prisma.operator.findMany({ orderBy: { fullName: "asc" } });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sc-page-title">Skill Matrix</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Central competency record. L0–L4 per operator per domain, compared against role profile targets.
        </p>
      </div>

      <div className="sc-card overflow-x-auto">
        <table className="min-w-full sc-table">
          <thead>
            <tr>
              <th>Operator</th>
              <th>Role Profile</th>
              <th>Area</th>
              {domains.map((d) => (
                <th key={d.id} className="text-center">{d.code}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row) => (
              <tr key={row.operatorId}>
                <td className="font-medium">{row.fullName}</td>
                <td style={{ color: "var(--muted)" }}>{row.roleProfile}</td>
                <td style={{ color: "var(--muted)" }}>{row.productionArea}</td>
                {row.domainResults.map((cell) => (
                  <td key={cell.domainId} className="text-center">
                    <span className={BADGE[cell.status]} title={`Level ${cell.level} / Target ${cell.target}`}>
                      L{cell.level}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
            {matrix.length === 0 && (
              <tr>
                <td colSpan={3 + domains.length} className="p-6 text-center" style={{ color: "var(--muted)" }}>
                  No operators yet. Add one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <div className="grid md:grid-cols-2 gap-6">
          <form action={addOperator} className="sc-card p-5 space-y-3">
            <h2 className="font-semibold sc-page-title text-sm">Add Staff Member</h2>
            <input name="fullName" placeholder="Full name" required className="sc-input" />
            <input name="employeeId" placeholder="Employee ID" required className="sc-input" />
            <input name="jobTitle" placeholder="Job title" required className="sc-input" />
            <select name="roleProfile" required className="sc-input">
              <option value="PO_ENTRY">PO-Entry</option>
              <option value="PO">PO</option>
              <option value="SPO">SPO</option>
              <option value="LO_TL">LO/TL</option>
              <option value="TRN">TRN</option>
            </select>
            <select name="productionAreaId" required className="sc-input">
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <button type="submit" className="sc-btn-primary">Add Operator</button>
          </form>

          <form action={addAssessment} className="sc-card p-5 space-y-3">
            <h2 className="font-semibold sc-page-title text-sm">Record Assessed Level</h2>
            <select name="operatorId" required className="sc-input">
              <option value="">Select operator…</option>
              {operators.map((o) => (
                <option key={o.id} value={o.id}>{o.fullName}</option>
              ))}
            </select>
            <select name="domainId" required className="sc-input">
              <option value="">Select domain…</option>
              {domains.map((d) => (
                <option key={d.id} value={d.id}>{d.code} — {d.name}</option>
              ))}
            </select>
            <select name="level" required className="sc-input">
              <option value="0">L0 — Not Yet Assessed</option>
              <option value="1">L1</option>
              <option value="2">L2</option>
              <option value="3">L3</option>
              <option value="4">L4</option>
            </select>
            <input type="date" name="assessmentDate" required className="sc-input" />
            <textarea name="notes" placeholder="Notes (assessor, evidence ref, etc.)" className="sc-input" />
            <button type="submit" className="sc-btn-primary">Save Assessment</button>
          </form>
        </div>
      )}
    </div>
  );
}
