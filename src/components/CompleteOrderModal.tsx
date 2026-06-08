"use client";

import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Rating,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/config";
import { getAuthHeaders } from "@/lib/auth";

export type CompleteOrderPayload = {
  observations: string;
  clientRating: number | null;
};

type CompleteOrderModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: CompleteOrderPayload) => void;
  confirming: boolean;
  clientName: string;
  clientDni: string | null;
  confirmLabel?: string;
};

export function CompleteOrderModal({
  open,
  onClose,
  onConfirm,
  confirming,
  clientName,
  clientDni,
  confirmLabel = "Completar orden",
}: CompleteOrderModalProps) {
  const [observations, setObservations] = useState("");
  const [clientRating, setClientRating] = useState<number | null>(null);
  const [existingRating, setExistingRating] = useState<number | null>(null);
  const [loadingRating, setLoadingRating] = useState(false);

  const normalizedDni =
    clientDni?.replace(/\D/g, "").slice(0, 8) ?? "";
  const canRate = normalizedDni.length === 8;

  useEffect(() => {
    if (!open) return;
    setObservations("");
    setClientRating(null);
    setExistingRating(null);

    if (!canRate) return;

    let cancelled = false;
    setLoadingRating(true);
    fetch(`${API_BASE_URL}/clients/by-dni/${normalizedDni}`, {
      headers: getAuthHeaders(),
      credentials: "omit",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const rating =
          typeof data.rating === "number" && data.rating >= 1 && data.rating <= 5
            ? data.rating
            : null;
        setExistingRating(rating);
        if (rating !== null) {
          setClientRating(rating);
        }
      })
      .catch(() => {
        if (!cancelled) setExistingRating(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingRating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, normalizedDni, canRate]);

  const handleConfirm = () => {
    onConfirm({
      observations: observations.trim(),
      clientRating: canRate ? clientRating : null,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Completar orden</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField
            fullWidth
            label="Nombre del cliente"
            value={clientName}
            InputProps={{ readOnly: true }}
          />
          <TextField
            fullWidth
            label="DNI"
            value={canRate ? normalizedDni : "Sin DNI registrado"}
            InputProps={{ readOnly: true }}
            helperText={
              canRate
                ? "La calificación se guarda por DNI"
                : "Agrega el DNI del cliente para poder calificarlo"
            }
          />
          <TextField
            fullWidth
            label="¿Hubo alguna observación con la orden?"
            multiline
            rows={4}
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Observaciones..."
          />
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Calificación del cliente
            </Typography>
            {loadingRating ? (
              <CircularProgress size={22} />
            ) : (
              <>
                {existingRating !== null && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1.5,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Calificación actual:
                    </Typography>
                    <Rating value={existingRating} readOnly size="small" />
                  </Box>
                )}
                <Rating
                  value={clientRating ?? 0}
                  onChange={(_, value) =>
                    setClientRating(value === 0 ? null : value)
                  }
                  disabled={!canRate || confirming}
                  max={5}
                />
                {canRate && existingRating === null && (
                  <Typography variant="caption" color="text.secondary">
                    Cliente nuevo: aún sin calificación previa
                  </Typography>
                )}
              </>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={confirming}>
          Cancelar
        </Button>
        <Button
          onClick={handleConfirm}
          color="success"
          variant="contained"
          disabled={confirming}
        >
          {confirming ? "Completando..." : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
