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
  FormControl,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CancelIcon from "@mui/icons-material/Cancel";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/config";
import { getAuthHeaders } from "@/lib/auth";

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
  const [statusFilter, setStatusFilter] = useState<
    "PENDING" | "COMPLETE" | "CANCELLED" | "all"
  >("PENDING");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<number | "all">("all");
  const [dniFilter, setDniFilter] = useState("");
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuOrder, setMenuOrder] = useState<Order | null>(null);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [orderToComplete, setOrderToComplete] = useState<Order | null>(null);
  const [completeObservations, setCompleteObservations] = useState("");
  const [completing, setCompleting] = useState(false);

  const openCompleteModal = (order: Order) => {
    setOrderToComplete(order);
    setCompleteObservations("");
    setCompleteModalOpen(true);
  };

  const closeCompleteModal = () => {
    if (!completing) {
      setCompleteModalOpen(false);
      setOrderToComplete(null);
    }
  };

  const handleConfirmComplete = async () => {
    if (!orderToComplete) return;
    setCompleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderToComplete.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        credentials: "omit",
        body: JSON.stringify({
          status: "COMPLETE",
          observations: completeObservations.trim() || null,
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

  const openActionsMenu = (event: React.MouseEvent<HTMLElement>, order: Order) => {
    event.preventDefault();
    setMenuAnchor(event.currentTarget);
    setMenuOrder(order);
  };

  const closeActionsMenu = () => {
    setMenuAnchor(null);
    setMenuOrder(null);
  };

  useEffect(() => {
    if (searchParams.get("created") === "true") {
      setSuccessSnackbarOpen(true);
      router.replace("/listar-pedidos");
    }
    const dniParam = searchParams.get("dni") ?? "";
    if (dniParam && /^\d{8}$/.test(dniParam)) {
      setDniFilter(dniParam);
    }
  }, [searchParams, router]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      const dni = dniFilter.replace(/\D/g, "");
      if (dni.length === 8) params.set("dni", dni);
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
  }, [dniFilter]);

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
    const isAsc = orderBy === field && orderDir === "asc";
    setOrderDir(isAsc ? "desc" : "asc");
    setOrderBy(field);
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
            <>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  flexWrap: { sm: "wrap" },
                  alignItems: { xs: "stretch", sm: "center" },
                  gap: 2,
                  p: 2,
                  borderBottom: 1,
                  borderColor: "divider",
                }}
              >
                <FormControl
                  size="small"
                  sx={{
                    minWidth: { xs: "100%", sm: 160 },
                    maxWidth: { xs: "100%", sm: 200 },
                  }}
                >
                  <InputLabel id="status-filter-label">Estado</InputLabel>
                  <Select
                    labelId="status-filter-label"
                    value={statusFilter}
                    label="Estado"
                    onChange={(e) =>
                      setStatusFilter(
                        e.target.value as
                          | "PENDING"
                          | "COMPLETE"
                          | "CANCELLED"
                          | "all",
                      )
                    }
                  >
                    <MenuItem value="PENDING">Pendientes</MenuItem>
                    <MenuItem value="COMPLETE">Completados</MenuItem>
                    <MenuItem value="CANCELLED">Cancelados</MenuItem>
                    <MenuItem value="all">Todos</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  size="small"
                  label="DNI cliente"
                  placeholder="8 dígitos"
                  value={dniFilter}
                  onChange={(e) =>
                    setDniFilter(e.target.value.replace(/\D/g, "").slice(0, 8))
                  }
                  sx={{
                    minWidth: { xs: "100%", sm: 140 },
                    maxWidth: { xs: "100%", sm: 160 },
                  }}
                  inputProps={{ maxLength: 8, inputMode: "numeric" }}
                />
                <FormControl
                  size="small"
                  sx={{
                    minWidth: { xs: "100%", sm: 160 },
                    maxWidth: { xs: "100%", sm: 200 },
                  }}
                >
                  <InputLabel id="category-filter-label">Temática</InputLabel>
                  <Select
                    labelId="category-filter-label"
                    value={categoryFilter}
                    label="Temática"
                    onChange={(e) =>
                      setCategoryFilter(
                        e.target.value === "all"
                          ? "all"
                          : Number(e.target.value),
                      )
                    }
                  >
                    <MenuItem value="all">Todas</MenuItem>
                    {categories.map((cat) => (
                      <MenuItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <TableContainer>
                <Table size="medium">
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <TableSortLabel
                          active={orderBy === "clientName"}
                          direction={
                            orderBy === "clientName" ? orderDir : "asc"
                          }
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
                          Temática
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
                            {statusFilter === "all" && categoryFilter === "all"
                              ? "No hay pedidos registrados"
                              : "No hay pedidos que coincidan con los filtros"}
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
                          <TableCell>{row.category?.name ?? "—"}</TableCell>
                          <TableCell align="right">
                            <Box
                              sx={{
                                display: { xs: "block", sm: "none" },
                              }}
                            >
                              <IconButton
                                aria-label="Acciones"
                                aria-haspopup="true"
                                onClick={(e) => openActionsMenu(e, row)}
                                sx={{ minWidth: 48, minHeight: 48 }}
                              >
                                <MoreVertIcon />
                              </IconButton>
                            </Box>
                            <Box
                              sx={{
                                display: { xs: "none", sm: "flex" },
                                gap: 0.5,
                                justifyContent: "flex-end",
                              }}
                            >
                              <Button
                                component={Link}
                                href={`/pedidos/${row.id}`}
                                size="small"
                                startIcon={<VisibilityIcon />}
                                aria-label="Ver"
                              >
                                Ver
                              </Button>
                              <Button
                                size="small"
                                color="success"
                                variant="contained"
                                startIcon={<CheckCircleIcon />}
                                disabled={
                                  row.status === "CANCELLED" ||
                                  row.status === "COMPLETE"
                                }
                                onClick={() => openCompleteModal(row)}
                                aria-label="Completar orden"
                              >
                                Completar
                              </Button>
                              <Button
                                component={Link}
                                href={`/editar-pedido/${row.id}`}
                                size="small"
                                variant="outlined"
                                startIcon={<EditIcon />}
                                disabled={row.status === "CANCELLED"}
                                aria-label="Editar"
                              >
                                Editar
                              </Button>
                              <Button
                                size="small"
                                color="error"
                                variant="contained"
                                startIcon={<CancelIcon />}
                                disabled={row.status === "CANCELLED"}
                                onClick={() => openCancelModal(row)}
                                aria-label="Cancelar"
                              >
                                Cancelar
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </CardContent>
      </Card>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeActionsMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { minWidth: 160 } } }}
      >
        <MenuItem
          component={Link}
          href={menuOrder ? `/pedidos/${menuOrder.id}` : "#"}
          onClick={closeActionsMenu}
          sx={{ minHeight: 48, py: 1.5 }}
        >
          <VisibilityIcon sx={{ mr: 1.5, fontSize: 20 }} />
          Ver
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuOrder) openCompleteModal(menuOrder);
            closeActionsMenu();
          }}
          disabled={
            menuOrder?.status === "CANCELLED" ||
            menuOrder?.status === "COMPLETE"
          }
          sx={{ minHeight: 48, py: 1.5, color: "success.main" }}
        >
          <CheckCircleIcon sx={{ mr: 1.5, fontSize: 20 }} />
          Completar orden
        </MenuItem>
        <MenuItem
          component={Link}
          href={menuOrder ? `/editar-pedido/${menuOrder.id}` : "#"}
          onClick={closeActionsMenu}
          disabled={menuOrder?.status === "CANCELLED"}
          sx={{ minHeight: 48, py: 1.5 }}
        >
          <EditIcon sx={{ mr: 1.5, fontSize: 20 }} />
          Editar
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuOrder) openCancelModal(menuOrder);
            closeActionsMenu();
          }}
          disabled={menuOrder?.status === "CANCELLED"}
          sx={{
            minHeight: 48,
            py: 1.5,
            color: "error.main",
          }}
        >
          <CancelIcon sx={{ mr: 1.5, fontSize: 20 }} />
          Cancelar
        </MenuItem>
      </Menu>

      <Dialog open={completeModalOpen} onClose={closeCompleteModal} maxWidth="sm" fullWidth>
        <DialogTitle>Completar orden</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Nombre"
              value={orderToComplete?.clientName ?? ""}
              InputProps={{ readOnly: true }}
            />
            <TextField
              fullWidth
              label="Hubo alguna observación con la orden?"
              multiline
              rows={4}
              value={completeObservations}
              onChange={(e) => setCompleteObservations(e.target.value)}
              placeholder="Observaciones..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCompleteModal} disabled={completing}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmComplete}
            color="success"
            variant="contained"
            disabled={completing}
          >
            {completing ? "Completando..." : "Completar orden"}
          </Button>
        </DialogActions>
      </Dialog>

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
