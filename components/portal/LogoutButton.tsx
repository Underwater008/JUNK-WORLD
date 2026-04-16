"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton({
  redirectPath = "/portal/login",
  label = "Logout",
  className = "",
}: {
  redirectPath?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/portal/logout", { method: "POST" });
    router.replace(redirectPath);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={`border border-black px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-black transition hover:bg-black hover:text-white ${className}`}
    >
      {label}
    </button>
  );
}
