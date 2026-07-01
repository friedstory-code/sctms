import { signIn } from "@/lib/auth";

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(160deg, var(--brand-900), var(--brand-700))" }}>
      <form
        action={async (formData) => {
          "use server";
          await signIn("credentials", {
            email: formData.get("email"),
            password: formData.get("password"),
            redirectTo: "/skill-matrix",
          });
        }}
        className="sc-card w-full max-w-sm p-8 space-y-4 shadow-xl"
      >
        <div>
          <h1 className="text-xl sc-page-title">SCTMS</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Shopfloor Competency &amp; Training Management
          </p>
        </div>
        {searchParams?.error && (
          <p className="text-sm" style={{ color: "var(--status-red-text)" }}>
            Invalid email or password.
          </p>
        )}
        <input name="email" type="email" placeholder="Email" required className="sc-input" />
        <input name="password" type="password" placeholder="Password" required className="sc-input" />
        <button type="submit" className="sc-btn-primary w-full">
          Sign in
        </button>
      </form>
    </div>
  );
}
