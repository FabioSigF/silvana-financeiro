"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Skip auth check for login page and recovery
    if (pathname === "/login" || pathname === "/recuperar-senha") {
      setAuthorized(true);
      return;
    }

    const isLoggedIn = sessionStorage.getItem("silvana_logged_in") === "true";
    if (!isLoggedIn) {
      setAuthorized(false);
      router.push("/login");
    } else {
      setAuthorized(true);
    }
  }, [pathname, router]);

  if (!authorized && pathname !== "/login" && pathname !== "/recuperar-senha") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 font-medium">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
