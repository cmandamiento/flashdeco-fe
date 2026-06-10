"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/ui/star-rating";
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
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Completar orden</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="complete-client-name">Nombre del cliente</Label>
            <Input
              id="complete-client-name"
              value={clientName}
              readOnly
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="complete-client-dni">DNI</Label>
            <Input
              id="complete-client-dni"
              value={canRate ? normalizedDni : "Sin DNI registrado"}
              readOnly
            />
            <p className="text-xs text-muted-foreground">
              {canRate
                ? "La calificación se guarda por DNI"
                : "Agrega el DNI del cliente para poder calificarlo"}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="complete-observations">
              ¿Hubo alguna observación con la orden?
            </Label>
            <Textarea
              id="complete-observations"
              rows={4}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Observaciones..."
            />
          </div>
          <div>
            <p className="mb-2 text-sm text-muted-foreground">
              Calificación del cliente
            </p>
            {loadingRating ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                {existingRating !== null && (
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Calificación actual:
                    </span>
                    <StarRating
                      value={existingRating}
                      readOnly
                      size="sm"
                    />
                  </div>
                )}
                <StarRating
                  value={clientRating ?? 0}
                  onChange={setClientRating}
                  disabled={!canRate || confirming}
                />
                {canRate && existingRating === null && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Cliente nuevo: aún sin calificación previa
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={confirming}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={confirming}
            className="bg-green-600 text-white hover:bg-green-700"
          >
            {confirming ? "Completando..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
