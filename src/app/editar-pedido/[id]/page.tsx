"use client";

import { Box, Button, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OrderForm, type OrderFormInitialValues } from "@/components/OrderForm";
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
  category: { id: number; name: string } | null;
  category_id: number | null;
};

function orderToInitialValues(order: Order): OrderFormInitialValues {
  return {
    clientName: order.clientName,
    phone: order.phone ?? "",
    date: order.date,
    address: order.address,
    description: order.description ?? "",
    quote: String(order.price),
    deposit: order.deposit != null ? String(order.deposit) : "",
    categoryId: order.category_id != null ? String(order.category_id) : "",
    referenceUrl: order.reference,
    registerPastEvent: false,
    status: order.status,
  };
}

export default function EditarPedidoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;
  const orderId = id ? parseInt(id, 10) : NaN;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id || !Number.isInteger(orderId)) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/orders/${orderId}`);
        if (!res.ok) throw new Error("Pedido no encontrado");
        const data = await res.json();
        if (!cancelled) setOrder(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error al cargar");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, orderId]);

  if (loading) {
    return (
      <Box sx={{ p: 3, maxWidth: 800, mx: "auto" }}>
        <Typography color="text.secondary">Cargando pedido...</Typography>
      </Box>
    );
  }

  if (error || !order) {
    return (
      <Box sx={{ p: 3, maxWidth: 800, mx: "auto" }}>
        <Typography color="error">{error || "Pedido no encontrado"}</Typography>
        <Button component={Link} href="/listar-pedidos" sx={{ mt: 2 }}>
          Volver a listar pedidos
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: "auto" }}>
      <Button
        component={Link}
        href="/listar-pedidos"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2 }}
      >
        Volver
      </Button>

      <Typography variant="h4" component="h1" gutterBottom>
        Editar pedido
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Modifica los datos del pedido
      </Typography>

      <OrderForm
        mode="edit"
        orderId={order.id}
        initialValues={orderToInitialValues(order)}
        cancelHref="/listar-pedidos"
        submitLabel="Actualizar pedido"
        savingLabel="Actualizando..."
        successMessage="Pedido actualizado correctamente."
        onSuccess={() => router.push("/listar-pedidos")}
      />
    </Box>
  );
}
