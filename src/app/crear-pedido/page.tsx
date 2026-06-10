"use client";

import { PageHeader } from "@/components/PageHeader";
import { OrderForm } from "@/components/OrderForm";

export default function CrearPedidoPage() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <PageHeader
        title="Crear pedido"
        description="Completa el formulario para registrar un nuevo pedido"
        backHref="/"
        backLabel="Volver"
      />

      <OrderForm
        mode="create"
        cancelHref="/"
        submitLabel="Guardar pedido"
        savingLabel="Guardando..."
        successMessage="Pedido creado correctamente."
      />
    </div>
  );
}
