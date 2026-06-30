import { signIn } from "@/lib/auth";

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form
        action={async (formData) => {
          "use server";
          await signIn("credentials", {
            email: formData.get("email"),
            password: formData.get("password"),
            redirectTo: "/skill-matrix",
          });
        }}
        className="bg-white border rounded-lg p-8 w-full max-w-sm space-y-4"
      >
        <div>
          <h1 className="text-xl font-semibold">SCTMS</h1>
          <p className="text-sm text-gray-500">Shopfloor Competency & Training Management</p>
        </div>
        {searchParams?.error && (
          <p className="text-sm text-red-600">Invalid email or password.</p>
        )}
        <input name="email" type="email" placeholder="Email" required className="w-full border rounded px-3 py-2 text-sm" />
        <input name="password" type="password" placeholder="Password" required className="w-full border rounded px-3 py-2 text-sm" />
        <button type="submit" className="w-full bg-black text-white rounded py-2 text-sm">
          Sign in
        </button>
      </form>
    </div>
  );
}
