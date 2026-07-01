import { auth } from "@/lib/auth";
import { getCertifications, addCertification } from "./actions";
import { prisma } from "@/lib/prisma";

const STATUS_BADGE: Record<string, string> = {
  CURRENT: "sc-badge sc-badge-green",
  EXPIRING_SOON: "sc-badge sc-badge-amber",
  EXPIRED: "sc-badge sc-badge-red",
  RECERT_REQUIRED: "sc-badge sc-badge-red",
};

function liveStatus(expiryDate: Date | null) {
  if (!expiryDate) return "CURRENT";
  const days = (new Date(expiryDate).getTime() - Date.now()) / 86400000;
  if (days < 0) return "EXPIRED";
  if (days <= 90) return "EXPIRING_SOON";
  return "CURRENT";
}

export default async function CertificationPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const canEdit = ["ADMIN", "MANAGER", "SUPERVISOR"].includes(role);

  const certs = await getCertifications();
  const operators = await prisma.operator.findMany({ orderBy: { fullName: "asc" } });
  const domains = await prisma.domain.findMany({ orderBy: { code: "asc" } });

  const expiringSoon = certs.filter((c) => liveStatus(c.expiryDate) === "EXPIRING_SOON").length;
  const expired = certs.filter((c) => liveStatus(c.expiryDate) === "EXPIRED").length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sc-page-title">Certification &amp; Compliance</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Confirmed certifications with expiry tracking. Amber at 90 days out, red once expired.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="sc-stat-card">
          <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted)" }}>Total certifications</div>
          <div className="text-2xl font-bold sc-page-title mt-1">{certs.length}</div>
        </div>
        <div className="sc-stat-card" style={{ borderLeftColor: "var(--status-amber-text)" }}>
          <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted)" }}>Expiring within 90 days</div>
          <div className="text-2xl font-bold mt-1" style={{ color: "var(--status-amber-text)" }}>{expiringSoon}</div>
        </div>
        <div className="sc-stat-card" style={{ borderLeftColor: "var(--status-red-text)" }}>
          <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted)" }}>Expired</div>
          <div className="text-2xl font-bold mt-1" style={{ color: "var(--status-red-text)" }}>{expired}</div>
        </div>
      </div>

      <div className="sc-card overflow-x-auto">
        <table className="min-w-full sc-table">
          <thead>
            <tr>
              <th>Operator</th>
              <th>Domain</th>
              <th>Level</th>
              <th>Assessed</th>
              <th>Assessor</th>
              <th>Expiry</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {certs.map((c) => (
              <tr key={c.id}>
                <td className="font-medium">{c.operator.fullName}</td>
                <td>{c.domain.code} — {c.domain.name}</td>
                <td>L{c.levelConfirmed}</td>
                <td>{new Date(c.assessmentDate).toLocaleDateString()}</td>
                <td>{c.assessorName}</td>
                <td>{c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : "No expiry"}</td>
                <td><span className={STATUS_BADGE[liveStatus(c.expiryDate)]}>{liveStatus(c.expiryDate).replace("_", " ")}</span></td>
              </tr>
            ))}
            {certs.length === 0 && (
              <tr><td colSpan={7} className="text-center p-6" style={{ color: "var(--muted)" }}>No certifications recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <form action={addCertification} className="sc-card p-5 space-y-3 max-w-xl">
          <h2 className="font-semibold sc-page-title text-sm">Add Certification</h2>
          <select name="operatorId" required className="sc-input">
            <option value="">Select operator…</option>
            {operators.map((o) => <option key={o.id} value={o.id}>{o.fullName}</option>)}
          </select>
          <select name="domainId" required className="sc-input">
            <option value="">Select domain…</option>
            {domains.map((d) => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
          </select>
          <select name="levelConfirmed" required className="sc-input">
            {[0, 1, 2, 3, 4].map((l) => <option key={l} value={l}>L{l}</option>)}
          </select>
          <input type="date" name="assessmentDate" required className="sc-input" placeholder="Assessment date" />
          <input name="assessorName" placeholder="Assessor name" required className="sc-input" />
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>
              Expiry date (leave blank if non-expiring)
            </label>
            <input type="date" name="expiryDate" className="sc-input" />
          </div>
          <button type="submit" className="sc-btn-primary">Save Certification</button>
        </form>
      )}
    </div>
  );
}
