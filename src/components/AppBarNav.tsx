"use client";

import MenuIcon from "@mui/icons-material/Menu";
import {
  AppBar as MuiAppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
} from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { API_BASE_URL } from "@/lib/config";
import { NAV_ACTIONS, NAV_ICONS, type NavAction } from "@/lib/navActions";

export function AppBarNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleAction = async (action: NavAction) => {
    setDrawerOpen(false);
    if (action.isLogout) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      router.push("/login");
      router.refresh();
    } else {
      router.push(action.href);
    }
  };

  return (
    <>
      <MuiAppBar position="static" sx={{ bgcolor: "#ff879c" }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setDrawerOpen(true)}
            sx={{ mr: 2 }}
            aria-label="abrir menú"
          >
            <MenuIcon />
          </IconButton>
          <Link href="/" style={{ display: "flex", alignItems: "center" }}>
            <Image
              src="/logo-flash.png"
              alt="FlashDeco"
              width={140}
              height={56}
              style={{ height: 40, width: "auto" }}
              priority
            />
          </Link>
        </Toolbar>
      </MuiAppBar>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { minWidth: 280 } }}
      >
        <Box sx={{ overflow: "auto", pt: 2 }}>
          <List>
            {NAV_ACTIONS.map((action: NavAction) => (
              <ListItemButton
                key={action.title}
                onClick={() => handleAction(action)}
                selected={pathname === action.href && !action.isLogout}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {NAV_ICONS[action.iconKey]}
                </ListItemIcon>
                <ListItemText
                  primary={action.title}
                  secondary={action.description}
                />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  );
}
