"use client";

import {
  ArrowLeft,
  Calendar,
  Image as ImageIcon,
  MapPin,
  Phone,
  Printer,
  Tags,
  TriangleAlert,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { API_BASE_URL } from "@/lib/config";
import { getAuthHeaders } from "@/lib/auth";
import { parseOrderImageList } from "@/lib/orderImages";
import { cn } from "@/lib/utils";

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
  reference: string | string[] | null;
  result: string | string[] | null;
  observations: string | null;
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

  if (loading) {
    return <div className="p-6">Cargando...</div>;
  }

  if (error || !order) {
    return (
      <div className="p-6">
        <p className="text-destructive">{error || "Pedido no encontrado"}</p>
        <Button asChild className="mt-4">
          <Link href="/listar-pedidos">
            <ArrowLeft className="size-4" />
            Volver a pedidos
          </Link>
        </Button>
      </div>
    );
  }

  const referenceImages = parseOrderImageList(order.reference);
  const resultImages = parseOrderImageList(order.result);

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("es-PE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getStatusBadgeClassName = (status: string) => {
    switch (status) {
      case "PENDING":
        return "border-amber-500/30 bg-amber-500/15 text-amber-800 dark:text-amber-200";
      case "COMPLETE":
        return "border-green-500/30 bg-green-500/15 text-green-800 dark:text-green-200";
      case "CANCELLED":
        return "";
      default:
        return "";
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

      drawCell(leftX, y, labelCol, rowH, "DNI", true);
      drawCell(
        leftX + labelCol,
        y,
        tableWidth - labelCol,
        rowH,
        order.client_dni ?? "-",
      );
      y += rowH;

      drawCell(leftX, y, labelCol, rowH, "Cliente", true);
      drawCell(
        leftX + labelCol,
        y,
        tableWidth - labelCol,
        rowH,
        order.clientName,
      );
      y += rowH;

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

      drawCell(leftX, y, labelCol, rowH, "Dirección", true);
      drawCell(leftX + labelCol, y, tableWidth - labelCol, rowH, order.address);
      y += rowH;

      const imgAreaH = referenceImages.length > 1 ? 90 : 120;
      drawCell(
        leftX,
        y,
        tableWidth,
        rowH,
        referenceImages.length > 1
          ? "Imágenes referenciales"
          : "Imagen Referencial",
        true,
      );
      y += rowH;

      if (referenceImages.length === 0) {
        drawCell(leftX, y, tableWidth, imgAreaH, "", false);
        y += imgAreaH;
      } else {
        for (let i = 0; i < referenceImages.length; i++) {
          drawCell(leftX, y, tableWidth, imgAreaH, "", false);
          const dataUrl = await getImageAsDataUrl(referenceImages[i]);
          const imgProps = pdf.getImageProperties(dataUrl);
          const maxW = tableWidth - 10;
          const maxH = imgAreaH - 8;
          const ratio = Math.min(maxW / imgProps.width, maxH / imgProps.height);
          const imgW = imgProps.width * ratio;
          const imgH = imgProps.height * ratio;
          const imgX = leftX + (tableWidth - imgW) / 2;
          const imgY = y + (imgAreaH - imgH) / 2;
          pdf.addImage(dataUrl, "JPEG", imgX, imgY, imgW, imgH);
          y += imgAreaH;
          if (i < referenceImages.length - 1) {
            y += 2;
          }
        }
      }

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
    <div className="mx-auto max-w-[800px] p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <Button
          variant="outline"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
            } else {
              router.push("/listar-pedidos");
            }
          }}
        >
          <ArrowLeft className="size-4" />
          Volver a pedidos
        </Button>
        <Button onClick={handlePrintQuote}>
          <Printer className="size-4" />
          Imprimir cotización
        </Button>
      </div>

      <Card className="shadow-md">
        <CardContent className="space-y-6 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-center gap-3 text-center">
            <h1 className="text-3xl font-bold">Recibo N° {order.id}</h1>
            <Badge
              variant={order.status === "CANCELLED" ? "destructive" : "outline"}
              className={cn(
                "px-3 py-1 text-sm font-bold",
                getStatusBadgeClassName(order.status),
              )}
            >
              {getStatusLabel(order.status)}
            </Badge>
          </div>

          {order.status === "COMPLETE" &&
            order.observations &&
            order.observations.trim() !== "" && (
              <Alert className="border-amber-500/50 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                <TriangleAlert className="text-amber-600 dark:text-amber-400" />
                <AlertTitle>
                  Hubo observaciones con este cliente:
                </AlertTitle>
                <AlertDescription className="whitespace-pre-wrap text-amber-900 dark:text-amber-100">
                  {order.observations}
                </AlertDescription>
              </Alert>
            )}

          <Separator />

          <div className="mb-3 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <User className="size-5 text-primary" />
                <span className="text-sm text-muted-foreground">Cliente</span>
              </div>
              <p className="text-lg font-medium">{order.clientName}</p>
            </div>

            {order.phone && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Phone className="size-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Teléfono</span>
                </div>
                <button
                  type="button"
                  onClick={() => openWhatsApp(order.phone!)}
                  className="text-left text-lg font-medium text-primary hover:underline"
                >
                  {order.phone}
                </button>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="size-5 text-primary" />
                <span className="text-sm text-muted-foreground">
                  Fecha del evento
                </span>
              </div>
              <p className="text-lg font-medium">{formatDate(order.date)}</p>
            </div>

            {order.category && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Tags className="size-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Temática</span>
                </div>
                <p className="text-lg font-medium">{order.category.name}</p>
              </div>
            )}

            <div className="col-span-full flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <MapPin className="size-5 text-primary" />
                <span className="text-sm text-muted-foreground">Dirección</span>
              </div>
              <p className="font-medium">{order.address}</p>
            </div>

            {order.description && (
              <div className="col-span-full flex flex-col gap-2">
                <span className="text-sm text-muted-foreground">Descripción</span>
                <p className="whitespace-pre-wrap">{order.description}</p>
              </div>
            )}
          </div>

          {referenceImages.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <ImageIcon className="size-5 text-primary" />
                  <h2 className="text-lg font-bold">
                    {referenceImages.length > 1
                      ? "Imágenes referenciales"
                      : "Imagen referencial"}
                  </h2>
                </div>
                <div className="flex flex-col gap-4">
                  {referenceImages.map((src, index) => (
                    <img
                      key={`${src}-${index}`}
                      src={src}
                      alt={`Referencia ${index + 1}`}
                      className="max-h-[500px] w-full rounded-lg border object-contain"
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {resultImages.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <ImageIcon className="size-5 text-primary" />
                  <h2 className="text-lg font-bold">
                    {resultImages.length > 1
                      ? "Fotos de resultado"
                      : "Foto de resultado"}
                  </h2>
                </div>
                <div className="flex flex-col gap-4">
                  {resultImages.map((src, index) => (
                    <img
                      key={`${src}-${index}`}
                      src={src}
                      alt={`Resultado ${index + 1}`}
                      className="max-h-[500px] w-full rounded-lg border object-contain"
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          <div>
            <h2 className="mb-4 text-lg font-bold">Detalle de pago</h2>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Cotización:</span>
                <span className="text-lg font-bold">
                  S/. {order.price.toFixed(2)}
                </span>
              </div>

              {order.deposit != null && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground">A cuenta:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    S/. {order.deposit.toFixed(2)}
                  </span>
                </div>
              )}

              {order.balance != null && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between rounded-md bg-muted px-4 py-3">
                    <span className="text-lg font-bold">Pendiente:</span>
                    <span className="text-2xl font-bold text-primary">
                      S/. {order.balance.toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
