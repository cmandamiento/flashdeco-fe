"use client";

import { Suspense } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CancelIcon from "@mui/icons-material/Cancel";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
  status: "PENDING" | "COMPLETE" | "CANCELLED";
  reference: string | null;
  result: string | null;
  category: { id: number; name: string; description: string | null } | null;
};

type OrderBy = "clientName" | "date" | "status" | "category";

function StatusCell({ status }: { status: Order["status"] }) {
  const config = {
    PENDING: { label: "Pendiente", color: "#ed6c02" },
    COMPLETE: { label: "Completado", color: "#2e7d32" },
    CANCELLED: { label: "Cancelado", color: "#d32f2f" },
  };
  const { label, color } = config[status] ?? config.PENDING;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Box
        sx={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          bgcolor: color,
        }}
      />
      <Typography variant="body2">{label}</Typography>
    </Box>
  );
}

function getComparator(orderBy: OrderBy): (a: Order, b: Order) => number {
  return (a, b) => {
    const aVal = orderBy === "category" ? a.category?.name : a[orderBy];
    const bVal = orderBy === "category" ? b.category?.name : b[orderBy];
    if (aVal === bVal) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    const cmp = aVal < bVal ? -1 : 1;
    return cmp;
  };
}

function ListarPedidosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orderBy, setOrderBy] = useState<OrderBy>("date");
  const [orderDir, setOrderDir] = useState<"asc" | "desc">("desc");
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [successSnackbarOpen, setSuccessSnackbarOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("created") === "true") {
      setSuccessSnackbarOpen(true);
      router.replace("/listar-pedidos");
    }
  }, [searchParams, router]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/orders`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Error al cargar pedidos");
      const data = await res.json();
      setOrders(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de conexión");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSort = (field: OrderBy) => {
    const isAsc = orderBy === field && orderDir === "asc";
    setOrderDir(isAsc ? "desc" : "asc");
    setOrderBy(field);
  };

  const sortedOrders = [...orders].sort((a, b) => {
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
      const res = await fetch(
        `${API_BASE_URL}/orders/${orderToCancel.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status: "CANCELLED" }),
        }
      );
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
      // Parsear fecha YYYY-MM-DD como fecha local (no UTC)
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
    <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      <Button
        component={Link}
        href="/"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2 }}
      >
        Volver
      </Button>

      <Typography variant="h4" component="h1" gutterBottom>
        Listar pedidos
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Consulta todos los pedidos registrados
      </Typography>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {error && (
            <Typography color="error" sx={{ p: 2 }}>
              {error}
            </Typography>
          )}
          {loading ? (
            <Typography color="text.secondary" sx={{ p: 3 }}>
              Cargando pedidos...
            </Typography>
          ) : (
            <TableContainer>
              <Table size="medium">
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === "clientName"}
                        direction={orderBy === "clientName" ? orderDir : "asc"}
                        onClick={() => handleSort("clientName")}
                      >
                        Cliente
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === "date"}
                        direction={orderBy === "date" ? orderDir : "asc"}
                        onClick={() => handleSort("date")}
                      >
                        Fecha
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === "status"}
                        direction={orderBy === "status" ? orderDir : "asc"}
                        onClick={() => handleSort("status")}
                      >
                        Estado
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === "category"}
                        direction={orderBy === "category" ? orderDir : "asc"}
                        onClick={() => handleSort("category")}
                      >
                        Categoría
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">
                          No hay pedidos registrados
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedOrders.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>{row.clientName}</TableCell>
                        <TableCell>{formatDate(row.date)}</TableCell>
                        <TableCell>
                          <StatusCell status={row.status} />
                        </TableCell>
                        <TableCell>
                          {row.category?.name ?? "—"}
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            component={Link}
                            href={`/pedidos/${row.id}`}
                            size="small"
                            startIcon={<VisibilityIcon />}
                            sx={{ mr: 1 }}
                          >
                            Ver orden
                          </Button>
                          <Button
                            component={Link}
                            href={`/editar-pedido/${row.id}`}
                            size="small"
                            variant="outlined"
                            startIcon={<EditIcon />}
                            disabled={row.status === "CANCELLED"}
                            sx={{ mr: 1 }}
                          >
                            Editar orden
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            variant="contained"
                            startIcon={<CancelIcon />}
                            disabled={row.status === "CANCELLED"}
                            onClick={() => openCancelModal(row)}
                          >
                            Cancelar orden
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Dialog open={cancelModalOpen} onClose={closeCancelModal}>
        <DialogTitle>Cancelar pedido</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas cancelar el pedido de{" "}
            <strong>{orderToCancel?.clientName}</strong>? Esta acción no se
            puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCancelModal} disabled={cancelling}>
            No
          </Button>
          <Button
            onClick={handleConfirmCancel}
            color="error"
            variant="contained"
            disabled={cancelling}
          >
            {cancelling ? "Cancelando..." : "Sí, cancelar pedido"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={successSnackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSuccessSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSuccessSnackbarOpen(false)}
          severity="success"
          variant="filled"
          sx={{ width: "100%" }}
        >
          Pedido creado correctamente
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default function ListarPedidosPage() {
  return (
    <Suspense fallback={null}>
      <ListarPedidosContent />
    </Suspense>
  );
}
