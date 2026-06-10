"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/config";
import { getAuthHeaders, removeToken } from "@/lib/auth";
import { NAV_ACTIONS, NAV_ICONS_LARGE, type NavAction } from "@/lib/navActions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Order = {
  id: number;
  clientName: string;
  date: string;
  status: string;
  category: { id: number; name: string; description: string | null } | null;
};

function parseOrderDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysFromToday(orderDate: Date, today: Date): number {
  const diff = orderDate.getTime() - today.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

const DAYS_OPTIONS = [
  { value: 7, label: "7 días" },
  { value: 15, label: "15 días" },
  { value: 30, label: "30 días" },
] as const;

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const NOTIFICATION_SHOWN_KEY = "decorapp_event_notification_shown";

function showBrowserNotification(
  title: string,
  body: string,
  onClick: () => void,
): boolean {
  if (typeof window === "undefined" || !("Notification" in window))
    return false;
  if (Notification.permission !== "granted") return false;
  try {
    const n = new Notification(title, {
      body,
      icon: "/favicon.ico",
      tag: "decorapp-test",
      requireInteraction: false,
    });
    n.onclick = () => {
      n.close();
      onClick();
    };
    return true;
  } catch (err) {
    if (typeof console !== "undefined" && console.error) {
      console.error("Notification error:", err);
    }
    return false;
  }
}

export default function HomePage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [daysFilter, setDaysFilter] = useState<7 | 15 | 30>(7);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const perm = Notification.permission;
    queueMicrotask(() => setNotificationPermission(perm));
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === "granted") {
        toast.success(
          "Notificaciones activadas. Recibirás avisos de eventos próximos.",
        );
      }
    } catch {
      setNotificationPermission("denied");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE_URL}/orders`, {
      headers: getAuthHeaders(),
      credentials: "omit",
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) setOrders(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setOrders([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + daysFilter);

  const eventAlerts = useMemo(() => {
    const todayList: Order[] = [];
    const tomorrowList: Order[] = [];
    const in2DaysList: Order[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    orders.forEach((order) => {
      if (order.status !== "PENDING") return;
      const orderDate = parseOrderDate(order.date);
      const days = daysFromToday(orderDate, now);
      if (days === 0) todayList.push(order);
      else if (days === 1) tomorrowList.push(order);
      else if (days === 2) in2DaysList.push(order);
    });
    return { todayList, tomorrowList, in2DaysList };
  }, [orders]);

  const hasEventAlerts =
    eventAlerts.todayList.length > 0 ||
    eventAlerts.tomorrowList.length > 0 ||
    eventAlerts.in2DaysList.length > 0;

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !hasEventAlerts ||
      notificationPermission !== "granted"
    )
      return;
    const todayKey = new Date().toDateString();
    const shown = localStorage.getItem(NOTIFICATION_SHOWN_KEY);
    if (shown === todayKey) return;
    const parts: string[] = [];
    if (eventAlerts.todayList.length > 0)
      parts.push(`Hoy: ${eventAlerts.todayList.length} evento(s)`);
    if (eventAlerts.tomorrowList.length > 0)
      parts.push(`Mañana: ${eventAlerts.tomorrowList.length} evento(s)`);
    if (eventAlerts.in2DaysList.length > 0)
      parts.push(`En 2 días: ${eventAlerts.in2DaysList.length} evento(s)`);
    const title = "Recordatorio de eventos";
    const body = parts.join(". ");
    showBrowserNotification(title, body, () => {
      window.focus();
      router.push("/listar-pedidos");
    });
    localStorage.setItem(NOTIFICATION_SHOWN_KEY, todayKey);
  }, [
    hasEventAlerts,
    notificationPermission,
    eventAlerts.todayList.length,
    eventAlerts.tomorrowList.length,
    eventAlerts.in2DaysList.length,
    router,
  ]);

  const upcomingOrders = orders
    .filter((order) => {
      const [year, month, day] = order.date.split("-").map(Number);
      const orderDate = new Date(year, month - 1, day);
      orderDate.setHours(0, 0, 0, 0);
      return orderDate >= today && orderDate <= endDate;
    })
    .sort((a, b) => {
      const [yearA, monthA, dayA] = a.date.split("-").map(Number);
      const [yearB, monthB, dayB] = b.date.split("-").map(Number);
      const dateA = new Date(yearA, monthA - 1, dayA);
      const dateB = new Date(yearB, monthB - 1, dayB);
      return dateA.getTime() - dateB.getTime();
    });

  const handleAction = async (action: NavAction) => {
    if (action.isLogout) {
      removeToken();
      router.push("/login");
      router.refresh();
    } else {
      router.push(action.href);
    }
  };

  const supportsNotifications =
    typeof window !== "undefined" && "Notification" in window;

  return (
    <div className="mx-auto max-w-6xl px-6">
      {supportsNotifications && (
        <div className="mt-6 mb-4 space-y-3">
          {notificationPermission === "default" && (
            <Alert>
              <Bell className="size-4" />
              <AlertTitle>Notificaciones de eventos</AlertTitle>
              <AlertDescription className="flex flex-wrap items-center gap-3">
                <span>
                  Recibe avisos en tu dispositivo cuando tengas eventos próximos
                  (hoy, mañana o en 2 días).
                </span>
                <Button size="sm" variant="outline" onClick={requestNotificationPermission}>
                  <Bell className="size-4" />
                  Activar notificaciones
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {notificationPermission === "denied" && (
            <Alert variant="destructive">
              <BellOff className="size-4" />
              <AlertDescription>
                Las notificaciones están bloqueadas. Actívalas en la configuración
                del navegador para recibir avisos.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <div className="mt-6 mb-8">
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <h2 className="text-xl font-semibold">Próximos eventos</h2>
          <Select
            value={String(daysFilter)}
            onValueChange={(v) => setDaysFilter(Number(v) as 7 | 15 | 30)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="En los próximos" />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          {upcomingOrders.length === 0 ? (
            <CardContent className="py-6">
              <p className="text-muted-foreground">
                No hay eventos en los próximos {daysFilter} días
              </p>
            </CardContent>
          ) : (
            <div className="divide-y">
              {upcomingOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/pedidos/${order.id}`}
                  className="block px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <p className="font-medium">{order.clientName}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(order.date)}
                    {order.category && ` — ${order.category.name}`}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <p className="mb-6 text-muted-foreground">
        Selecciona una acción para continuar
      </p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {NAV_ACTIONS.map((action: NavAction) => (
          <Card
            key={action.title}
            className="h-full cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md"
            onClick={() => handleAction(action)}
          >
            <CardContent className="p-4">
              <div className="mb-3">{NAV_ICONS_LARGE[action.iconKey]}</div>
              <h3 className="mb-1 font-semibold">{action.title}</h3>
              <p className="text-sm text-muted-foreground">
                {action.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
