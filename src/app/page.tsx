"use client";

import {
  Box,
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
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/config";
import { NAV_ACTIONS, NAV_ICONS_LARGE, type NavAction } from "@/lib/navActions";

type Order = {
  id: number;
  clientName: string;
  date: string;
  status: string;
  category: { id: number; name: string; description: string | null } | null;
};

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

export default function HomePage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [daysFilter, setDaysFilter] = useState<7 | 15 | 30>(7);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE_URL}/orders`, { credentials: "include" })
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
    <Box sx={{ px: 3, maxWidth: 1200, mx: "auto" }}>
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
    </Box>
  );
}
