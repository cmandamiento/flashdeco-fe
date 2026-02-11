"use client";

import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
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
        const res = await fetch(`${API_BASE_URL}/orders/${id}`);
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
        <Button component={Link} href="/listar-pedidos" startIcon={<ArrowBackIcon />} sx={{ mt: 2 }}>
          Volver a pedidos
        </Button>
      </Box>
    );
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  return (
    <Box sx={{ p: 3, maxWidth: 640, mx: "auto" }}>
      <Button
        component={Link}
        href="/listar-pedidos"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2 }}
      >
        Volver a pedidos
      </Button>
      <Typography variant="h4" component="h1" gutterBottom>
        Pedido #{order.id}
      </Typography>
      <Card>
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography><strong>Cliente:</strong> {order.clientName}</Typography>
          {order.phone && <Typography><strong>Teléfono:</strong> {order.phone}</Typography>}
          <Typography><strong>Fecha:</strong> {formatDate(order.date)}</Typography>
          <Typography><strong>Dirección:</strong> {order.address}</Typography>
          {order.description && <Typography><strong>Descripción:</strong> {order.description}</Typography>}
          <Typography><strong>Precio:</strong> S/. {order.price.toFixed(2)}</Typography>
          {order.deposit != null && <Typography><strong>A cuenta:</strong> S/. {order.deposit.toFixed(2)}</Typography>}
          {order.balance != null && <Typography><strong>Pendiente:</strong> S/. {order.balance.toFixed(2)}</Typography>}
          <Typography><strong>Estado:</strong> {order.status}</Typography>
          {order.category && (
            <Typography><strong>Categoría:</strong> {order.category.name}</Typography>
          )}
          {order.reference && (
            <Box>
              <Typography><strong>Imagen referencial:</strong></Typography>
              <Box component="img" src={order.reference} alt="Referencia" sx={{ maxWidth: "100%", maxHeight: 300, mt: 1 }} />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
