"use client";

import { Box, Typography } from "@mui/material";
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
      <Box
        component="footer"
        sx={{
          mt: "40px",
          py: 2,
          px: 2,
          borderTop: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          component="p"
          sx={{ m: 0 }}
        >
          {`Made with love <3. CR7`}
        </Typography>
      </Box>
    </Box>
  );
}
