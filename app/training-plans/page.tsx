import { auth } from "@/lib/auth";
import { getTrainingPlans, createPlan, addPlanItem, updateItemStatus } from "./actions";
import { prisma } from "@/lib/prisma";

const STATUS_BADGE: Record<string, string> = {
  PLANNED: "sc-badge sc-badge-grey",
  SCHEDULED: "sc-badge sc-badge-amber",
  IN_PROGRESS: "sc-badge sc-badge-amber",
  COMPLETED: "sc-badge sc-badge-green",
  ASSESSED: "sc-badge sc-badge-green",
};

export default async function TrainingPlansPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const canEdit = ["ADMIN", "MANAGER", "SUPERVISOR", "TRAINER"].includes(role);

  const plans = await getTrainingPlans();
  const operators = await prisma.operator.findMany({ orderBy: { fullName: "asc" } });
  const programmes = await prisma.trainingProgramme.findMany({
    include: { domain: true },
    orderBy: { code: "asc" },
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sc-page-title">Training Plans</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Per-operator training plans built from the Training Matrix catalogue. Onboarding plans
          and gap-closing plans both live here.
        </p>
      </div>

      {canEdit && (
        <form action={createPlan} className="sc-card p-5 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Operator</label>
            <select name="operatorId" required className="sc-input">
              <option value="">Select operator…</option>
              {operators.map((o) => (
                <option key={o.id} value={o.id}>{o.fullName}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm pb-2">
            <input type="checkbox" name="isOnboarding" /> Onboarding plan
          </label>
          <button type="submit" className="sc-btn-primary">New Plan</button>
        </form>
      )}

      <div className="space-y-6">
        {plans.map((plan) => (
          <div key={plan.id} className="sc-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="font-semibold">{plan.operator.fullName}</span>
                <span className="text-sm ml-2" style={{ color: "var(--muted)" }}>
                  {plan.operator.productionArea.name}
                </span>
                {plan.isOnboarding && <span className="sc-badge sc-badge-amber ml-2">Onboarding</span>}
              </div>
            </div>

            <table className="min-w-full sc-table mb-3">
              <thead>
                <tr>
                  <th>Programme</th>
                  <th>Target date</th>
                  <th>Status</th>
                  {canEdit && <th>Update</th>}
                </tr>
              </thead>
              <tbody>
                {plan.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.programme.domain.code} — {item.programme.name}</td>
                    <td>{item.targetDate ? new Date(item.targetDate).toLocaleDateString() : "—"}</td>
                    <td><span className={STATUS_BADGE[item.status]}>{item.status.replace("_", " ")}</span></td>
                    {canEdit && (
                      <td>
                        <form action={updateItemStatus} className="flex gap-2">
                          <input type="hidden" name="itemId" value={item.id} />
                          <select name="status" defaultValue={item.status} className="sc-input !w-auto text-xs py-1">
                            <option value="PLANNED">Planned</option>
                            <option value="SCHEDULED">Scheduled</option>
                            <option value="IN_PROGRESS">In progress</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="ASSESSED">Assessed</option>
                          </select>
                          <button type="submit" className="sc-btn-secondary text-xs !py-1">Save</button>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
                {plan.items.length === 0 && (
                  <tr><td colSpan={4} className="text-center" style={{ color: "var(--muted)" }}>No items yet.</td></tr>
                )}
              </tbody>
            </table>

            {canEdit && (
              <form action={addPlanItem} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="trainingPlanId" value={plan.id} />
                <select name="programmeId" required className="sc-input !w-auto text-xs py-1">
                  <option value="">Add programme…</option>
                  {programmes.map((p) => (
                    <option key={p.id} value={p.id}>{p.domain.code} — {p.name}</option>
                  ))}
                </select>
                <input type="date" name="targetDate" className="sc-input !w-auto text-xs py-1" />
                <button type="submit" className="sc-btn-secondary text-xs !py-1">Add to plan</button>
              </form>
            )}
          </div>
        ))}

        {plans.length === 0 && (
          <p className="text-center py-10" style={{ color: "var(--muted)" }}>No training plans yet.</p>
        )}
      </div>
    </div>
  );
}
