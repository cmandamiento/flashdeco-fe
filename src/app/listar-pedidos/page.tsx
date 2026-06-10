"use client";

import { Suspense } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle,
  Eye,
  MoreVertical,
  Pencil,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import {
  CompleteOrderModal,
  type CompleteOrderPayload,
} from "@/components/CompleteOrderModal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { API_BASE_URL } from "@/lib/config";
import { getAuthHeaders } from "@/lib/auth";
import { cn } from "@/lib/utils";

type Category = {
  id: number;
  name: string;
  description: string | null;
};

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
  status: "PENDING" | "COMPLETE" | "CANCELLED";
  reference: string | null;
  result: string | null;
  category: Category | null;
  client_dni?: string | null;
};

type OrderBy = "clientName" | "date" | "status" | "category" | "price";

type DateRangeKey =
  | "current_month"
  | "previous_month"
  | "last_3_months"
  | "custom";

const DEFAULT_STATUS: "PENDING" | "COMPLETE" | "CANCELLED" | "all" = "PENDING";
const DEFAULT_RANGE: DateRangeKey = "current_month";
const DEFAULT_SORT: OrderBy = "date";
const DEFAULT_DIR: "asc" | "desc" = "desc";

function parseStatus(
  sp: URLSearchParams,
): "PENDING" | "COMPLETE" | "CANCELLED" | "all" {
  const s = sp.get("status");
  if (s && ["PENDING", "COMPLETE", "CANCELLED", "all"].includes(s)) {
    return s as "PENDING" | "COMPLETE" | "CANCELLED" | "all";
  }
  return DEFAULT_STATUS;
}

function parseRange(sp: URLSearchParams): DateRangeKey {
  const r = sp.get("range");
  if (
    r &&
    ["current_month", "previous_month", "last_3_months", "custom"].includes(r)
  ) {
    return r as DateRangeKey;
  }
  return DEFAULT_RANGE;
}

function parseCategory(sp: URLSearchParams): number | "all" {
  const c = sp.get("category");
  if (!c || c === "all") return "all";
  const n = Number(c);
  return Number.isFinite(n) ? n : "all";
}

function parseOrderBy(sp: URLSearchParams): OrderBy {
  const s = sp.get("sort");
  if (
    s &&
    ["clientName", "date", "status", "category", "price"].includes(s)
  ) {
    return s as OrderBy;
  }
  return DEFAULT_SORT;
}

function parseOrderDir(sp: URLSearchParams): "asc" | "desc" {
  const d = sp.get("dir");
  if (d === "asc" || d === "desc") return d;
  return DEFAULT_DIR;
}

function patchParams(
  base: URLSearchParams,
  patch: Record<string, string | null | undefined>,
): URLSearchParams {
  const p = new URLSearchParams(base.toString());
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined || v === "") p.delete(k);
    else p.set(k, v);
  }
  return p;
}

function StatusCell({ status }: { status: Order["status"] }) {
  const config = {
    PENDING: {
      label: "Pendiente",
      className: "border-amber-500 bg-amber-50 text-amber-700",
    },
    COMPLETE: {
      label: "Completado",
      className: "border-green-600 bg-green-50 text-green-700",
    },
    CANCELLED: {
      label: "Cancelado",
      className: "border-destructive bg-destructive/10 text-destructive",
    },
  };
  const { label, className } = config[status] ?? config.PENDING;
  return (
    <Badge variant="outline" className={className}>
      <span
        className={cn(
          "size-2 rounded-full",
          status === "PENDING" && "bg-amber-500",
          status === "COMPLETE" && "bg-green-600",
          status === "CANCELLED" && "bg-destructive",
        )}
      />
      {label}
    </Badge>
  );
}

function SortableHead({
  label,
  field,
  orderBy,
  orderDir,
  onSort,
  className,
}: {
  label: string;
  field: OrderBy;
  orderBy: OrderBy;
  orderDir: "asc" | "desc";
  onSort: (field: OrderBy) => void;
  className?: string;
}) {
  const active = orderBy === field;
  return (
    <TableHead className={className}>
      <button
        type="button"
        className="inline-flex items-center gap-1 font-medium hover:text-foreground"
        onClick={() => onSort(field)}
      >
        {label}
        {active ? (
          orderDir === "asc" ? (
            <ArrowUp className="size-4" />
          ) : (
            <ArrowDown className="size-4" />
          )
        ) : (
          <ArrowUpDown className="size-4 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}

function getComparator(orderBy: OrderBy): (a: Order, b: Order) => number {
  return (a, b) => {
    if (orderBy === "price") {
      return (a.price ?? 0) - (b.price ?? 0);
    }
    const aVal = orderBy === "category" ? a.category?.name : a[orderBy];
    const bVal = orderBy === "category" ? b.category?.name : b[orderBy];
    if (aVal === bVal) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    const cmp = aVal < bVal ? -1 : 1;
    return cmp;
  };
}

function formatPrice(value: number) {
  return `S/. ${(value ?? 0).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
  })}`;
}

function ListarPedidosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const statusFilter = useMemo(() => parseStatus(searchParams), [searchParams]);
  const dateRangeFilter = useMemo(() => parseRange(searchParams), [searchParams]);
  const customDateFrom = searchParams.get("from") ?? "";
  const customDateTo = searchParams.get("to") ?? "";
  const categoryFilter = useMemo(
    () => parseCategory(searchParams),
    [searchParams],
  );
  const orderBy = useMemo(() => parseOrderBy(searchParams), [searchParams]);
  const orderDir = useMemo(() => parseOrderDir(searchParams), [searchParams]);

  const replaceQuery = useCallback(
    (patch: Record<string, string | null | undefined>) => {
      const p = patchParams(searchParams, patch);
      const qs = p.toString();
      router.replace(qs ? `/listar-pedidos?${qs}` : "/listar-pedidos", {
        scroll: false,
      });
    },
    [router, searchParams],
  );

  const [dniInput, setDniInput] = useState(() =>
    (searchParams.get("dni") ?? "").replace(/\D/g, "").slice(0, 8),
  );
  const dniDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDniInput((searchParams.get("dni") ?? "").replace(/\D/g, "").slice(0, 8));
  }, [searchParams]);

  useEffect(
    () => () => {
      if (dniDebounceRef.current) clearTimeout(dniDebounceRef.current);
    },
    [],
  );

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [orderToComplete, setOrderToComplete] = useState<Order | null>(null);
  const [completing, setCompleting] = useState(false);

  const openCompleteModal = (order: Order) => {
    setOrderToComplete(order);
    setCompleteModalOpen(true);
  };

  const closeCompleteModal = () => {
    if (!completing) {
      setCompleteModalOpen(false);
      setOrderToComplete(null);
    }
  };

  const handleConfirmComplete = async ({
    observations,
    clientRating,
  }: CompleteOrderPayload) => {
    if (!orderToComplete) return;
    setCompleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderToComplete.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        credentials: "omit",
        body: JSON.stringify({
          status: "COMPLETE",
          observations: observations || null,
          client_rating: clientRating,
        }),
      });
      if (!res.ok) throw new Error("No se pudo completar el pedido");
      await fetchOrders();
      closeCompleteModal();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al completar");
    } finally {
      setCompleting(false);
    }
  };

  useEffect(() => {
    if (searchParams.get("created") !== "true") return;
    toast.success("Pedido creado correctamente");
    const p = patchParams(searchParams, { created: null });
    const qs = p.toString();
    router.replace(qs ? `/listar-pedidos?${qs}` : "/listar-pedidos", {
      scroll: false,
    });
  }, [searchParams, router]);

  const { fromDate, toDate } = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const pad = (n: number) => String(n).padStart(2, "0");
    const firstDay = (year: number, month: number) =>
      `${year}-${pad(month + 1)}-01`;
    const lastDay = (year: number, month: number) => {
      const d = new Date(year, month + 1, 0);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };
    switch (dateRangeFilter) {
      case "current_month":
        return {
          fromDate: firstDay(y, m),
          toDate: lastDay(y, m),
        };
      case "previous_month": {
        const prev = new Date(y, m - 1, 1);
        return {
          fromDate: firstDay(prev.getFullYear(), prev.getMonth()),
          toDate: lastDay(prev.getFullYear(), prev.getMonth()),
        };
      }
      case "last_3_months": {
        const from = new Date(today);
        from.setMonth(from.getMonth() - 3);
        return {
          fromDate: `${from.getFullYear()}-${pad(from.getMonth() + 1)}-${pad(from.getDate())}`,
          toDate: `${y}-${pad(m + 1)}-${pad(today.getDate())}`,
        };
      }
      case "custom":
        return {
          fromDate: customDateFrom || "",
          toDate: customDateTo || "",
        };
      default:
        return { fromDate: "", toDate: "" };
    }
  }, [dateRangeFilter, customDateFrom, customDateTo]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      const dni = dniInput.replace(/\D/g, "");
      if (dni.length === 8) params.set("dni", dni);
      if (fromDate && /^\d{4}-\d{2}-\d{2}$/.test(fromDate))
        params.set("from_date", fromDate);
      if (toDate && /^\d{4}-\d{2}-\d{2}$/.test(toDate))
        params.set("to_date", toDate);
      const url = `${API_BASE_URL}/orders${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: "omit",
      });
      if (!res.ok) throw new Error("Error al cargar pedidos");
      const data = await res.json();
      setOrders(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [dniInput, fromDate, toDate]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/categories`, {
        headers: getAuthHeaders(),
        credentials: "omit",
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
      }
    } catch {
      // Silently ignore, categories filter will be empty
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSort = (field: OrderBy) => {
    if (orderBy !== field) {
      if (field === DEFAULT_SORT) {
        replaceQuery({ sort: null, dir: null });
      } else {
        replaceQuery({ sort: field, dir: "desc" });
      }
      return;
    }
    const isAsc = orderDir === "asc";
    const nextDir: "asc" | "desc" = isAsc ? "desc" : "asc";
    if (field === DEFAULT_SORT && nextDir === DEFAULT_DIR) {
      replaceQuery({ sort: null, dir: null });
    } else {
      replaceQuery({ sort: field, dir: nextDir });
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (categoryFilter !== "all" && (o.category?.id ?? null) !== categoryFilter)
      return false;
    return true;
  });
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const cmp = getComparator(orderBy)(a, b);
    return orderDir === "asc" ? cmp : -cmp;
  });

  const openCancelModal = (order: Order) => {
    setOrderToCancel(order);
    setCancelModalOpen(true);
  };

  const closeCancelModal = () => {
    if (!cancelling) {
      setCancelModalOpen(false);
      setOrderToCancel(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;
    setCancelling(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderToCancel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        credentials: "omit",
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      if (!res.ok) throw new Error("No se pudo cancelar el pedido");
      await fetchOrders();
      closeCancelModal();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cancelar");
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split("-").map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      <PageHeader
        title="Listar pedidos"
        description="Consulta todos los pedidos registrados"
        backHref="/"
        backLabel="Volver"
      />

      <Card>
        <CardContent className="p-0">
          {error && (
            <Alert variant="destructive" className="m-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {loading ? (
            <p className="p-6 text-muted-foreground">Cargando pedidos...</p>
          ) : (
            <>
              <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:flex-wrap sm:items-end">
                <div className="w-full space-y-2 sm:w-auto sm:min-w-[180px] sm:max-w-[220px]">
                  <Label htmlFor="date-range">Rango de fechas</Label>
                  <Select
                    value={dateRangeFilter}
                    onValueChange={(v) => {
                      const range = v as DateRangeKey;
                      if (range === "custom") {
                        replaceQuery({ range: "custom" });
                      } else {
                        replaceQuery({
                          range: range === DEFAULT_RANGE ? null : range,
                          from: null,
                          to: null,
                        });
                      }
                    }}
                  >
                    <SelectTrigger id="date-range" className="w-full">
                      <SelectValue placeholder="Rango de fechas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current_month">Mes actual</SelectItem>
                      <SelectItem value="previous_month">Mes anterior</SelectItem>
                      <SelectItem value="last_3_months">Últimos 3 meses</SelectItem>
                      <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {dateRangeFilter === "custom" && (
                  <div className="flex w-full flex-col gap-3 rounded-md border bg-muted/40 p-3 sm:w-auto sm:flex-row sm:items-end">
                    <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Período
                    </span>
                    <div className="space-y-2 sm:min-w-[150px]">
                      <Label htmlFor="date-from">Desde</Label>
                      <Input
                        id="date-from"
                        type="date"
                        value={customDateFrom}
                        max={customDateTo || undefined}
                        onChange={(e) => {
                          replaceQuery({
                            from: e.target.value || null,
                            range: "custom",
                          });
                        }}
                      />
                    </div>
                    <span className="hidden text-muted-foreground sm:block">–</span>
                    <div className="space-y-2 sm:min-w-[150px]">
                      <Label htmlFor="date-to">Hasta</Label>
                      <Input
                        id="date-to"
                        type="date"
                        value={customDateTo}
                        min={customDateFrom || undefined}
                        onChange={(e) => {
                          replaceQuery({
                            to: e.target.value || null,
                            range: "custom",
                          });
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="w-full space-y-2 sm:w-auto sm:min-w-[160px] sm:max-w-[200px]">
                  <Label htmlFor="status-filter">Estado</Label>
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => {
                      const status = v as
                        | "PENDING"
                        | "COMPLETE"
                        | "CANCELLED"
                        | "all";
                      replaceQuery({
                        status: status === DEFAULT_STATUS ? null : status,
                      });
                    }}
                  >
                    <SelectTrigger id="status-filter" className="w-full">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pendientes</SelectItem>
                      <SelectItem value="COMPLETE">Completados</SelectItem>
                      <SelectItem value="CANCELLED">Cancelados</SelectItem>
                      <SelectItem value="all">Todos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full space-y-2 sm:w-auto sm:min-w-[140px] sm:max-w-[160px]">
                  <Label htmlFor="dni-filter">DNI cliente</Label>
                  <Input
                    id="dni-filter"
                    placeholder="8 dígitos"
                    value={dniInput}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 8);
                      setDniInput(v);
                      if (dniDebounceRef.current)
                        clearTimeout(dniDebounceRef.current);
                      dniDebounceRef.current = setTimeout(() => {
                        replaceQuery({ dni: v.length > 0 ? v : null });
                      }, 400);
                    }}
                    maxLength={8}
                    inputMode="numeric"
                  />
                </div>

                <div className="w-full space-y-2 sm:w-auto sm:min-w-[160px] sm:max-w-[200px]">
                  <Label htmlFor="category-filter">Temática</Label>
                  <Select
                    value={String(categoryFilter)}
                    onValueChange={(v) => {
                      replaceQuery({
                        category: v === "all" ? null : v,
                      });
                    }}
                  >
                    <SelectTrigger id="category-filter" className="w-full">
                      <SelectValue placeholder="Temática" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead
                      label="Cliente"
                      field="clientName"
                      orderBy={orderBy}
                      orderDir={orderDir}
                      onSort={handleSort}
                    />
                    <SortableHead
                      label="Fecha"
                      field="date"
                      orderBy={orderBy}
                      orderDir={orderDir}
                      onSort={handleSort}
                    />
                    <SortableHead
                      label="Estado"
                      field="status"
                      orderBy={orderBy}
                      orderDir={orderDir}
                      onSort={handleSort}
                    />
                    <SortableHead
                      label="Temática"
                      field="category"
                      orderBy={orderBy}
                      orderDir={orderDir}
                      onSort={handleSort}
                    />
                    <SortableHead
                      label="Precio total"
                      field="price"
                      orderBy={orderBy}
                      orderDir={orderDir}
                      onSort={handleSort}
                      className="text-right"
                    />
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center">
                        <span className="text-muted-foreground">
                          {statusFilter === "all" && categoryFilter === "all"
                            ? "No hay pedidos registrados"
                            : "No hay pedidos que coincidan con los filtros"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedOrders.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.clientName}</TableCell>
                        <TableCell>{formatDate(row.date)}</TableCell>
                        <TableCell>
                          <StatusCell status={row.status} />
                        </TableCell>
                        <TableCell>{row.category?.name ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          {formatPrice(row.price)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="sm:hidden">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-12"
                                  aria-label="Acciones"
                                >
                                  <MoreVertical className="size-5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-40">
                                <DropdownMenuItem asChild>
                                  <Link href={`/pedidos/${row.id}`}>
                                    <Eye className="size-4" />
                                    Ver
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-green-700 focus:text-green-700"
                                  disabled={
                                    row.status === "CANCELLED" ||
                                    row.status === "COMPLETE"
                                  }
                                  onClick={() => openCompleteModal(row)}
                                >
                                  <CheckCircle className="size-4 text-green-600" />
                                  Completar orden
                                </DropdownMenuItem>
                                {row.status === "CANCELLED" ? (
                                  <DropdownMenuItem disabled>
                                    <Pencil className="size-4" />
                                    Editar
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem asChild>
                                    <Link href={`/editar-pedido/${row.id}`}>
                                      <Pencil className="size-4" />
                                      Editar
                                    </Link>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  variant="destructive"
                                  disabled={
                                    row.status === "CANCELLED" ||
                                    row.status === "COMPLETE"
                                  }
                                  onClick={() => openCancelModal(row)}
                                >
                                  <XCircle className="size-4" />
                                  Cancelar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="hidden flex-wrap justify-end gap-1 sm:flex">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/pedidos/${row.id}`}>
                                <Eye className="size-4" />
                                Ver
                              </Link>
                            </Button>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              disabled={
                                row.status === "CANCELLED" ||
                                row.status === "COMPLETE"
                              }
                              onClick={() => openCompleteModal(row)}
                              aria-label="Completar orden"
                            >
                              <CheckCircle className="size-4" />
                              Completar
                            </Button>
                            {row.status === "CANCELLED" ? (
                              <Button variant="outline" size="sm" disabled>
                                <Pencil className="size-4" />
                                Editar
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/editar-pedido/${row.id}`}>
                                  <Pencil className="size-4" />
                                  Editar
                                </Link>
                              </Button>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={
                                row.status === "CANCELLED" ||
                                row.status === "COMPLETE"
                              }
                              onClick={() => openCancelModal(row)}
                              aria-label="Cancelar"
                            >
                              <XCircle className="size-4" />
                              Cancelar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      <CompleteOrderModal
        open={completeModalOpen}
        onClose={closeCompleteModal}
        onConfirm={handleConfirmComplete}
        confirming={completing}
        clientName={orderToComplete?.clientName ?? ""}
        clientDni={orderToComplete?.client_dni ?? null}
      />

      <Dialog
        open={cancelModalOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) closeCancelModal();
          else setCancelModalOpen(true);
        }}
      >
        <DialogContent showCloseButton={!cancelling}>
          <DialogHeader>
            <DialogTitle>Cancelar pedido</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas cancelar el pedido de{" "}
              <strong>{orderToCancel?.clientName}</strong>? Esta acción no se
              puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeCancelModal}
              disabled={cancelling}
            >
              No
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={cancelling}
            >
              {cancelling ? "Cancelando..." : "Sí, cancelar pedido"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ListarPedidosPage() {
  return (
    <Suspense fallback={null}>
      <ListarPedidosContent />
    </Suspense>
  );
}
