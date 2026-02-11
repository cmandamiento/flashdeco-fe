"use client";

import { Box, Button, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Link from "next/link";
import { OrderForm } from "@/components/OrderForm";

export default function CrearPedidoPage() {
  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: "auto" }}>
      <Button
        component={Link}
        href="/"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2 }}
      >
        Volver
      </Button>

      <Typography variant="h4" component="h1" gutterBottom>
        Crear pedido
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Completa el formulario para registrar un nuevo pedido
      </Typography>

      <OrderForm
        mode="create"
        cancelHref="/"
        submitLabel="Guardar pedido"
        savingLabel="Guardando..."
        successMessage="Pedido creado correctamente."
      />
    </Box>
  );
}
