"use client";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/config";
import { getAuthHeaders } from "@/lib/auth";

type Client = {
  id: number;
  dni: string;
  full_name: string;
  phone: string | null;
};

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [dni, setDni] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuClient, setMenuClient] = useState<Client | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/clients`, {
        headers: getAuthHeaders(),
        credentials: "omit",
      });
      if (!res.ok) throw new Error("Error al cargar clientes");
      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de conexión");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const openModal = (client?: Client) => {
    if (client) {
      setEditingId(client.id);
      setDni(client.dni);
      setFullName(client.full_name);
      setPhone(client.phone ?? "");
    } else {
      setEditingId(null);
      setDni("");
      setFullName("");
      setPhone("");
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    if (!saving) {
      setModalOpen(false);
    }
  };

  const handleDniChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    setDni(digits);
  };

  const handleSave = async () => {
    if (!dni || dni.length !== 8 || !fullName.trim()) {
      setError("DNI (8 dígitos) y nombres completos son obligatorios.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = { dni, full_name: fullName.trim(), phone: phone.trim() || null };
      if (editingId != null) {
        const res = await fetch(`${API_BASE_URL}/clients/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          credentials: "omit",
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.detail || "No se pudo actualizar el cliente");
        }
        setSnackbarMessage("Cliente actualizado correctamente.");
      } else {
        const res = await fetch(`${API_BASE_URL}/clients`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          credentials: "omit",
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.detail || "No se pudo guardar el cliente");
        }
        setSnackbarMessage("Cliente guardado correctamente.");
      }
      setSnackbarOpen(true);
      closeModal();
      await fetchClients();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const openMenu = (event: React.MouseEvent<HTMLElement>, client: Client) => {
    setMenuAnchor(event.currentTarget);
    setMenuClient(client);
  };

  const closeMenu = () => {
    setMenuAnchor(null);
    setMenuClient(null);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: "auto" }}>
      <Button
        component={Link}
        href="/"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2 }}
      >
        Volver
      </Button>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1">
          Clientes
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openModal()}>
          Agregar cliente
        </Button>
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {error && (
            <Typography color="error" sx={{ p: 2 }}>
              {error}
            </Typography>
          )}
          {loading ? (
            <Typography color="text.secondary" sx={{ p: 3 }}>
              Cargando clientes...
            </Typography>
          ) : (
            <TableContainer>
              <Table size="medium">
                <TableHead>
                  <TableRow>
                    <TableCell>DNI</TableCell>
                    <TableCell>Nombres completos</TableCell>
                    <TableCell>Teléfono</TableCell>
                    <TableCell align="right" sx={{ width: 56 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {clients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">
                          No hay clientes registrados
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    clients.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>{row.dni}</TableCell>
                        <TableCell>{row.full_name}</TableCell>
                        <TableCell>{row.phone ?? "—"}</TableCell>
                        <TableCell align="right">
                          <IconButton
                            aria-label="Acciones"
                            onClick={(e) => openMenu(e, row)}
                            sx={{ minWidth: 48, minHeight: 48 }}
                          >
                            <MoreVertIcon />
                          </IconButton>
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

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem
          component={Link}
          href={menuClient ? `/listar-pedidos?dni=${menuClient.dni}` : "#"}
          onClick={closeMenu}
        >
          Ver pedidos
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuClient) openModal(menuClient);
            closeMenu();
          }}
        >
          Editar
        </MenuItem>
      </Menu>

      <Dialog open={modalOpen} onClose={closeModal} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId != null ? "Editar cliente" : "Agregar cliente"}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              label="DNI (8 dígitos)"
              value={dni}
              onChange={(e) => handleDniChange(e.target.value)}
              required
              fullWidth
              inputProps={{ maxLength: 8, inputMode: "numeric", pattern: "[0-9]*" }}
              helperText="Solo números"
              disabled={editingId != null}
            />
            <TextField
              label="Nombres completos"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              fullWidth
              autoFocus={editingId != null}
            />
            <TextField
              label="Teléfono"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              fullWidth
              type="tel"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeModal} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving || !dni || dni.length !== 8 || !fullName.trim()}
          >
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity="success" variant="filled">
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
