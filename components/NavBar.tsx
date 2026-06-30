import { auth, signOut } from "@/lib/auth";
import Link from "next/link";

const LINKS = [
  { href: "/skill-matrix", label: "Skill Matrix" },
  { href: "/training-matrix", label: "Training Matrix" },
  { href: "/training-plans", label: "Training Plans" },
  { href: "/certification", label: "Certification" },
  { href: "/training-calendar", label: "Training Calendar" },
  { href: "/progress-monitoring", label: "Progress Monitoring" },
  { href: "/executive-dashboard", label: "Executive Dashboard" },
];

export default async function NavBar() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <nav className="border-b bg-white px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6 overflow-x-auto">
        <span className="font-semibold whitespace-nowrap">SCTMS</span>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="text-sm text-gray-600 hover:text-black whitespace-nowrap">
            {l.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-3 text-sm text-gray-500 whitespace-nowrap">
        <span>{session.user.name} · {(session.user as any).role}</span>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
          <button className="underline">Sign out</button>
        </form>
      </div>
    </nav>
  );
}
