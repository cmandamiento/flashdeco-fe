"use client";

import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
  Snackbar,
  Typography,
} from "@mui/material";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/config";
import { getAuthHeaders, removeToken } from "@/lib/auth";
import { NAV_ACTIONS, NAV_ICONS_LARGE, type NavAction } from "@/lib/navActions";

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
  // Parsear fecha YYYY-MM-DD como fecha local (no UTC)
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
    const n = new Notification(title, { body });
    n.onclick = () => {
      n.close();
      onClick();
    };
    return true;
  } catch {
    return false;
  }
}

export default function HomePage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [daysFilter, setDaysFilter] = useState<7 | 15 | 30>(7);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission | null>(null);
  const [notificationSnackbar, setNotificationSnackbar] = useState(false);
  const [testNotificationSnackbar, setTestNotificationSnackbar] = useState<
    string | null
  >(null);

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
      if (perm === "granted") setNotificationSnackbar(true);
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
      // Parsear fecha YYYY-MM-DD como fecha local
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
    <Box sx={{ px: 3, maxWidth: 1200, mx: "auto" }}>
      {supportsNotifications && (
        <Box sx={{ mt: 3, mb: 2 }}>
          {notificationPermission === "default" && (
            <Alert
              severity="info"
              action={
                <Button
                  color="inherit"
                  size="small"
                  startIcon={<NotificationsActiveIcon />}
                  onClick={requestNotificationPermission}
                >
                  Activar notificaciones
                </Button>
              }
            >
              Recibe avisos en tu dispositivo cuando tengas eventos próximos
              (hoy, mañana o en 2 días).
            </Alert>
          )}
          {notificationPermission === "granted" && (
            <Alert
              severity="success"
              icon={<NotificationsActiveIcon />}
              action={
                <Button
                  type="button"
                  color="inherit"
                  size="small"
                  onClick={() => {
                    setTestNotificationSnackbar(
                      "Notificación en 2 segundos. Cambia de pestaña o minimiza para verla.",
                    );
                    setTimeout(() => {
                      const ok = showBrowserNotification(
                        "Prueba de notificaciones",
                        "Si ves este mensaje, las notificaciones están funcionando correctamente.",
                        () => router.push("/listar-pedidos"),
                      );
                      setTestNotificationSnackbar(
                        ok
                          ? "Notificación enviada. Revisa la bandeja del sistema."
                          : "No se pudo enviar. Revisa el permiso del navegador.",
                      );
                    }, 2000);
                  }}
                >
                  Probar notificación
                </Button>
              }
            >
              Notificaciones activadas. Te avisaremos de eventos próximos.
            </Alert>
          )}
          {notificationPermission === "denied" && (
            <Alert severity="warning" icon={<NotificationsOffIcon />}>
              Las notificaciones están bloqueadas. Actívalas en la configuración
              del navegador para recibir avisos.
            </Alert>
          )}
        </Box>
      )}

      <Box sx={{ mt: 3, mb: 5 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
            mb: 2,
          }}
        >
          <Typography variant="h5" component="h2">
            Próximos eventos
          </Typography>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="days-filter-label">En los próximos</InputLabel>
            <Select
              labelId="days-filter-label"
              value={daysFilter}
              label="En los próximos"
              onChange={(e) =>
                setDaysFilter(Number(e.target.value) as 7 | 15 | 30)
              }
            >
              {DAYS_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Card>
          {upcomingOrders.length === 0 ? (
            <CardContent>
              <Typography color="text.secondary">
                No hay eventos en los próximos {daysFilter} días
              </Typography>
            </CardContent>
          ) : (
            <List disablePadding>
              {upcomingOrders.map((order) => (
                <ListItemButton
                  key={order.id}
                  component={Link}
                  href={`/pedidos/${order.id}`}
                >
                  <ListItemText
                    primary={order.clientName}
                    secondary={
                      <>
                        {formatDate(order.date)}
                        {order.category && (
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.secondary"
                            sx={{ ml: 1 }}
                          >
                            — {order.category.name}
                          </Typography>
                        )}
                      </>
                    }
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </Card>
      </Box>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Selecciona una acción para continuar
      </Typography>
      <Grid container spacing={3}>
        {NAV_ACTIONS.map((action: NavAction) => (
          <Grid item xs={6} sm={6} md={3} key={action.title}>
            <Card
              sx={{
                height: "100%",
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 4,
                },
              }}
            >
              <CardActionArea
                onClick={() => handleAction(action)}
                sx={{ height: "100%", p: 2 }}
              >
                <CardContent>
                  <Box sx={{ mb: 2 }}>{NAV_ICONS_LARGE[action.iconKey]}</Box>
                  <Typography variant="h6" component="h2" gutterBottom>
                    {action.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {action.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Snackbar
        open={notificationSnackbar}
        autoHideDuration={4000}
        onClose={() => setNotificationSnackbar(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        message="Notificaciones activadas. Recibirás avisos de eventos próximos."
      />
      <Snackbar
        open={!!testNotificationSnackbar}
        autoHideDuration={5000}
        onClose={() => setTestNotificationSnackbar(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        message={testNotificationSnackbar}
      />
    </Box>
  );
}
