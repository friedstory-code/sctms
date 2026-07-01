import { auth, signOut } from "@/lib/auth";
import Link from "next/link";

const LINKS = [
  { href: "/skill-matrix", label: "Skill Matrix" },
  { href: "/training-matrix", label: "Training Matrix" },
  { href: "/training-plans", label: "Training Plans" },
  { href: "/certification", label: "Certification" },
  { href: "/training-calendar", label: "Calendar" },
  { href: "/progress-monitoring", label: "Progress" },
  { href: "/executive-dashboard", label: "Dashboard" },
];

export default async function NavBar() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <nav style={{ background: "var(--brand-700)" }} className="px-6 py-0 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-1 overflow-x-auto">
        <span className="font-bold text-white text-base whitespace-nowrap pr-6 py-4 tracking-tight">
          SCTMS
        </span>
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-sm text-blue-100 hover:text-white hover:bg-white/10 whitespace-nowrap px-3 py-4 transition-colors"
          >
            {l.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-3 text-sm text-blue-100 whitespace-nowrap pl-4">
        <span>{session.user.name} <span className="text-blue-300">· {(session.user as any).role}</span></span>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
          <button className="text-blue-200 hover:text-white underline underline-offset-2">Sign out</button>
        </form>
      </div>
    </nav>
  );
}
