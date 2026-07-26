"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ImageOff,
  Loader2,
  X,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import { getAuthHeaders } from "@/lib/auth";
import { parseOrderImageList } from "@/lib/orderImages";
import {
  classifyOrderProfit,
  formatMoney,
  lossReviewMessage,
  lowMarginReviewMessage,
  netProfit,
  parseOrderExpenses,
  type OrderProfitLevel,
} from "@/lib/orderExpenses";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;

type Order = {
  id: number;
  clientName: string;
  date: string;
  price: number;
  result: string | string[] | null;
  status: string;
  expenses?: { concept: string; price: number }[];
  net_profit?: number;
};

function orderNetProfit(order: Order): number {
  if (typeof order.net_profit === "number") return order.net_profit;
  return netProfit(order.price, parseOrderExpenses(order.expenses));
}

const profitLevelStyles: Record<
  OrderProfitLevel,
  { text: string; bg: string; border: string }
> = {
  healthy: {
    text: "text-green-700 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950/40",
    border: "border-green-200 dark:border-green-800",
  },
  low: {
    text: "text-amber-800 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800",
  },
  loss: {
    text: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/40",
    border: "border-red-200 dark:border-red-800",
  },
};

function GalleryProfitBadge({ order }: { order: Order }) {
  const amount = orderNetProfit(order);
  const level = classifyOrderProfit(order.price ?? 0, amount);
  const styles = profitLevelStyles[level];
  const tooltipText =
    level === "low"
      ? lowMarginReviewMessage(amount)
      : level === "loss"
        ? lossReviewMessage(amount)
        : null;

  const badge = (
    <div
      className={cn(
        "rounded-md border px-2 py-1 text-right",
        styles.bg,
        styles.border,
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide opacity-80">
        Ganancia
      </p>
      <p className={cn("text-sm font-bold tabular-nums", styles.text)}>
        S/. {formatMoney(amount)}
      </p>
    </div>
  );

  if (!tooltipText) {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="cursor-help text-left outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          aria-label={tooltipText}
        >
          {badge}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px] text-left leading-snug">
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  );
}

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
  onImageClick: (images: string[], startIndex?: number) => void;
};

function GalleryCard({ order, onImageClick }: GalleryCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const resultImages = parseOrderImageList(order.result);
  const coverImage = resultImages[0] ?? null;
  const hasImage = Boolean(coverImage) && !imageFailed;
  const editHref = `/editar-pedido/${order.id}`;

  return (
    <Card className="flex aspect-square w-full flex-col overflow-hidden">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/50">
        {coverImage && hasImage ? (
          <button
            type="button"
            onClick={() => onImageClick(resultImages, 0)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onImageClick(resultImages, 0);
              }
            }}
            aria-label="Ampliar imagen final"
            className="relative min-h-0 flex-1 cursor-pointer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImage}
              alt={`Imagen final pedido ${order.id} — ${order.clientName}`}
              className="absolute inset-0 block size-full object-cover object-center"
              onError={() => setImageFailed(true)}
            />
          </button>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-4 text-center text-muted-foreground">
            <ImageOff className="size-10 opacity-60" />
            <p className="text-sm">
              {coverImage && imageFailed
                ? "No se pudo cargar la imagen"
                : "No tiene imagen"}
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href={editHref}>Agregar imagen</Link>
            </Button>
          </div>
        )}
      </div>
      <CardContent className="shrink-0 space-y-1.5 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-lg font-extrabold text-primary sm:text-xl">
              {formatPrice(order.price)}
            </p>
            <p className="text-xs text-muted-foreground">Pedido #{order.id}</p>
          </div>
          <GalleryProfitBadge order={order} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function GaleriaPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [modalIndex, setModalIndex] = useState(0);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/orders?status=COMPLETE`, {
        headers: getAuthHeaders(),
        credentials: "omit",
      });
      if (!res.ok) throw new Error("No se pudieron cargar los pedidos");
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setOrders(list.filter((o: Order) => o.status === "COMPLETE"));
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

  const openModal = useCallback((images: string[], startIndex = 0) => {
    if (images.length === 0) return;
    setModalImages(images);
    setModalIndex(Math.min(startIndex, images.length - 1));
  }, []);

  const closeModal = useCallback(() => {
    setModalImages([]);
    setModalIndex(0);
  }, []);

  const modalSrc = modalImages[modalIndex] ?? null;
  const currentPage = Math.min(page, pageCount);

  return (
    <TooltipProvider>
    <div className="mx-auto max-w-6xl p-6">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-primary hover:underline"
      >
        <ArrowLeft className="size-4" />
        Inicio
      </Link>

      <h1 className="mb-2 text-3xl font-bold">Galería</h1>
      <p className="mb-6 text-muted-foreground">
        Solo pedidos finalizados (completados).
      </p>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <p className="text-destructive">{error}</p>
      ) : sortedOrders.length === 0 ? (
        <p className="text-muted-foreground">
          No hay pedidos finalizados para mostrar.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {pagedOrders.map((order) => (
              <GalleryCard
                key={order.id}
                order={order}
                onImageClick={openModal}
              />
            ))}
          </div>

          <div className="mt-8 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage <= 1}
              onClick={() => setPage(1)}
              aria-label="Primera página"
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Página anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="px-3 text-sm text-muted-foreground">
              {currentPage} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              aria-label="Página siguiente"
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage >= pageCount}
              onClick={() => setPage(pageCount)}
              aria-label="Última página"
            >
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </>
      )}

      <Dialog open={modalImages.length > 0} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-4xl p-4 pt-10">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2"
            onClick={closeModal}
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </Button>
          <DialogTitle className="sr-only">Imagen final ampliada</DialogTitle>
          {modalSrc && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={modalSrc}
                alt="Imagen final ampliada"
                className="mx-auto block max-h-[85vh] w-full rounded-md object-contain"
              />
              {modalImages.length > 1 && (
                <div className="mt-4 flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={modalIndex <= 0}
                    onClick={() => setModalIndex((i) => Math.max(0, i - 1))}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {modalIndex + 1} / {modalImages.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={modalIndex >= modalImages.length - 1}
                    onClick={() =>
                      setModalIndex((i) =>
                        Math.min(modalImages.length - 1, i + 1),
                      )
                    }
                  >
                    Siguiente
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}
