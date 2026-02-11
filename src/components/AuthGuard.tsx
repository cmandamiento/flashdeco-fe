"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/config";

const LOGIN_PATH = "/login";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    fetch(`${API_BASE_URL}/auth/me`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then((res) => {
        if (pathname === LOGIN_PATH) {
          if (res.ok) {
            const from = searchParams.get("from") || "/";
            router.replace(from);
          }
        } else {
          if (!res.ok) {
            const loginUrl = new URL(LOGIN_PATH, window.location.origin);
            loginUrl.searchParams.set("from", pathname);
            router.replace(loginUrl.toString());
          }
        }
      })
      .catch(() => {
        if (pathname !== LOGIN_PATH) {
          const loginUrl = new URL(LOGIN_PATH, window.location.origin);
          loginUrl.searchParams.set("from", pathname);
          router.replace(loginUrl.toString());
        }
      })
      .finally(() => {
        clearTimeout(timeout);
        setChecked(true);
      });
  }, [pathname, router, searchParams]);

  // En /login mostramos el formulario de inmediato (no esperamos el fetch)
  if (pathname === LOGIN_PATH) {
    return <>{children}</>;
  }

  if (!checked) {
    return null;
  }

  return <>{children}</>;
}
