"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Header, Sidebar } from "@/components/layout";
import { useAuth } from "@/components/providers/AuthProvider";

const SIDEBAR_ROUTES = ["/dashboard"];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#07111f]">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const showSidebar = SIDEBAR_ROUTES.some((r) => pathname === r || pathname?.startsWith(r + "/"));

  return (
    <div className="h-screen max-h-screen flex flex-col overflow-hidden">
      <Header user={user} />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {showSidebar && <Sidebar />}
        <main className="flex-1 flex min-h-0 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
