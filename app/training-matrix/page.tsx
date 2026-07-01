import { auth } from "@/lib/auth";
import { getTrainingProgrammes, updateProgramme } from "./actions";

export default async function TrainingMatrixPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const canEdit = ["ADMIN", "MANAGER"].includes(role);

  const programmes = await getTrainingProgrammes();

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sc-page-title">Training Matrix</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Defines, per production area and domain, how training is delivered: method, target level
          range, and refresh cadence. This is the catalogue Training Plans draw from.
        </p>
      </div>

      <div className="sc-card overflow-x-auto">
        <table className="min-w-full sc-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Area</th>
              <th>Domain</th>
              <th>Delivery</th>
              <th>Level range</th>
              <th>Refresh</th>
              {canEdit && <th>Update</th>}
            </tr>
          </thead>
          <tbody>
            {programmes.map((p) => (
              <tr key={p.id}>
                <td className="font-mono text-xs">{p.code}</td>
                <td>{p.productionArea.name}</td>
                <td>{p.domain.code} — {p.domain.name}</td>
                <td>{p.deliveryMethod}</td>
                <td>L{p.levelFrom} → L{p.levelTo}</td>
                <td>{p.refreshFrequency}</td>
                {canEdit && (
                  <td>
                    <form action={updateProgramme} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="programmeId" value={p.id} />
                      <select name="deliveryMethod" defaultValue={p.deliveryMethod} className="sc-input !w-auto text-xs py-1">
                        <option value="CLASSROOM">Classroom</option>
                        <option value="WORKSHOP">Workshop</option>
                        <option value="OJT">OJT</option>
                      </select>
                      <select name="levelFrom" defaultValue={p.levelFrom} className="sc-input !w-16 text-xs py-1">
                        {[0, 1, 2, 3, 4].map((l) => <option key={l} value={l}>L{l}</option>)}
                      </select>
                      <select name="levelTo" defaultValue={p.levelTo} className="sc-input !w-16 text-xs py-1">
                        {[0, 1, 2, 3, 4].map((l) => <option key={l} value={l}>L{l}</option>)}
                      </select>
                      <select name="refreshFrequency" defaultValue={p.refreshFrequency} className="sc-input !w-auto text-xs py-1">
                        <option value="NONE">None</option>
                        <option value="ANNUAL">Annual</option>
                        <option value="BIENNIAL">Biennial</option>
                        <option value="TRIENNIAL">Triennial</option>
                      </select>
                      <button type="submit" className="sc-btn-secondary text-xs !py-1">Save</button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
