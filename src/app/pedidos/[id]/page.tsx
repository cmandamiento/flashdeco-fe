"use client";

import {
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import CategoryIcon from "@mui/icons-material/Category";
import ImageIcon from "@mui/icons-material/Image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/config";

type Order = {
  id: number;
  clientName: string;
  phone: string | null;
  date: string;
  address: string;
  description: string | null;
  price: number;
  deposit: number | null;
  balance: number | null;
  status: string;
  reference: string | null;
  result: string | null;
  category: { id: number; name: string; description: string | null } | null;
};

export default function VerPedidoPage() {
  const params = useParams();
  const id = params?.id;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/orders/${id}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Pedido no encontrado");
        const data = await res.json();
        if (!cancelled) setOrder(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <Box sx={{ p: 3 }}>Cargando...</Box>;
  if (error || !order) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error || "Pedido no encontrado"}</Typography>
        <Button
          component={Link}
          href="/listar-pedidos"
          startIcon={<ArrowBackIcon />}
          sx={{ mt: 2 }}
        >
          Volver a pedidos
        </Button>
      </Box>
    );
  }

  const formatDate = (dateStr: string) => {
    // Parsear fecha YYYY-MM-DD como fecha local (no UTC)
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("es-PE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "warning";
      case "COMPLETE":
        return "success";
      case "CANCELLED":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING":
        return "Pendiente";
      case "COMPLETE":
        return "Completado";
      case "CANCELLED":
        return "Cancelado";
      default:
        return status;
    }
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const whatsappUrl = `https://wa.me/${cleanPhone}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 800, mx: "auto" }}>
      <Button
        component={Link}
        href="/listar-pedidos"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 3 }}
      >
        Volver a pedidos
      </Button>

      <Paper
        elevation={3}
        sx={{
          p: { xs: 3, sm: 4 },
          borderRadius: 2,
          bgcolor: "background.paper",
        }}
      >
        {/* Header del recibo */}
        <Box
          sx={{
            textAlign: "center",
            mb: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <Typography variant="h4" component="h1" fontWeight="bold">
            Recibo N° {order.id}
          </Typography>
          <Chip
            label={getStatusLabel(order.status)}
            color={
              getStatusColor(order.status) as
                | "warning"
                | "success"
                | "error"
                | "default"
            }
            size="medium"
            sx={{ fontWeight: "bold" }}
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Información del cliente */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <Stack spacing={2}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <PersonIcon color="primary" />
                <Typography variant="subtitle2" color="text.secondary">
                  Cliente
                </Typography>
              </Box>
              <Typography variant="h6" fontWeight="medium">
                {order.clientName}
              </Typography>
            </Stack>
          </Grid>

          {order.phone && (
            <Grid item xs={12} sm={6}>
              <Stack spacing={2}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <PhoneIcon color="primary" />
                  <Typography variant="subtitle2" color="text.secondary">
                    Teléfono
                  </Typography>
                </Box>
                <Typography
                  variant="h6"
                  fontWeight="medium"
                  onClick={() => openWhatsApp(order.phone!)}
                  sx={{
                    cursor: "pointer",
                    color: "primary.main",
                    "&:hover": {
                      textDecoration: "underline",
                    },
                  }}
                >
                  {order.phone}
                </Typography>
              </Stack>
            </Grid>
          )}

          <Grid item xs={12} sm={6}>
            <Stack spacing={2}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CalendarTodayIcon color="primary" />
                <Typography variant="subtitle2" color="text.secondary">
                  Fecha del evento
                </Typography>
              </Box>
              <Typography variant="h6" fontWeight="medium">
                {formatDate(order.date)}
              </Typography>
            </Stack>
          </Grid>

          {order.category && (
            <Grid item xs={12} sm={6}>
              <Stack spacing={2}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CategoryIcon color="primary" />
                  <Typography variant="subtitle2" color="text.secondary">
                    Categoría
                  </Typography>
                </Box>
                <Typography variant="h6" fontWeight="medium">
                  {order.category.name}
                </Typography>
              </Stack>
            </Grid>
          )}

          <Grid item xs={12}>
            <Stack spacing={2}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <LocationOnIcon color="primary" />
                <Typography variant="subtitle2" color="text.secondary">
                  Dirección
                </Typography>
              </Box>
              <Typography variant="body1" fontWeight="medium">
                {order.address}
              </Typography>
            </Stack>
          </Grid>

          {order.description && (
            <Grid item xs={12}>
              <Stack spacing={2}>
                <Typography variant="subtitle2" color="text.secondary">
                  Descripción
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                  {order.description}
                </Typography>
              </Stack>
            </Grid>
          )}
        </Grid>

        {/* Imagen referencial */}
        {order.reference && (
          <>
            <Divider sx={{ my: 3 }} />
            <Box>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
              >
                <ImageIcon color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  Imagen referencial
                </Typography>
              </Box>
              <Box
                component="img"
                src={order.reference}
                alt="Referencia"
                sx={{
                  width: "100%",
                  maxHeight: 500,
                  objectFit: "contain",
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              />
            </Box>
          </>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Información financiera */}
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="h6"
            fontWeight="bold"
            gutterBottom
            sx={{ mb: 2 }}
          >
            Detalle de pago
          </Typography>
          <Stack spacing={2}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                py: 1,
              }}
            >
              <Typography variant="body1" color="text.secondary">
                Cotización:
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                S/. {order.price.toFixed(2)}
              </Typography>
            </Box>

            {order.deposit != null && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  py: 1,
                }}
              >
                <Typography variant="body1" color="text.secondary">
                  A cuenta:
                </Typography>
                <Typography
                  variant="body1"
                  fontWeight="medium"
                  color="success.main"
                >
                  S/. {order.deposit.toFixed(2)}
                </Typography>
              </Box>
            )}

            {order.balance != null && (
              <>
                <Divider />
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    py: 1.5,
                    px: 2,
                    bgcolor: "action.hover",
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="h6" fontWeight="bold">
                    Pendiente:
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="primary">
                    S/. {order.balance.toFixed(2)}
                  </Typography>
                </Box>
              </>
            )}
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
