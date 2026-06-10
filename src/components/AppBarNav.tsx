"use client";

import { Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { removeToken } from "@/lib/auth";
import { NAV_ACTIONS, NAV_ICONS, type NavAction } from "@/lib/navActions";
import { cn } from "@/lib/utils";

export function AppBarNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleAction = async (action: NavAction) => {
    setSheetOpen(false);
    if (action.isLogout) {
      removeToken();
      router.push("/login");
      router.refresh();
    } else {
      router.push(action.href);
    }
  };

  return (
    <>
      <header className="bg-[#ff879c] text-white shadow-sm">
        <div className="flex h-14 items-center px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSheetOpen(true)}
            className="mr-2 text-white hover:bg-white/20 hover:text-white"
            aria-label="abrir menú"
          >
            <Menu className="size-5" />
          </Button>
          <Link href="/" className="flex items-center">
            <Image
              src="/logo-flash.png"
              alt="FlashDeco"
              width={140}
              height={56}
              style={{ height: 40, width: "auto" }}
              priority
            />
          </Link>
        </div>
      </header>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="min-w-[280px] w-[280px] p-0">
          <SheetHeader className="border-b px-4 py-4">
            <SheetTitle>Menú</SheetTitle>
          </SheetHeader>
          <nav className="overflow-auto py-2">
            <ul className="flex flex-col">
              {NAV_ACTIONS.map((action: NavAction) => {
                const selected =
                  pathname === action.href && !action.isLogout;
                return (
                  <li key={action.title}>
                    <button
                      type="button"
                      onClick={() => handleAction(action)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent",
                        selected && "bg-accent",
                      )}
                    >
                      <span className="mt-0.5 shrink-0 text-primary">
                        {NAV_ICONS[action.iconKey]}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">
                          {action.title}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {action.description}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
