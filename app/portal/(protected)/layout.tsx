import Link from "next/link";
import LogoutButton from "@/components/portal/LogoutButton";
import { isPortalWriteDisabled } from "@/lib/portal/mode";

export default function ProtectedPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const writesDisabled = isPortalWriteDisabled();

  return (
    <>
      <header className="border-b-2 border-black bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 md:px-8">
          <div className="flex items-center gap-6">
            <Link
              href="/portal"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-black"
            >
              World Portal
            </Link>
            <div className="hidden items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6F6F6F] md:flex">
              <Link href="/" className="hover:text-black">
                Public Site
              </Link>
              <Link href="/portal/worlds/new" className="hover:text-black">
                New World
              </Link>
              {writesDisabled ? (
                <span className="border border-[#B42318] px-2 py-1 text-[#B42318]">
                  Read-only Dev
                </span>
              ) : null}
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>
      {children}
    </>
  );
}
