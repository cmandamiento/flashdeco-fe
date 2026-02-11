"use client";

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Drawer,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SaveIcon from "@mui/icons-material/Save";
import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { API_BASE_URL } from "@/lib/config";

export type Category = {
  id: number;
  name: string;
  description: string | null;
};

export type OrderEvent = {
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
  category: Category | null;
  category_id: number | null;
};

export type OrderFormInitialValues = {
  clientName: string;
  phone: string;
  date: string;
  address: string;
  description: string;
  quote: string;
  deposit: string;
  categoryId: string;
  referenceUrl: string | null;
  registerPastEvent: boolean;
  status?: string;
};

type OrderFormProps = {
  mode: "create" | "edit";
  orderId?: number;
  initialValues?: Partial<OrderFormInitialValues>;
  cancelHref: string;
  submitLabel?: string;
  savingLabel?: string;
  successMessage?: string;
  onSuccess?: () => void;
};

const defaultInitial: OrderFormInitialValues = {
  clientName: "",
  phone: "",
  date: "",
  address: "",
  description: "",
  quote: "",
  deposit: "",
  categoryId: "",
  referenceUrl: null,
  registerPastEvent: false,
};

export function OrderForm({
  mode,
  orderId,
  initialValues = {},
  cancelHref,
  submitLabel = "Guardar pedido",
  savingLabel = "Guardando...",
  successMessage = "Pedido guardado correctamente.",
  onSuccess,
}: OrderFormProps) {
  const merged = { ...defaultInitial, ...initialValues };
  const [clientName, setClientName] = useState(merged.clientName);
  const [phone, setPhone] = useState(merged.phone);
  const [date, setDate] = useState(merged.date);
  const [address, setAddress] = useState(merged.address);
  const [description, setDescription] = useState(merged.description);
  const [quote, setQuote] = useState(merged.quote);
  const [deposit, setDeposit] = useState(merged.deposit);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(merged.referenceUrl);
  const [categoryId, setCategoryId] = useState(merged.categoryId);
  const [categories, setCategories] = useState<Category[]>([]);
  const [registerPastEvent, setRegisterPastEvent] = useState(merged.registerPastEvent);
  const [eventsOnSelectedDate, setEventsOnSelectedDate] = useState<OrderEvent[]>([]);
  const [eventsDrawerOpen, setEventsDrawerOpen] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const isEdit = mode === "edit";
  const hasExistingReference = Boolean(merged.referenceUrl);
  const referenceRequired = !isEdit || !hasExistingReference;

  useEffect(() => {
    fetch(`${API_BASE_URL}/categories`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (referenceFile) {
      const url = URL.createObjectURL(referenceFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (isEdit && merged.referenceUrl) {
      setPreviewUrl(merged.referenceUrl);
    } else {
      setPreviewUrl(null);
    }
  }, [referenceFile, isEdit, merged.referenceUrl]);

  useEffect(() => {
    if (!date) {
      setEventsOnSelectedDate([]);
      return;
    }
    setLoadingEvents(true);
    fetch(`${API_BASE_URL}/orders?date=${date}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        if (isEdit && orderId) {
          setEventsOnSelectedDate(list.filter((o: OrderEvent) => o.id !== orderId));
        } else {
          setEventsOnSelectedDate(list);
        }
      })
      .catch(() => setEventsOnSelectedDate([]))
      .finally(() => setLoadingEvents(false));
  }, [date, isEdit, orderId]);

  const balance = useMemo(() => {
    const quoteVal = parseFloat(quote) || 0;
    const depositVal = parseFloat(deposit) || 0;
    return Math.max(0, quoteVal - depositVal);
  }, [quote, deposit]);

  const minDate = useMemo(
    () => new Date().toISOString().split("T")[0],
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (
      !clientName ||
      !phone ||
      !date ||
      !address ||
      !categoryId ||
      !quote
    ) {
      setError(
        "Completa todos los campos obligatorios: nombre, teléfono, dirección, fecha, categoría y cotización."
      );
      return;
    }

    if (referenceRequired && !referenceFile && !(isEdit && merged.referenceUrl)) {
      setError("La imagen referencial es obligatoria.");
      return;
    }

    if (!registerPastEvent && date < minDate) {
      setError(
        "La fecha no puede ser anterior a hoy. Marca «Registrar evento pasado» si deseas usar una fecha pasada."
      );
      return;
    }

    setLoading(true);
    try {
      let referenceUrl: string | null = isEdit ? merged.referenceUrl ?? null : null;
      if (referenceFile) {
        const formData = new FormData();
        formData.append("file", referenceFile);
        const uploadRes = await fetch(`${API_BASE_URL}/upload`, {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) {
          const data = await uploadRes.json().catch(() => null);
          setError(data?.detail || "No se pudo subir la imagen referencial.");
          setLoading(false);
          return;
        }
        const { url } = await uploadRes.json();
        referenceUrl = url;
      }

      if (isEdit && orderId != null) {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientName,
            phone: phone || null,
            date,
            address,
            description: description || null,
            price: parseFloat(quote) || 0,
            deposit: parseFloat(deposit) || 0,
            balance,
            status: merged.status || "PENDING",
            reference: referenceUrl,
            category_id: categoryId ? Number(categoryId) : null,
          }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          setError(data?.detail || "No se pudo actualizar el pedido.");
          return;
        }
      } else {
        const response = await fetch(`${API_BASE_URL}/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientName,
            phone: phone || null,
            date,
            address,
            description: description || null,
            price: parseFloat(quote) || 0,
            deposit: parseFloat(deposit) || 0,
            balance,
            status: "PENDING",
            reference: referenceUrl,
            category_id: categoryId ? Number(categoryId) : null,
          }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          setError(data?.detail || "No se pudo guardar el pedido.");
          return;
        }
      }

      setSuccess(true);
      onSuccess?.();
    } catch {
      setError("Error de conexión con el backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card component="form" onSubmit={handleSubmit}>
        <CardContent sx={{ p: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {successMessage}
            </Alert>
          )}
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Nombre del cliente"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Teléfono"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Fecha"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: registerPastEvent ? undefined : { min: minDate },
                }}
                required
                helperText={
                  registerPastEvent
                    ? "Se permiten fechas pasadas"
                    : "No se permiten fechas pasadas"
                }
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={registerPastEvent}
                    onChange={(e) => setRegisterPastEvent(e.target.checked)}
                    color="primary"
                  />
                }
                label="Registrar evento pasado"
                sx={{ mt: 1, display: "block" }}
              />
              {loadingEvents && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Buscando eventos...
                </Typography>
              )}
              {!loadingEvents && eventsOnSelectedDate.length > 0 && (
                <Alert
                  severity="info"
                  sx={{ mt: 1.5, cursor: "pointer" }}
                  onClick={() => setEventsDrawerOpen(true)}
                >
                  Tienes {eventsOnSelectedDate.length} evento(s) registrados ese día, click aquí para mostrarlos
                </Alert>
              )}
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Dirección"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Descripción"
                multiline
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalle del pedido..."
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth required>
                <InputLabel id="category-label">Categoría</InputLabel>
                <Select
                  labelId="category-label"
                  label="Categoría"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="" disabled>
                    <em>Seleccione una categoría</em>
                  </MenuItem>
                  {categories.map((cat) => (
                    <MenuItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Imagen referencial
                {referenceRequired && (
                  <span style={{ color: "var(--mui-palette-error-main)" }}> *</span>
                )}
              </Typography>
              <Button
                variant="outlined"
                component="label"
                fullWidth
                color={!referenceFile && !previewUrl ? "error" : "primary"}
              >
                {referenceFile ? referenceFile.name : previewUrl ? "Imagen actual" : "Seleccionar imagen"}
                <input
                  type="file"
                  hidden
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={(e) => setReferenceFile(e.target.files?.[0] ?? null)}
                />
              </Button>
              {previewUrl && (
                <Box
                  component="img"
                  src={previewUrl}
                  alt="Vista previa"
                  sx={{
                    mt: 2,
                    maxWidth: "100%",
                    maxHeight: 240,
                    objectFit: "contain",
                    borderRadius: 1,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                />
              )}
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Cotización S/."
                type="number"
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                required
                slotProps={{
                  htmlInput: { min: 0, step: 0.01 },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Typography color="text.secondary">S/.</Typography>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="A cuenta S/."
                type="number"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
                slotProps={{
                  htmlInput: { min: 0, step: 0.01 },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Typography color="text.secondary">S/.</Typography>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Pendiente S/."
                value={balance.toFixed(2)}
                slotProps={{
                  htmlInput: { readOnly: true },
                  input: {
                    readOnly: true,
                    startAdornment: (
                      <InputAdornment position="start">
                        <Typography color="text.secondary">S/.</Typography>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Grid>

            <Grid size={12}>
              <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SaveIcon />}
                  disabled={loading}
                >
                  {loading ? savingLabel : submitLabel}
                </Button>
                <Button component={Link} href={cancelHref} variant="outlined">
                  Cancelar
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Drawer
        anchor="right"
        open={eventsDrawerOpen}
        onClose={() => setEventsDrawerOpen(false)}
        slotProps={{ backdrop: { sx: { cursor: "pointer" } } }}
      >
        <Box sx={{ width: { xs: "100%", sm: 400 }, p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Eventos del {date || "día"}
          </Typography>
          {eventsOnSelectedDate.map((order) => (
            <Accordion key={order.id} defaultExpanded={false} disableGutters sx={{ "&:before": { display: "none" } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0.25 }}>
                  <Typography variant="subtitle2">{order.clientName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {order.category?.name ?? "Sin categoría"}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                <Typography variant="body2"><strong>Cliente:</strong> {order.clientName}</Typography>
                {order.phone && (
                  <Typography variant="body2"><strong>Teléfono:</strong> {order.phone}</Typography>
                )}
                <Typography variant="body2"><strong>Fecha:</strong> {order.date}</Typography>
                <Typography variant="body2"><strong>Dirección:</strong> {order.address}</Typography>
                {order.description && (
                  <Typography variant="body2"><strong>Descripción:</strong> {order.description}</Typography>
                )}
                <Typography variant="body2"><strong>Cotización:</strong> S/. {Number(order.price).toFixed(2)}</Typography>
                {order.deposit != null && (
                  <Typography variant="body2"><strong>A cuenta:</strong> S/. {Number(order.deposit).toFixed(2)}</Typography>
                )}
                {order.balance != null && (
                  <Typography variant="body2"><strong>Pendiente:</strong> S/. {Number(order.balance).toFixed(2)}</Typography>
                )}
                <Typography variant="body2"><strong>Estado:</strong> {order.status}</Typography>
                {order.category && (
                  <Typography variant="body2"><strong>Categoría:</strong> {order.category.name}</Typography>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </Drawer>
    </>
  );
}
