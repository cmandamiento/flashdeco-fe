"use client";

import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import VisibilityIcon from "@mui/icons-material/Visibility";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/config";
import { getAuthHeaders } from "@/lib/auth";

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
        }
      );
      if (!res.ok) throw new Error("Error al cargar pedidos");
      const data = await res.json();
      setOrders(data);
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
        Finanzas
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Reporte de pedidos completados por mes
      </Typography>

      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 2,
              mb: 2,
            }}
          >
            <Typography component="span" variant="body2">
              Mes:
            </Typography>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="month-label">Mes</InputLabel>
              <Select
                labelId="month-label"
                value={month}
                label="Mes"
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {MONTHES.map((m) => (
                  <MenuItem key={m.value} value={m.value}>
                    {m.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography component="span" variant="body2">
              Año:
            </Typography>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel id="year-label">Año</InputLabel>
              <Select
                labelId="year-label"
                value={year}
                label="Año"
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {years.map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

          {loading ? (
            <Typography color="text.secondary" sx={{ py: 3 }}>
              Cargando...
            </Typography>
          ) : (
            <TableContainer>
              <Table size="medium">
                <TableHead>
                  <TableRow>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Categoría</TableCell>
                    <TableCell align="right">Importe (S/)</TableCell>
                    <TableCell align="right">Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">
                          No hay pedidos completados en {MONTHES[month - 1]?.label}{" "}
                          {year}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {orders.map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell>{row.clientName}</TableCell>
                          <TableCell>{formatDate(row.date)}</TableCell>
                          <TableCell>{row.category?.name ?? "—"}</TableCell>
                          <TableCell align="right">
                            {(row.price ?? 0).toLocaleString("es-PE", {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              component={Link}
                              href={`/pedidos/${row.id}`}
                              size="small"
                              startIcon={<VisibilityIcon />}
                              aria-label="Ver orden"
                            >
                              Ver
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ fontWeight: 700, bgcolor: "action.hover" }}>
                        <TableCell colSpan={3} align="right">
                          Total:
                        </TableCell>
                        <TableCell align="right">
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
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
