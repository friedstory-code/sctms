import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  // Load branding settings
  const [logoSetting, nameSetting] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { key: "logoUrl" } }).catch(() => null),
    prisma.siteSetting.findUnique({ where: { key: "companyName" } }).catch(() => null),
  ]);

  const logoUrl = logoSetting?.value;
  const companyName = nameSetting?.value || "SCTMS";

  return (
    <nav style={{ background: "var(--brand-700)" }} className="px-4 py-0 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-1 overflow-x-auto">
        {/* Logo / company name */}
        <Link href="/skill-matrix" className="flex items-center pr-4 py-2 shrink-0">
          {logoUrl
            ? <img src={logoUrl} alt={companyName} className="h-9 w-auto object-contain" />
            : <span className="font-bold text-white text-base tracking-tight">{companyName}</span>
          }
        </Link>

        {/* Module links */}
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

      {/* Right side: Settings + user info + sign out */}
      <div className="flex items-center gap-1 pl-4 shrink-0">
        <Link href="/settings" className="text-sm text-blue-100 hover:text-white hover:bg-white/10 px-3 py-4 transition-colors whitespace-nowrap">
          ⚙ Settings
        </Link>
        <div className="text-sm text-blue-100 px-3 py-4 whitespace-nowrap">
          {session.user.name}
          <span className="text-blue-300"> · {(session.user as any).role}</span>
        </div>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
          <button className="text-sm text-blue-200 hover:text-white px-3 py-4 underline underline-offset-2">
            Sign out
          </button>
        </form>
      </div>
    </nav>
  );
}
