"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import { getAuthHeaders } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

const MONTHES = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];

export default function FinanzasPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${API_BASE_URL}/orders?month=${month}&year=${year}&status=COMPLETE`,
        {
          headers: getAuthHeaders(),
          credentials: "omit",
        },
      );
      if (!res.ok) throw new Error("Error al cargar pedidos");
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const formatDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const totalPrice = orders.reduce((sum, o) => sum + (o.price || 0), 0);
  const years = Array.from({ length: 10 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <PageHeader
        title="Finanzas"
        description="Reporte de pedidos completados por mes"
        backHref="/"
      />

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm">Mes:</span>
              <Select
                value={String(month)}
                onValueChange={(v) => setMonth(Number(v))}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHES.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Año:</span>
              <Select
                value={String(year)}
                onValueChange={(v) => setYear(Number(v))}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {loading ? (
            <p className="py-6 text-muted-foreground">Cargando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Importe (S/)</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No hay pedidos completados en {MONTHES[month - 1]?.label}{" "}
                      {year}
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {orders.map((row, index) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-center text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell>{row.clientName}</TableCell>
                        <TableCell>{formatDate(row.date)}</TableCell>
                        <TableCell>{row.category?.name ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          {(row.price ?? 0).toLocaleString("es-PE", {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/pedidos/${row.id}`}>
                              <Eye className="size-4" />
                              Ver
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell />
                      <TableCell colSpan={3} className="text-right">
                        Total ({orders.length}):
                      </TableCell>
                      <TableCell className="text-right">
                        {totalPrice.toLocaleString("es-PE", {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
