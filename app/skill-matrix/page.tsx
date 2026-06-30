import { auth } from "@/lib/auth";
import { getSkillMatrixData, getProductionAreas, addOperator, addAssessment } from "./actions";
import { prisma } from "@/lib/prisma";

const STATUS_COLORS: Record<string, string> = {
  GREEN: "bg-green-100 text-green-800 border-green-300",
  AMBER: "bg-amber-100 text-amber-800 border-amber-300",
  RED: "bg-red-100 text-red-800 border-red-300",
  GREY: "bg-gray-100 text-gray-500 border-gray-300",
};

export default async function SkillMatrixPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const canEdit = ["ADMIN", "MANAGER", "SUPERVISOR"].includes(role);

  const { matrix, domains } = await getSkillMatrixData();
  const areas = await getProductionAreas();
  const operators = await prisma.operator.findMany({ orderBy: { fullName: "asc" } });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">Skill Matrix</h1>
        <p className="text-gray-500 text-sm mt-1">
          Central competency record. L0–L4 per operator per domain, compared against role profile targets.
        </p>
      </div>

      {/* Gap analysis grid */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3 font-medium">Operator</th>
              <th className="text-left p-3 font-medium">Role Profile</th>
              <th className="text-left p-3 font-medium">Area</th>
              {domains.map((d) => (
                <th key={d.id} className="p-3 font-medium text-center">{d.code}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row) => (
              <tr key={row.operatorId} className="border-t">
                <td className="p-3 font-medium">{row.fullName}</td>
                <td className="p-3 text-gray-500">{row.roleProfile}</td>
                <td className="p-3 text-gray-500">{row.productionArea}</td>
                {row.domainResults.map((cell) => (
                  <td key={cell.domainId} className="p-2 text-center">
                    <span
                      className={`inline-flex items-center justify-center w-9 h-9 rounded border text-xs font-semibold ${STATUS_COLORS[cell.status]}`}
                      title={`Level ${cell.level} / Target ${cell.target}`}
                    >
                      L{cell.level}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
            {matrix.length === 0 && (
              <tr>
                <td colSpan={3 + domains.length} className="p-6 text-center text-gray-400">
                  No operators yet. Add one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <div className="grid md:grid-cols-2 gap-8">
          {/* Add Staff Member */}
          <form action={addOperator} className="border rounded-lg p-5 space-y-3">
            <h2 className="font-medium">Add Staff Member</h2>
            <input name="fullName" placeholder="Full name" required className="w-full border rounded px-3 py-2 text-sm" />
            <input name="employeeId" placeholder="Employee ID" required className="w-full border rounded px-3 py-2 text-sm" />
            <input name="jobTitle" placeholder="Job title" required className="w-full border rounded px-3 py-2 text-sm" />
            <select name="roleProfile" required className="w-full border rounded px-3 py-2 text-sm">
              <option value="PO_ENTRY">PO-Entry</option>
              <option value="PO">PO</option>
              <option value="SPO">SPO</option>
              <option value="LO_TL">LO/TL</option>
              <option value="TRN">TRN</option>
            </select>
            <select name="productionAreaId" required className="w-full border rounded px-3 py-2 text-sm">
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <button type="submit" className="bg-black text-white text-sm rounded px-4 py-2">
              Add Operator
            </button>
          </form>

          {/* Record Assessment */}
          <form action={addAssessment} className="border rounded-lg p-5 space-y-3">
            <h2 className="font-medium">Record Assessed Level</h2>
            <select name="operatorId" required className="w-full border rounded px-3 py-2 text-sm">
              <option value="">Select operator…</option>
              {operators.map((o) => (
                <option key={o.id} value={o.id}>{o.fullName}</option>
              ))}
            </select>
            <select name="domainId" required className="w-full border rounded px-3 py-2 text-sm">
              <option value="">Select domain…</option>
              {domains.map((d) => (
                <option key={d.id} value={d.id}>{d.code} — {d.name}</option>
              ))}
            </select>
            <select name="level" required className="w-full border rounded px-3 py-2 text-sm">
              <option value="0">L0 — Not Yet Assessed</option>
              <option value="1">L1</option>
              <option value="2">L2</option>
              <option value="3">L3</option>
              <option value="4">L4</option>
            </select>
            <input type="date" name="assessmentDate" required className="w-full border rounded px-3 py-2 text-sm" />
            <textarea name="notes" placeholder="Notes (assessor, evidence ref, etc.)" className="w-full border rounded px-3 py-2 text-sm" />
            <button type="submit" className="bg-black text-white text-sm rounded px-4 py-2">
              Save Assessment
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
