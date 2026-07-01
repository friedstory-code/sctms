"use client";

import { useState, useRef, useTransition } from "react";

// ---- Types passed from server ----
type User = {
  id: string; name: string; email: string;
  role: string; productionArea?: { name: string } | null;
};
type Area = { id: string; name: string };
type Settings = Record<string, string>;

export default function SettingsClient({
  users, areas, settings, currentUserId, currentUserRole,
}: {
  users: User[]; areas: Area[]; settings: Settings;
  currentUserId: string; currentUserRole: string;
}) {
  const [tab, setTab] = useState<"company" | "users" | "account">("company");
  const [logoPreview, setLogoPreview] = useState<string | null>(settings.logoUrl || null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoMsg, setLogoMsg] = useState("");
  const [companyName, setCompanyName] = useState(settings.companyName || "");
  const [companyMsg, setCompanyMsg] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [userMsg, setUserMsg] = useState("");
  const [isPending, startTransition] = useTransition();
  const logoRef = useRef<HTMLInputElement>(null);

  const isAdmin = currentUserRole === "ADMIN";

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    setLogoMsg("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", "logo");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (data.url) {
      setLogoPreview(data.url);
      setLogoMsg("Logo uploaded successfully.");
    } else {
      setLogoMsg(data.error || "Upload failed.");
    }
    setLogoUploading(false);
  }

  async function saveCompanyName() {
    const { updateSiteSetting } = await import("./actions");
    startTransition(async () => {
      await updateSiteSetting("companyName", companyName);
      setCompanyMsg("Company name saved.");
    });
  }

  async function handleCreateUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUserMsg("");
    const fd = new FormData(e.currentTarget);
    const { createUser } = await import("./actions");
    try {
      await createUser(fd);
      setUserMsg("User created successfully.");
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setUserMsg(err.message || "Failed to create user.");
    }
  }

  async function handleRoleChange(userId: string, role: string) {
    const fd = new FormData();
    fd.append("userId", userId);
    fd.append("role", role);
    const { updateUserRole } = await import("./actions");
    await updateUserRole(fd);
  }

  async function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPwMsg("");
    const fd = new FormData(e.currentTarget);
    const { changePassword } = await import("./actions");
    const result = await changePassword(null, fd);
    if (result?.error) setPwMsg(result.error);
    if (result?.success) {
      setPwMsg(result.success);
      (e.target as HTMLFormElement).reset();
    }
  }

  const TAB = "px-4 py-2 text-sm font-semibold border-b-2 transition-colors";
  const ACTIVE = `${TAB} border-[var(--brand-600)] text-[var(--brand-600)]`;
  const INACTIVE = `${TAB} border-transparent text-[var(--muted)] hover:text-[var(--foreground)]`;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sc-page-title">Settings</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Manage company branding, user accounts, and your personal password.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 border-b" style={{ borderColor: "var(--border)" }}>
        <button className={tab === "company" ? ACTIVE : INACTIVE} onClick={() => setTab("company")}>
          Company
        </button>
        {isAdmin && (
          <button className={tab === "users" ? ACTIVE : INACTIVE} onClick={() => setTab("users")}>
            User Management
          </button>
        )}
        <button className={tab === "account" ? ACTIVE : INACTIVE} onClick={() => setTab("account")}>
          My Account
        </button>
      </div>

      {/* ---- COMPANY TAB ---- */}
      {tab === "company" && (
        <div className="space-y-6">
          {/* Logo */}
          {isAdmin && (
            <div className="sc-card p-6 space-y-4">
              <h2 className="font-semibold sc-page-title text-sm">Company Logo</h2>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Shown in the navigation header. PNG, JPG, SVG, or WebP. Recommended: 200×60px or similar wide format.
              </p>
              <div className="flex items-center gap-6">
                <div
                  className="flex items-center justify-center rounded-lg border"
                  style={{ width: 200, height: 60, background: "var(--brand-700)", borderColor: "var(--border)" }}
                >
                  {logoPreview
                    ? <img src={logoPreview} alt="Logo preview" className="h-10 w-auto object-contain" />
                    : <span className="text-xs" style={{ color: "white", opacity: 0.5 }}>No logo uploaded</span>
                  }
                </div>
                <div className="space-y-2">
                  <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
                  <button
                    type="button"
                    onClick={() => logoRef.current?.click()}
                    disabled={logoUploading}
                    className="sc-btn-primary"
                  >
                    {logoUploading ? "Uploading…" : logoPreview ? "Replace logo" : "Upload logo"}
                  </button>
                  {logoMsg && (
                    <p className="text-xs" style={{ color: logoMsg.includes("success") ? "var(--status-green-text)" : "var(--status-red-text)" }}>
                      {logoMsg}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Company name */}
          {isAdmin && (
            <div className="sc-card p-6 space-y-3">
              <h2 className="font-semibold sc-page-title text-sm">Company Name</h2>
              <p className="text-xs" style={{ color: "var(--muted)" }}>Shown in the header when no logo is uploaded.</p>
              <div className="flex gap-3">
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Coninx Industries"
                  className="sc-input flex-1"
                />
                <button type="button" onClick={saveCompanyName} className="sc-btn-primary whitespace-nowrap">
                  Save
                </button>
              </div>
              {companyMsg && <p className="text-xs" style={{ color: "var(--status-green-text)" }}>{companyMsg}</p>}
            </div>
          )}

          {!isAdmin && (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Company branding settings are managed by an Admin.
            </p>
          )}
        </div>
      )}

      {/* ---- USERS TAB ---- */}
      {tab === "users" && isAdmin && (
        <div className="space-y-6">
          {/* Create user */}
          <div className="sc-card p-6">
            <h2 className="font-semibold sc-page-title text-sm mb-4">Create New User</h2>
            <form onSubmit={handleCreateUser} className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Full name</label>
                <input name="name" required placeholder="Jane Smith" className="sc-input" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Email</label>
                <input name="email" type="email" required placeholder="jane@company.com" className="sc-input" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Temporary password</label>
                <input name="password" type="password" required minLength={8} placeholder="Min 8 characters" className="sc-input" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Role</label>
                <select name="role" required className="sc-input">
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="TRAINER">Trainer</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Production area (optional — for Supervisors)</label>
                <select name="productionAreaId" className="sc-input">
                  <option value="">All areas / Not area-specific</option>
                  {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <button type="submit" className="sc-btn-primary">Create User</button>
                {userMsg && (
                  <p className="text-sm" style={{ color: userMsg.includes("success") ? "var(--status-green-text)" : "var(--status-red-text)" }}>
                    {userMsg}
                  </p>
                )}
              </div>
            </form>
          </div>

          {/* Existing users */}
          <div className="sc-card overflow-x-auto">
            <table className="min-w-full sc-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Area</th>
                  <th>Change role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="font-medium">
                      {u.name}
                      {u.id === currentUserId && <span className="sc-badge sc-badge-green ml-2">You</span>}
                    </td>
                    <td style={{ color: "var(--muted)" }}>{u.email}</td>
                    <td>
                      <span className="sc-badge sc-badge-grey">{u.role}</span>
                    </td>
                    <td style={{ color: "var(--muted)" }}>{u.productionArea?.name ?? "—"}</td>
                    <td>
                      {u.id !== currentUserId && (
                        <select
                          defaultValue={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="sc-input !w-auto text-xs py-1"
                        >
                          <option value="SUPERVISOR">Supervisor</option>
                          <option value="TRAINER">Trainer</option>
                          <option value="MANAGER">Manager</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---- MY ACCOUNT TAB ---- */}
      {tab === "account" && (
        <div className="sc-card p-6 max-w-md space-y-4">
          <h2 className="font-semibold sc-page-title text-sm">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Current password</label>
              <input name="currentPassword" type="password" required className="sc-input" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>New password</label>
              <input name="newPassword" type="password" required minLength={8} className="sc-input" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Confirm new password</label>
              <input name="confirmPassword" type="password" required minLength={8} className="sc-input" />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button type="submit" className="sc-btn-primary">Update password</button>
              {pwMsg && (
                <p className="text-sm" style={{ color: pwMsg.includes("success") ? "var(--status-green-text)" : "var(--status-red-text)" }}>
                  {pwMsg}
                </p>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
