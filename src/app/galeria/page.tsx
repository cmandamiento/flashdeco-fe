"use client";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import ImageNotSupportedIcon from "@mui/icons-material/ImageNotSupported";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogContent,
  Grid,
  IconButton,
  Pagination,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/config";
import { getAuthHeaders } from "@/lib/auth";

const PAGE_SIZE = 12;

type Order = {
  id: number;
  clientName: string;
  date: string;
  price: number;
  result: string | null;
};

function formatPrice(value: number) {
  return `S/. ${(value ?? 0).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
  })}`;
}

function parseOrderDateKey(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}

type GalleryCardProps = {
  order: Order;
  onImageClick: (src: string) => void;
};

function GalleryCard({ order, onImageClick }: GalleryCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = Boolean(order.result) && !imageFailed;
  const editHref = `/editar-pedido/${order.id}`;

  return (
    <Card
      variant="outlined"
      sx={{
        width: "100%",
        aspectRatio: "1 / 1",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <Box
        sx={{
          position: "relative",
          flex: 1,
          minHeight: 0,
          width: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          bgcolor: "action.hover",
        }}
      >
        {order.result && hasImage ? (
          <Box
            onClick={() => onImageClick(order.result!)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onImageClick(order.result!);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Ampliar imagen final"
            sx={{
              position: "relative",
              flex: 1,
              minHeight: 0,
              cursor: "pointer",
            }}
          >
            <Box
              component="img"
              src={order.result}
              alt={`Imagen final pedido ${order.id} — ${order.clientName}`}
              sx={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center center",
                display: "block",
              }}
              onError={() => setImageFailed(true)}
            />
          </Box>
        ) : (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1.25,
              color: "text.secondary",
              p: 1.5,
              textAlign: "center",
            }}
          >
            <ImageNotSupportedIcon sx={{ fontSize: 40, opacity: 0.6 }} />
            <Typography variant="body2" align="center" color="text.secondary">
              {order.result && imageFailed
                ? "No se pudo cargar la imagen"
                : "No tiene imagen"}
            </Typography>
            <Button
              component={Link}
              href={editHref}
              variant="outlined"
              size="small"
              sx={{ flexShrink: 0 }}
            >
              Agregar imagen
            </Button>
          </Box>
        )}
      </Box>
      <CardContent
        sx={{
          flexShrink: 0,
          pt: 1.25,
          pb: 1.25,
          px: 1.5,
          "&:last-child": { pb: 1.25 },
        }}
      >
        <Typography
          variant="h6"
          component="p"
          fontWeight={800}
          color="primary"
          sx={{ fontSize: { xs: "1.1rem", sm: "1.25rem" }, lineHeight: 1.3 }}
        >
          {formatPrice(order.price)}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          Pedido #{order.id}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function GaleriaPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [modalSrc, setModalSrc] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/orders`, {
        headers: getAuthHeaders(),
        credentials: "omit",
      });
      if (!res.ok) throw new Error("No se pudieron cargar los pedidos");
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de conexión");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const sortedOrders = useMemo(() => {
    return [...orders].sort(
      (a, b) => parseOrderDateKey(b.date) - parseOrderDateKey(a.date),
    );
  }, [orders]);

  const pageCount = Math.max(1, Math.ceil(sortedOrders.length / PAGE_SIZE));

  const pagedOrders = useMemo(() => {
    const safePage = Math.min(page, pageCount);
    const start = (safePage - 1) * PAGE_SIZE;
    return sortedOrders.slice(start, start + PAGE_SIZE);
  }, [sortedOrders, page, pageCount]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const openModal = useCallback((src: string) => {
    setModalSrc(src);
  }, []);

  const closeModal = useCallback(() => {
    setModalSrc(null);
  }, []);

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      <Box
        component={Link}
        href="/"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
          color: "primary.main",
          textDecoration: "none",
          mb: 2,
          "&:hover": { textDecoration: "underline" },
        }}
      >
        <ArrowBackIcon fontSize="small" />
        <Typography component="span">Inicio</Typography>
      </Box>

      <Typography variant="h4" component="h1" gutterBottom>
        Galería
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Imágenes finales de las decoraciones (resultado). Doce por página.
      </Typography>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : sortedOrders.length === 0 ? (
        <Typography color="text.secondary">
          No hay pedidos para mostrar.
        </Typography>
      ) : (
        <>
          <Grid container spacing={2}>
            {pagedOrders.map((order) => (
              <Grid
                item
                xs={12}
                sm={6}
                md={4}
                key={order.id}
                sx={{ display: "flex" }}
              >
                <GalleryCard order={order} onImageClick={openModal} />
              </Grid>
            ))}
          </Grid>

          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <Pagination
              count={pageCount}
              page={Math.min(page, pageCount)}
              onChange={(_, value) => setPage(value)}
              color="primary"
              size="large"
              showFirstButton
              showLastButton
              aria-label="Paginación de la galería"
            />
          </Box>
        </>
      )}

      <Dialog
        open={modalSrc !== null}
        onClose={closeModal}
        maxWidth="lg"
        fullWidth
        aria-labelledby="galeria-modal-title"
      >
        <IconButton
          onClick={closeModal}
          sx={{ position: "absolute", right: 8, top: 8, zIndex: 1 }}
          aria-label="Cerrar"
        >
          <CloseIcon />
        </IconButton>
        <DialogContent sx={{ p: 2, pt: 4 }}>
          <Typography
            id="galeria-modal-title"
            component="h2"
            sx={{
              clip: "rect(0 0 0 0)",
              clipPath: "inset(50%)",
              height: "1px",
              overflow: "hidden",
              position: "absolute",
              whiteSpace: "nowrap",
              width: "1px",
            }}
          >
            Imagen final ampliada
          </Typography>
          {modalSrc && (
            <Box
              component="img"
              src={modalSrc}
              alt="Imagen final ampliada"
              sx={{
                width: "100%",
                maxHeight: "85vh",
                objectFit: "contain",
                display: "block",
                borderRadius: 1,
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
