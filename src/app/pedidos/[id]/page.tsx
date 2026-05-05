"use client";

import {
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import CategoryIcon from "@mui/icons-material/Category";
import ImageIcon from "@mui/icons-material/Image";
import PrintIcon from "@mui/icons-material/Print";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import { API_BASE_URL } from "@/lib/config";
import { getAuthHeaders } from "@/lib/auth";

type Order = {
  id: number;
  client_dni: string | null;
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

export default function VerPedidoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/orders/${id}`, {
          headers: getAuthHeaders(),
          credentials: "omit",
        });
        if (!res.ok) throw new Error("Pedido no encontrado");
        const data = await res.json();
        if (!cancelled) setOrder(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <Box sx={{ p: 3 }}>Cargando...</Box>;
  if (error || !order) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error || "Pedido no encontrado"}</Typography>
        <Button
          component={Link}
          href="/listar-pedidos"
          startIcon={<ArrowBackIcon />}
          sx={{ mt: 2 }}
        >
          Volver a pedidos
        </Button>
      </Box>
    );
  }

  const formatDate = (dateStr: string) => {
    // Parsear fecha YYYY-MM-DD como fecha local (no UTC)
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("es-PE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "warning";
      case "COMPLETE":
        return "success";
      case "CANCELLED":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING":
        return "Pendiente";
      case "COMPLETE":
        return "Completado";
      case "CANCELLED":
        return "Cancelado";
      default:
        return status;
    }
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const whatsappUrl = `https://wa.me/${cleanPhone}`;
    window.open(whatsappUrl, "_blank");
  };

  const formatDateForPdf = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    if (!year || !month || !day) return dateStr;
    return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
  };

  const sanitizePhone = (phoneNumber: string | null) => {
    return (phoneNumber ?? "").replace(/\D/g, "");
  };

  const getImageAsDataUrl = (
    url: string,
    outputFormat: "image/jpeg" | "image/png" = "image/jpeg",
  ) =>
    new Promise<string>((resolve, reject) => {
      const img = new Image();
      const isRemote = /^https?:\/\//i.test(url);
      if (isRemote) {
        img.crossOrigin = "anonymous";
      }
      const imageSrc = isRemote
        ? `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(url)}`
        : url;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo procesar la imagen referencial."));
          return;
        }
        ctx.drawImage(img, 0, 0);
        if (outputFormat === "image/png") {
          resolve(canvas.toDataURL("image/png"));
          return;
        }
        resolve(canvas.toDataURL("image/jpeg", 0.92));
      };
      img.onerror = () =>
        reject(
          new Error("No se pudo cargar la imagen referencial para el PDF."),
        );
      img.src = imageSrc;
    });

  const handlePrintQuote = async () => {
    if (!order) return;
    try {
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const leftX = 10;
      const tableWidth = pageWidth - leftX * 2;
      let y = 10;
      const logoUrl = "/logo-flash.png";

      const rowH = 10;
      const valueXPadding = 1.5;
      const rightColW = 55;
      const leftColW = tableWidth - rightColW;
      const halfLeft = leftColW / 2;
      const labelCol = 40;

      const drawCell = (
        x: number,
        top: number,
        w: number,
        h: number,
        text: string,
        bold = false,
        align: "left" | "center" | "right" = "left",
      ) => {
        pdf.rect(x, top, w, h);
        pdf.setFont("helvetica", bold ? "bold" : "normal");
        const textX =
          align === "left"
            ? x + valueXPadding
            : align === "center"
              ? x + w / 2
              : x + w - valueXPadding;
        pdf.text(text || "", textX, top + h / 2 + 1.5, {
          align:
            align === "left" ? "left" : align === "center" ? "center" : "right",
        });
      };

      // Header
      const logoWidth = 38;
      const logoHeight = 16;
      const headerRowH = Math.max(rowH + 2, logoHeight + 6);
      drawCell(leftX, y, leftColW, headerRowH, "Cotización", true, "left");
      drawCell(leftX + leftColW, y, rightColW, headerRowH, "", false);
      try {
        const logoDataUrl = await getImageAsDataUrl(logoUrl, "image/png");
        const logoX = leftX + tableWidth - logoWidth - 2;
        const logoY = y + (headerRowH - logoHeight) / 2;
        pdf.addImage(logoDataUrl, "PNG", logoX, logoY, logoWidth, logoHeight);
      } catch {
        // El PDF se genera aun si no se puede cargar el logo.
      }
      y += headerRowH;

      // Cliente
      drawCell(leftX, y, labelCol, rowH, "DNI", true);
      drawCell(
        leftX + labelCol,
        y,
        tableWidth - labelCol,
        rowH,
        order.client_dni ?? "-",
      );
      y += rowH;

      // Cliente
      drawCell(leftX, y, labelCol, rowH, "Cliente", true);
      drawCell(
        leftX + labelCol,
        y,
        tableWidth - labelCol,
        rowH,
        order.clientName,
      );
      y += rowH;

      // Fecha + Telefono
      const dateLabelW = 40;
      const phoneLabelW = 35;
      const dateValueExtraW = 12;
      const phoneStartX = leftX + halfLeft + dateValueExtraW;
      drawCell(leftX, y, dateLabelW, rowH, "Fecha", true);
      drawCell(
        leftX + dateLabelW,
        y,
        phoneStartX - (leftX + dateLabelW),
        rowH,
        formatDateForPdf(order.date),
        false,
        "center",
      );
      drawCell(phoneStartX, y, phoneLabelW, rowH, "Teléfono", true);
      drawCell(
        phoneStartX + phoneLabelW,
        y,
        leftX + tableWidth - (phoneStartX + phoneLabelW),
        rowH,
        sanitizePhone(order.phone) || "-",
        false,
        "right",
      );
      y += rowH;

      // Direccion
      drawCell(leftX, y, labelCol, rowH, "Dirección", true);
      drawCell(leftX + labelCol, y, tableWidth - labelCol, rowH, order.address);
      y += rowH;

      // Imagen referencial titulo
      drawCell(leftX, y, tableWidth, rowH, "Imagen Referencial", true);
      y += rowH;

      // Imagen referencial area
      const imgAreaH = 120;
      drawCell(leftX, y, tableWidth, imgAreaH, "", false);
      if (order.reference) {
        const dataUrl = await getImageAsDataUrl(order.reference);
        const imgProps = pdf.getImageProperties(dataUrl);
        const maxW = tableWidth - 10;
        const maxH = imgAreaH - 8;
        const ratio = Math.min(maxW / imgProps.width, maxH / imgProps.height);
        const imgW = imgProps.width * ratio;
        const imgH = imgProps.height * ratio;
        const imgX = leftX + (tableWidth - imgW) / 2;
        const imgY = y + (imgAreaH - imgH) / 2;
        pdf.addImage(dataUrl, "JPEG", imgX, imgY, imgW, imgH);
      }
      y += imgAreaH;

      // Totales
      const moneyLabelW = tableWidth - 55;
      const moneyValueW = 55;
      drawCell(leftX, y, moneyLabelW, rowH, "Total", false, "right");
      drawCell(
        leftX + moneyLabelW,
        y,
        moneyValueW,
        rowH,
        `S/. ${order.price.toFixed(2)}`,
        false,
        "right",
      );
      y += rowH;
      drawCell(leftX, y, moneyLabelW, rowH, "A cuenta", false, "right");
      drawCell(
        leftX + moneyLabelW,
        y,
        moneyValueW,
        rowH,
        `S/. ${(order.deposit ?? 0).toFixed(2)}`,
        false,
        "right",
      );
      y += rowH;
      drawCell(leftX, y, moneyLabelW, rowH, "Pendiente", false, "right");
      drawCell(
        leftX + moneyLabelW,
        y,
        moneyValueW,
        rowH,
        `S/. ${(order.balance ?? 0).toFixed(2)}`,
        false,
        "right",
      );
      y += rowH + 8;

      const disclaimer =
        "El adelanto confirma tu reserva y permite iniciar la preparación de tu decoración. Por ello, no es reembolsable si la cancelación se realiza dentro de las 96 horas o 4 días previos al evento.";
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(10);
      const disclaimerLines = pdf.splitTextToSize(disclaimer, tableWidth);
      pdf.text(disclaimerLines, leftX, y);

      pdf.save(`cotizacion-pedido-${order.id}.pdf`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar el PDF.");
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 800, mx: "auto" }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{ mb: 3 }}
      >
        <Button
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
            } else {
              router.push("/listar-pedidos");
            }
          }}
          startIcon={<ArrowBackIcon />}
        >
          Volver a pedidos
        </Button>
        <Button
          variant="contained"
          startIcon={<PrintIcon />}
          onClick={handlePrintQuote}
        >
          Imprimir cotización
        </Button>
      </Stack>

      <Paper
        elevation={3}
        sx={{
          p: { xs: 3, sm: 4 },
          borderRadius: 2,
          bgcolor: "background.paper",
        }}
      >
        {/* Header del recibo */}
        <Box
          sx={{
            textAlign: "center",
            mb: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <Typography variant="h4" component="h1" fontWeight="bold">
            Recibo N° {order.id}
          </Typography>
          <Chip
            label={getStatusLabel(order.status)}
            color={
              getStatusColor(order.status) as
                | "warning"
                | "success"
                | "error"
                | "default"
            }
            size="medium"
            sx={{ fontWeight: "bold" }}
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Información del cliente */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <Stack spacing={2}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <PersonIcon color="primary" />
                <Typography variant="subtitle2" color="text.secondary">
                  Cliente
                </Typography>
              </Box>
              <Typography variant="h6" fontWeight="medium">
                {order.clientName}
              </Typography>
            </Stack>
          </Grid>

          {order.phone && (
            <Grid item xs={12} sm={6}>
              <Stack spacing={2}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <PhoneIcon color="primary" />
                  <Typography variant="subtitle2" color="text.secondary">
                    Teléfono
                  </Typography>
                </Box>
                <Typography
                  variant="h6"
                  fontWeight="medium"
                  onClick={() => openWhatsApp(order.phone!)}
                  sx={{
                    cursor: "pointer",
                    color: "primary.main",
                    "&:hover": {
                      textDecoration: "underline",
                    },
                  }}
                >
                  {order.phone}
                </Typography>
              </Stack>
            </Grid>
          )}

          <Grid item xs={12} sm={6}>
            <Stack spacing={2}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CalendarTodayIcon color="primary" />
                <Typography variant="subtitle2" color="text.secondary">
                  Fecha del evento
                </Typography>
              </Box>
              <Typography variant="h6" fontWeight="medium">
                {formatDate(order.date)}
              </Typography>
            </Stack>
          </Grid>

          {order.category && (
            <Grid item xs={12} sm={6}>
              <Stack spacing={2}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CategoryIcon color="primary" />
                  <Typography variant="subtitle2" color="text.secondary">
                    Temática
                  </Typography>
                </Box>
                <Typography variant="h6" fontWeight="medium">
                  {order.category.name}
                </Typography>
              </Stack>
            </Grid>
          )}

          <Grid item xs={12}>
            <Stack spacing={2}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <LocationOnIcon color="primary" />
                <Typography variant="subtitle2" color="text.secondary">
                  Dirección
                </Typography>
              </Box>
              <Typography variant="body1" fontWeight="medium">
                {order.address}
              </Typography>
            </Stack>
          </Grid>

          {order.description && (
            <Grid item xs={12}>
              <Stack spacing={2}>
                <Typography variant="subtitle2" color="text.secondary">
                  Descripción
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                  {order.description}
                </Typography>
              </Stack>
            </Grid>
          )}
        </Grid>

        {/* Imagen referencial */}
        {order.reference && (
          <>
            <Divider sx={{ my: 3 }} />
            <Box>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
              >
                <ImageIcon color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  Imagen referencial
                </Typography>
              </Box>
              <Box
                component="img"
                src={order.reference}
                alt="Referencia"
                sx={{
                  width: "100%",
                  maxHeight: 500,
                  objectFit: "contain",
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              />
            </Box>
          </>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Información financiera */}
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="h6"
            fontWeight="bold"
            gutterBottom
            sx={{ mb: 2 }}
          >
            Detalle de pago
          </Typography>
          <Stack spacing={2}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                py: 1,
              }}
            >
              <Typography variant="body1" color="text.secondary">
                Cotización:
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                S/. {order.price.toFixed(2)}
              </Typography>
            </Box>

            {order.deposit != null && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  py: 1,
                }}
              >
                <Typography variant="body1" color="text.secondary">
                  A cuenta:
                </Typography>
                <Typography
                  variant="body1"
                  fontWeight="medium"
                  color="success.main"
                >
                  S/. {order.deposit.toFixed(2)}
                </Typography>
              </Box>
            )}

            {order.balance != null && (
              <>
                <Divider />
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    py: 1.5,
                    px: 2,
                    bgcolor: "action.hover",
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="h6" fontWeight="bold">
                    Pendiente:
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="primary">
                    S/. {order.balance.toFixed(2)}
                  </Typography>
                </Box>
              </>
            )}
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
