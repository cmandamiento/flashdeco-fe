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
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import CategoryIcon from "@mui/icons-material/Category";
import ListIcon from "@mui/icons-material/List";
import LogoutIcon from "@mui/icons-material/Logout";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/config";

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

const actions = [
  {
    title: "Crear pedido",
    description: "Registra un nuevo pedido en el sistema",
    icon: <AddShoppingCartIcon sx={{ fontSize: 48, color: "primary.main" }} />,
    href: "/crear-pedido",
  },
  {
    title: "Listar pedidos",
    description: "Consulta el listado de pedidos existentes",
    icon: <ListIcon sx={{ fontSize: 48, color: "primary.main" }} />,
    href: "/listar-pedidos",
  },
  {
    title: "Gestión de categorías",
    description: "Administra las categorías del sistema",
    icon: <CategoryIcon sx={{ fontSize: 48, color: "primary.main" }} />,
    href: "/gestion-categorias",
  },
  {
    title: "Cerrar sesión",
    description: "Salir de la aplicación",
    icon: <LogoutIcon sx={{ fontSize: 48, color: "primary.main" }} />,
    href: "/logout",
    isLogout: true,
  },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-PE", {
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
      const orderDate = new Date(order.date);
      orderDate.setHours(0, 0, 0, 0);
      return orderDate >= today && orderDate <= endDate;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handleAction = async (action: (typeof actions)[0]) => {
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
    <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Bienvenido a
        </Typography>
        <Image
          src="/logo-flash.png"
          alt="FlashDeco"
          width={180}
          height={72}
          priority
        />
      </Box>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Selecciona una acción para continuar
      </Typography>

      <Grid container spacing={3}>
        {actions.map((action) => (
          <Grid item xs={12} sm={6} md={3} key={action.title}>
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
                  <Box sx={{ mb: 2 }}>{action.icon}</Box>
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

      <Box sx={{ mt: 5 }}>
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
    </Box>
  );
}
