"use client";

import { Box } from "@mui/material";
import { usePathname } from "next/navigation";
import { AppBarNav } from "./AppBarNav";
import { PUBLIC_PATHS } from "@/lib/config";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showAppBar = !PUBLIC_PATHS.includes(pathname);

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {showAppBar && <AppBarNav />}
      <Box component="main" sx={{ flex: 1 }}>
        {children}
      </Box>
    </Box>
  );
}
