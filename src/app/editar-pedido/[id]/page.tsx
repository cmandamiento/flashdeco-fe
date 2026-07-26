"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { OrderForm, type OrderFormInitialValues } from "@/components/OrderForm";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/config";
import { getAuthHeaders } from "@/lib/auth";
import { parseOrderImageList } from "@/lib/orderImages";
import { parseOrderExpenses } from "@/lib/orderExpenses";

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
  reference: string | string[] | null;
  result: string | string[] | null;
  observations: string | null;
  expenses?: { concept: string; price: number }[];
  category: { id: number; name: string } | null;
  category_id: number | null;
  client_dni?: string | null;
};

function orderToInitialValues(order: Order): OrderFormInitialValues {
  return {
    dni: order.client_dni ?? "",
    clientName: order.clientName,
    phone: order.phone ?? "",
    date: order.date,
    address: order.address,
    description: order.description ?? "",
    quote: String(order.price),
    deposit: order.deposit != null ? String(order.deposit) : "",
    categoryId: order.category_id != null ? String(order.category_id) : "",
    referenceUrls: parseOrderImageList(order.reference),
    resultUrls: parseOrderImageList(order.result),
    observations: order.observations ?? "",
    registerPastEvent: false,
    status: order.status,
    expenses: parseOrderExpenses(order.expenses),
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
        const res = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
          headers: getAuthHeaders(),
          credentials: "omit",
        });
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
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-muted-foreground">Cargando pedido...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-destructive">{error || "Pedido no encontrado"}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/listar-pedidos">Volver a listar pedidos</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <PageHeader
        title="Editar pedido"
        description="Modifica los datos del pedido"
        backHref="/listar-pedidos"
        backLabel="Volver"
      />

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
    </div>
  );
}
