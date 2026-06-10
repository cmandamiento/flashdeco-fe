"use client";

import { usePathname } from "next/navigation";
import { AppBarNav } from "./AppBarNav";
import { Toaster } from "@/components/ui/sonner";
import { PUBLIC_PATHS } from "@/lib/config";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showAppBar = !PUBLIC_PATHS.includes(pathname);

  return (
    <div className="flex min-h-screen flex-col">
      {showAppBar && <AppBarNav />}
      <main className="flex-1">{children}</main>
      <footer className="mt-10 border-t bg-background px-4 py-4">
        <p className="m-0 text-center text-sm text-muted-foreground">
          {`Made with love <3. CR7`}
        </p>
      </footer>
      <Toaster position="bottom-center" />
    </div>
  );
}
