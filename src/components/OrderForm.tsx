"use client";

import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useMemo, useEffect } from "react";
import {
  CompleteOrderModal,
  type CompleteOrderPayload,
} from "@/components/CompleteOrderModal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { API_BASE_URL } from "@/lib/config";
import { getAuthHeaders } from "@/lib/auth";
import { parseOrderImageList } from "@/lib/orderImages";
import {
  createExpenseRow,
  expensesToFormRows,
  formatMoney,
  netProfit,
  normalizeExpenseRows,
  parseOrderExpenses,
  sumExpenses,
  type OrderExpenseRow,
} from "@/lib/orderExpenses";
import { cn } from "@/lib/utils";

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
  dni: string;
  clientName: string;
  phone: string;
  date: string;
  address: string;
  description: string;
  quote: string;
  deposit: string;
  categoryId: string;
  referenceUrls?: string[];
  resultUrls?: string[];
  /** @deprecated usar referenceUrls */
  referenceUrl?: string | null;
  /** @deprecated usar resultUrls */
  resultUrl?: string | null;
  observations: string;
  registerPastEvent: boolean;
  status?: string;
  expenses?: { concept: string; price: number }[];
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
  dni: "",
  clientName: "",
  phone: "",
  date: "",
  address: "",
  description: "",
  quote: "",
  deposit: "",
  categoryId: "",
  referenceUrls: [],
  resultUrls: [],
  observations: "",
  registerPastEvent: false,
};

type QuoteCalcLine = { label: string; amount: number };

type YesNoValue = "si" | "no";

function YesNoRadioGroup({
  name,
  legend,
  value,
  onChange,
}: {
  name: string;
  legend: string;
  value: YesNoValue;
  onChange: (value: YesNoValue) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="flex gap-4">
        {(["si", "no"] as const).map((opt) => (
          <label
            key={opt}
            htmlFor={`${name}-${opt}`}
            className="flex cursor-pointer items-center gap-2"
          >
            <input
              id={`${name}-${opt}`}
              type="radio"
              name={name}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
              className="size-4 accent-primary"
            />
            <span className="text-sm">{opt === "si" ? "Sí" : "No"}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

async function uploadImageFiles(files: File[]): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const formData = new FormData();
    formData.append("file", file);
    const uploadRes = await fetch(`${API_BASE_URL}/upload`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "omit",
      body: formData,
    });
    if (!uploadRes.ok) {
      const data = await uploadRes.json().catch(() => null);
      throw new Error(data?.detail || "No se pudo subir una imagen.");
    }
    const { url } = await uploadRes.json();
    urls.push(url);
  }
  return urls;
}

function formatMoneyEs(value: number) {
  return value.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function computeQuoteEstimate(params: {
  screens: number;
  pantallaPersonalizada: boolean;
  foamNuevo: boolean;
  foamPersonalizado: boolean;
  incluyeAlquiler: boolean;
  montoAlquiler: number;
  fueraHuacho: boolean;
}): {
  lines: QuoteCalcLine[];
  subtotal: number;
  porcentaje15: number;
  total: number;
} {
  const lines: QuoteCalcLine[] = [];
  const pantallas = Math.max(0, Math.floor(Number.isFinite(params.screens) ? params.screens : 0));
  const montoPantallas = pantallas * 100;
  lines.push({
    label: `Pantallas (${pantallas} × S/. 100)`,
    amount: montoPantallas,
  });
  let sub = montoPantallas;

  if (params.pantallaPersonalizada) {
    lines.push({
      label: "Pantalla personalizada (gigantografía)",
      amount: 25,
    });
    sub += 25;
  }

  if (params.foamNuevo) {
    lines.push({ label: "Foam nuevo", amount: 25 });
    sub += 30;
  }
  if (params.foamPersonalizado) {
    lines.push({ label: "Foam personalizado", amount: 30 });
    sub += 35;
  }
  if (params.incluyeAlquiler) {
    lines.push({
      label: "Alquiler mobiliario / telas (estimado)",
      amount: params.montoAlquiler,
    });
    sub += params.montoAlquiler;
  }
  if (params.fueraHuacho) {
    lines.push({ label: "Decoración fuera de Huacho", amount: 25 });
    sub += 25;
  }

  const porcentaje15 = sub * 0.15;
  const total = sub * 1.15;
  return { lines, subtotal: sub, porcentaje15, total };
}

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
  const merged = {
    ...defaultInitial,
    ...initialValues,
    referenceUrls:
      initialValues.referenceUrls ??
      parseOrderImageList(
        initialValues.referenceUrl ?? initialValues.referenceUrls,
      ),
    resultUrls:
      initialValues.resultUrls ??
      parseOrderImageList(initialValues.resultUrl ?? initialValues.resultUrls),
  };
  const [dni, setDni] = useState(merged.dni ?? "");
  const [clientName, setClientName] = useState(merged.clientName);
  const [phone, setPhone] = useState(merged.phone);
  const [clientFoundByDni, setClientFoundByDni] = useState(false);
  const [clientLookupLoading, setClientLookupLoading] = useState(false);
  const [date, setDate] = useState(merged.date);
  const [address, setAddress] = useState(merged.address);
  const [description, setDescription] = useState(merged.description);
  const [quote, setQuote] = useState(merged.quote);
  const [deposit, setDeposit] = useState(merged.deposit);
  const [expenseRows, setExpenseRows] = useState<OrderExpenseRow[]>(() =>
    expensesToFormRows(parseOrderExpenses(merged.expenses)),
  );
  const [existingReferenceUrls, setExistingReferenceUrls] = useState<string[]>(
    merged.referenceUrls,
  );
  const [newReferenceFiles, setNewReferenceFiles] = useState<File[]>([]);
  const [referencePreviewUrls, setReferencePreviewUrls] = useState<string[]>(
    [],
  );
  const [existingResultUrls, setExistingResultUrls] = useState<string[]>(
    merged.resultUrls,
  );
  const [newResultFiles, setNewResultFiles] = useState<File[]>([]);
  const [resultPreviewUrls, setResultPreviewUrls] = useState<string[]>([]);
  const [observations, setObservations] = useState(merged.observations ?? "");
  const [categoryId, setCategoryId] = useState(merged.categoryId);
  const [categories, setCategories] = useState<Category[]>([]);
  const [registerPastEvent, setRegisterPastEvent] = useState(
    merged.registerPastEvent,
  );
  const [eventsOnSelectedDate, setEventsOnSelectedDate] = useState<
    OrderEvent[]
  >([]);
  const [eventsDrawerOpen, setEventsDrawerOpen] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryNombre, setCategoryNombre] = useState("");
  const [categoryDescripcion, setCategoryDescripcion] = useState("");
  const [categorySaving, setCategorySaving] = useState(false);
  const [quoteHelpOpen, setQuoteHelpOpen] = useState(false);
  const [qhScreens, setQhScreens] = useState("");
  const [qhPantallaPersonalizada, setQhPantallaPersonalizada] =
    useState<YesNoValue>("no");
  const [qhFoamNuevo, setQhFoamNuevo] = useState<YesNoValue>("no");
  const [qhFoamPers, setQhFoamPers] = useState<YesNoValue>("no");
  const [qhAlquiler, setQhAlquiler] = useState<YesNoValue>("no");
  const [qhAlquilerMonto, setQhAlquilerMonto] = useState("");
  const [qhFueraHuacho, setQhFueraHuacho] = useState<YesNoValue>("no");
  const [qhCalcResult, setQhCalcResult] = useState<{
    lines: QuoteCalcLine[];
    subtotal: number;
    porcentaje15: number;
    total: number;
  } | null>(null);
  const [qhCalcError, setQhCalcError] = useState("");
  const [completePastEventModalOpen, setCompletePastEventModalOpen] =
    useState(false);
  const [pendingReferenceUrls, setPendingReferenceUrls] = useState<string[]>(
    [],
  );
  const [completingPastEvent, setCompletingPastEvent] = useState(false);
  const router = useRouter();

  const fetchCategories = useCallback(async () => {
    const res = await fetch(`${API_BASE_URL}/categories`, {
      headers: getAuthHeaders(),
      credentials: "omit",
    });
    const data = res.ok ? await res.json() : [];
    setCategories(Array.isArray(data) ? data : []);
  }, []);

  const isEdit = mode === "edit";
  const hasExistingReference = existingReferenceUrls.length > 0;
  const referenceRequired = !isEdit || !hasExistingReference;

  const handleDniChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    setDni(digits);
    if (clientFoundByDni) {
      setClientFoundByDni(false);
      setClientName("");
      setPhone("");
    }
  };

  useEffect(() => {
    if (dni.length !== 8) return;
    const abortController = new AbortController();
    setClientLookupLoading(true);
    fetch(`${API_BASE_URL}/clients/by-dni/${dni}`, {
      headers: getAuthHeaders(),
      credentials: "omit",
      signal: abortController.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.id != null) {
          setClientName(data.full_name ?? "");
          setPhone(data.phone ?? "");
          setClientFoundByDni(true);
        } else {
          setClientFoundByDni(false);
          // No alterar nombres ni teléfono si no hay coincidencias
        }
      })
      .catch(() => setClientFoundByDni(false))
      .finally(() => setClientLookupLoading(false));
    return () => abortController.abort();
  }, [dni]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    const objectUrls = newReferenceFiles.map((f) => URL.createObjectURL(f));
    setReferencePreviewUrls([...existingReferenceUrls, ...objectUrls]);
    return () => objectUrls.forEach((u) => URL.revokeObjectURL(u));
  }, [newReferenceFiles, existingReferenceUrls]);

  useEffect(() => {
    const objectUrls = newResultFiles.map((f) => URL.createObjectURL(f));
    setResultPreviewUrls([...existingResultUrls, ...objectUrls]);
    return () => objectUrls.forEach((u) => URL.revokeObjectURL(u));
  }, [newResultFiles, existingResultUrls]);

  useEffect(() => {
    if (!date) {
      setEventsOnSelectedDate([]);
      return;
    }
    setLoadingEvents(true);
    fetch(`${API_BASE_URL}/orders?date=${date}`, {
      headers: getAuthHeaders(),
      credentials: "omit",
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        if (isEdit && orderId) {
          setEventsOnSelectedDate(
            list.filter((o: OrderEvent) => o.id !== orderId),
          );
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

  const expensesPayload = useMemo(
    () => normalizeExpenseRows(expenseRows),
    [expenseRows],
  );
  const expensesTotal = useMemo(
    () => sumExpenses(expensesPayload),
    [expensesPayload],
  );
  const estimatedNetProfit = useMemo(
    () => netProfit(parseFloat(quote) || 0, expensesPayload),
    [quote, expensesPayload],
  );

  const updateExpenseRow = (
    id: string,
    patch: Partial<Pick<OrderExpenseRow, "concept" | "price">>,
  ) => {
    setExpenseRows((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  };

  const removeExpenseRow = (id: string) => {
    setExpenseRows((rows) => {
      const next = rows.filter((row) => row.id !== id);
      return next.length > 0 ? next : [createExpenseRow()];
    });
  };

  const addExpenseRow = () => {
    setExpenseRows((rows) => [...rows, createExpenseRow()]);
  };

  const resetQuoteHelpModal = useCallback(() => {
    setQhScreens("");
    setQhPantallaPersonalizada("no");
    setQhFoamNuevo("no");
    setQhFoamPers("no");
    setQhAlquiler("no");
    setQhAlquilerMonto("");
    setQhFueraHuacho("no");
    setQhCalcResult(null);
    setQhCalcError("");
  }, []);

  const handleQuoteHelpCalculate = () => {
    setQhCalcError("");
    const trimmedScreens = qhScreens.trim();
    const screensNum =
      trimmedScreens === "" ? 0 : parseInt(trimmedScreens, 10);
    if (trimmedScreens !== "" && (Number.isNaN(screensNum) || screensNum < 0)) {
      setQhCalcError("Indica un número válido de pantallas (0 o mayor).");
      return;
    }

    let alquilerMontoVal = 0;
    if (qhAlquiler === "si") {
      const raw = qhAlquilerMonto.trim();
      if (raw === "") {
        setQhCalcError(
          "Indica el costo estimado de alquiler de mobiliario / telas.",
        );
        return;
      }
      alquilerMontoVal = parseFloat(raw.replace(",", "."));
      if (Number.isNaN(alquilerMontoVal) || alquilerMontoVal < 0) {
        setQhCalcError("Indica un monto válido para el alquiler.");
        return;
      }
    }

    const result = computeQuoteEstimate({
      screens: screensNum,
      pantallaPersonalizada: qhPantallaPersonalizada === "si",
      foamNuevo: qhFoamNuevo === "si",
      foamPersonalizado: qhFoamPers === "si",
      incluyeAlquiler: qhAlquiler === "si",
      montoAlquiler: alquilerMontoVal,
      fueraHuacho: qhFueraHuacho === "si",
    });
    setQhCalcResult(result);
  };

  const handleQuoteHelpAccept = () => {
    if (!qhCalcResult) return;
    setQuote(qhCalcResult.total.toFixed(2));
    setQuoteHelpOpen(false);
    resetQuoteHelpModal();
  };

  const handleQuoteHelpDecline = () => {
    setQuoteHelpOpen(false);
    resetQuoteHelpModal();
  };

  const minDate = useMemo(() => new Date().toISOString().split("T")[0], []);

  const handleCompletePastEvent = async ({
    observations: completeObservations,
    clientRating,
  }: CompleteOrderPayload) => {
    setCompletingPastEvent(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        credentials: "omit",
        body: JSON.stringify({
          dni: dni.length === 8 ? dni : undefined,
          clientName,
          phone: phone || null,
          date,
          address,
          description: description || null,
          price: parseFloat(quote) || 0,
          deposit: parseFloat(deposit) || 0,
          balance,
          status: "COMPLETE",
          reference: pendingReferenceUrls,
          observations: completeObservations || null,
          client_rating: clientRating,
          category_id: categoryId ? Number(categoryId) : null,
          expenses: expensesPayload,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.detail || "No se pudo guardar el pedido.");
        return;
      }
      setCompletePastEventModalOpen(false);
      router.push("/listar-pedidos?created=true");
    } catch {
      setError("Error de conexión con el backend.");
    } finally {
      setCompletingPastEvent(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!clientName || !phone || !date || !address || !categoryId || !quote) {
      setError(
        "Completa todos los campos obligatorios: nombre, teléfono, dirección, fecha, temática y cotización.",
      );
      return;
    }

    if (
      referenceRequired &&
      newReferenceFiles.length === 0 &&
      existingReferenceUrls.length === 0
    ) {
      setError("Agrega al menos una imagen referencial.");
      return;
    }

    if (!registerPastEvent && merged.status !== "COMPLETE" && date < minDate) {
      setError(
        "La fecha no puede ser anterior a hoy. Marca «Registrar evento pasado» si deseas usar una fecha pasada.",
      );
      return;
    }

    setLoading(true);
    try {
      let referenceUrls: string[] = [...existingReferenceUrls];
      if (newReferenceFiles.length > 0) {
        try {
          const uploaded = await uploadImageFiles(newReferenceFiles);
          referenceUrls = [...referenceUrls, ...uploaded];
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo subir la imagen referencial.",
          );
          setLoading(false);
          return;
        }
      }

      if (isEdit && orderId != null) {
        let resultUrls: string[] = [...existingResultUrls];
        if (newResultFiles.length > 0) {
          try {
            const uploaded = await uploadImageFiles(newResultFiles);
            resultUrls = [...resultUrls, ...uploaded];
          } catch (err) {
            setError(
              err instanceof Error
                ? err.message
                : "No se pudo subir la imagen de resultado.",
            );
            setLoading(false);
            return;
          }
        }
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          credentials: "omit",
          body: JSON.stringify({
            dni: dni.length === 8 ? dni : undefined,
            clientName,
            phone: phone || null,
            date,
            address,
            description: description || null,
            price: parseFloat(quote) || 0,
            deposit: parseFloat(deposit) || 0,
            balance,
            status: merged.status || "PENDING",
            reference: referenceUrls,
            result: resultUrls,
            observations: observations.trim() || null,
            category_id: categoryId ? Number(categoryId) : null,
            expenses: expensesPayload,
          }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          setError(data?.detail || "No se pudo actualizar el pedido.");
          return;
        }
      } else if (registerPastEvent) {
        setPendingReferenceUrls(referenceUrls);
        setCompletePastEventModalOpen(true);
        setLoading(false);
        return;
      } else {
        const response = await fetch(`${API_BASE_URL}/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          credentials: "omit",
          body: JSON.stringify({
            dni: dni.length === 8 ? dni : undefined,
            clientName,
            phone: phone || null,
            date,
            address,
            description: description || null,
            price: parseFloat(quote) || 0,
            deposit: parseFloat(deposit) || 0,
            balance,
            status: "PENDING",
            reference: referenceUrls,
            category_id: categoryId ? Number(categoryId) : null,
            expenses: expensesPayload,
          }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          setError(data?.detail || "No se pudo guardar el pedido.");
          return;
        }
      }

      if (mode === "create") {
        router.push("/listar-pedidos?created=true");
      } else {
        setSuccess(true);
        onSuccess?.();
      }
    } catch {
      setError("Error de conexión con el backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {clientLookupLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/50 text-white">
          <Loader2 className="size-8 animate-spin" />
          <p className="text-base">Buscando cliente...</p>
        </div>
      )}

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {error && (
              <Alert variant="destructive" className="col-span-full">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && mode === "edit" && (
              <Alert className="col-span-full border-green-200 bg-green-50 text-green-900">
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="dni">DNI (8 dígitos, opcional)</Label>
              <Input
                id="dni"
                value={dni}
                onChange={(e) => handleDniChange(e.target.value)}
                maxLength={8}
                inputMode="numeric"
              />
              <p className="text-xs text-muted-foreground">
                Al ingresar 8 dígitos se busca el cliente automáticamente
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientName">Nombre del cliente</Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
                readOnly={clientFoundByDni}
              />
              {clientFoundByDni && (
                <p className="text-xs text-muted-foreground">
                  Cliente encontrado por DNI
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Fecha</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={
                  registerPastEvent || merged.status === "COMPLETE"
                    ? undefined
                    : minDate
                }
                required
              />
              <p className="text-xs text-muted-foreground">
                {registerPastEvent
                  ? "Se permiten fechas pasadas"
                  : "No se permiten fechas pasadas"}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Checkbox
                  id="registerPastEvent"
                  checked={registerPastEvent}
                  onCheckedChange={(checked) =>
                    setRegisterPastEvent(checked === true)
                  }
                />
                <Label htmlFor="registerPastEvent" className="cursor-pointer font-normal">
                  Registrar evento pasado
                </Label>
              </div>
              {loadingEvents && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Buscando eventos...
                </p>
              )}
              {!loadingEvents && eventsOnSelectedDate.length > 0 && (
                <Alert
                  className="mt-3 cursor-pointer border-blue-200 bg-blue-50 transition-colors hover:bg-blue-100"
                  onClick={() => setEventsDrawerOpen(true)}
                >
                  <AlertDescription>
                    Tienes {eventsOnSelectedDate.length} evento(s) registrados ese
                    día, click aquí para mostrarlos
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="col-span-full space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>

            <div className="col-span-full space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalle del pedido..."
              />
            </div>

            <div className="col-span-full space-y-2">
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="category">Temática</Label>
                  <Select
                    value={categoryId || undefined}
                    onValueChange={setCategoryId}
                    required
                  >
                    <SelectTrigger id="category" className="w-full">
                      <SelectValue placeholder="Seleccionar temática" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Agregar temática"
                  onClick={() => {
                    setCategoryNombre("");
                    setCategoryDescripcion("");
                    setCategoryModalOpen(true);
                  }}
                >
                  <Plus className="size-4" />
                </Button>
              </div>

              <Dialog
                open={categoryModalOpen}
                onOpenChange={(open) => {
                  if (!open && !categorySaving) setCategoryModalOpen(false);
                }}
              >
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Agregar temática</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="categoryNombre">Nombre</Label>
                      <Input
                        id="categoryNombre"
                        value={categoryNombre}
                        onChange={(e) => setCategoryNombre(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="categoryDescripcion">Descripción</Label>
                      <Textarea
                        id="categoryDescripcion"
                        value={categoryDescripcion}
                        onChange={(e) => setCategoryDescripcion(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCategoryModalOpen(false)}
                      disabled={categorySaving}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      disabled={categorySaving || !categoryNombre.trim()}
                      onClick={async () => {
                        if (!categoryNombre.trim()) return;
                        setCategorySaving(true);
                        try {
                          const res = await fetch(`${API_BASE_URL}/categories`, {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              ...getAuthHeaders(),
                            },
                            credentials: "omit",
                            body: JSON.stringify({
                              name: categoryNombre.trim(),
                              description: categoryDescripcion.trim() || null,
                            }),
                          });
                          if (!res.ok) throw new Error("No se pudo guardar");
                          const newCat = await res.json();
                          await fetchCategories();
                          setCategoryId(String(newCat.id));
                          setCategoryModalOpen(false);
                        } catch {
                          setError("No se pudo crear la temática");
                        } finally {
                          setCategorySaving(false);
                        }
                      }}
                    >
                      {categorySaving ? "Guardando..." : "Guardar"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="col-span-full space-y-2">
              <Label>
                Imágenes referenciales
                {referenceRequired && (
                  <span className="text-destructive"> *</span>
                )}
              </Label>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full",
                  referencePreviewUrls.length === 0 &&
                    referenceRequired &&
                    "border-destructive text-destructive hover:bg-destructive/10",
                )}
                asChild
              >
                <label className="cursor-pointer">
                  <Plus className="size-4" />
                  Agregar imágenes
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={(e) => {
                      const picked = Array.from(e.target.files ?? []);
                      if (picked.length) {
                        setNewReferenceFiles((prev) => [...prev, ...picked]);
                      }
                      e.target.value = "";
                    }}
                  />
                </label>
              </Button>
              {referencePreviewUrls.length > 0 && (
                <div className="mt-4 flex flex-col gap-3">
                  {referencePreviewUrls.map((src, index) => {
                    const isExisting = index < existingReferenceUrls.length;
                    return (
                      <div
                        key={`${src}-${index}`}
                        className="relative overflow-hidden rounded-md border"
                      >
                        <img
                          src={src}
                          alt={`Referencia ${index + 1}`}
                          className="block max-h-60 w-full object-contain"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon-sm"
                          aria-label="Quitar imagen referencial"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            if (isExisting) {
                              setExistingReferenceUrls((prev) =>
                                prev.filter((_, i) => i !== index),
                              );
                            } else {
                              const fileIndex =
                                index - existingReferenceUrls.length;
                              setNewReferenceFiles((prev) =>
                                prev.filter((_, i) => i !== fileIndex),
                              );
                            }
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {isEdit && (
              <div className="col-span-full space-y-2">
                <Label>Fotos de resultado final</Label>
                <Button type="button" variant="outline" className="w-full" asChild>
                  <label className="cursor-pointer">
                    <Plus className="size-4" />
                    Agregar fotos de resultado
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={(e) => {
                        const picked = Array.from(e.target.files ?? []);
                        if (picked.length) {
                          setNewResultFiles((prev) => [...prev, ...picked]);
                        }
                        e.target.value = "";
                      }}
                    />
                  </label>
                </Button>
                {resultPreviewUrls.length > 0 && (
                  <div className="mt-4 flex flex-col gap-3">
                    {resultPreviewUrls.map((src, index) => {
                      const isExisting = index < existingResultUrls.length;
                      return (
                        <div
                          key={`${src}-${index}`}
                          className="relative overflow-hidden rounded-md border"
                        >
                          <img
                            src={src}
                            alt={`Resultado ${index + 1}`}
                            className="block max-h-60 w-full object-contain"
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon-sm"
                            aria-label="Quitar imagen de resultado"
                            className="absolute top-2 right-2"
                            onClick={() => {
                              if (isExisting) {
                                setExistingResultUrls((prev) =>
                                  prev.filter((_, i) => i !== index),
                                );
                              } else {
                                const fileIndex =
                                  index - existingResultUrls.length;
                                setNewResultFiles((prev) =>
                                  prev.filter((_, i) => i !== fileIndex),
                                );
                              }
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {isEdit && (
              <div className="col-span-full space-y-2">
                <Label htmlFor="observations">Observaciones</Label>
                <Textarea
                  id="observations"
                  rows={4}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Observaciones sobre el pedido..."
                />
              </div>
            )}

            {!isEdit && (
              <Alert
                className="col-span-full cursor-pointer border-blue-200 bg-blue-50 transition-colors hover:bg-blue-100"
                onClick={() => {
                  resetQuoteHelpModal();
                  setQuoteHelpOpen(true);
                }}
              >
                <AlertTitle>¿Dudas sobre cotización?</AlertTitle>
                <AlertDescription>
                  Abre el asistente para estimar la cotización según pantallas,
                  foam, alquiler y ubicación.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="quote">Cotización S/.</Label>
              <div className="relative">
                <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                  S/.
                </span>
                <Input
                  id="quote"
                  type="number"
                  className="pl-10"
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                  min={0}
                  step={0.01}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deposit">A cuenta S/.</Label>
              <div className="relative">
                <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                  S/.
                </span>
                <Input
                  id="deposit"
                  type="number"
                  className="pl-10"
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value)}
                  min={0}
                  step={0.01}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="balance">Pendiente S/.</Label>
              <div className="relative">
                <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                  S/.
                </span>
                <Input
                  id="balance"
                  className="pl-10"
                  value={balance.toFixed(2)}
                  readOnly
                />
              </div>
            </div>

            <div className="col-span-full space-y-3">
              <Label>Gastos</Label>
              <div className="space-y-2 rounded-md border p-3">
                <div className="hidden gap-2 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[1fr_140px_40px]">
                  <span>Concepto</span>
                  <span className="text-right">Precio (S/.)</span>
                  <span />
                </div>
                {expenseRows.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px_40px] sm:items-center"
                  >
                    <Input
                      placeholder="Concepto"
                      value={row.concept}
                      onChange={(e) =>
                        updateExpenseRow(row.id, { concept: e.target.value })
                      }
                    />
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                      className="sm:text-right"
                      value={row.price}
                      onChange={(e) =>
                        updateExpenseRow(row.id, { price: e.target.value })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9 shrink-0"
                      onClick={() => removeExpenseRow(row.id)}
                      aria-label="Quitar gasto"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={addExpenseRow}
                >
                  <Plus className="size-4" />
                  Agregar gasto
                </Button>
                <Separator />
                <div className="flex flex-col gap-1 text-sm sm:flex-row sm:justify-end sm:gap-8">
                  <p>
                    <span className="text-muted-foreground">Total gastos: </span>
                    <span className="font-medium">S/. {formatMoney(expensesTotal)}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Ganancia neta: </span>
                    <span className="font-semibold">
                      S/. {formatMoney(estimatedNetProfit)}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="col-span-full mt-2 flex gap-4">
              <Button type="submit" disabled={loading}>
                <Save className="size-4" />
                {loading ? savingLabel : submitLabel}
              </Button>
              <Button variant="outline" asChild>
                <Link href={cancelHref}>Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {!isEdit && (
        <Dialog
          open={quoteHelpOpen}
          onOpenChange={(open) => {
            if (!open) handleQuoteHelpDecline();
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <DialogTitle>¿Dudas sobre cotización?</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-5">
              {qhCalcError && (
                <Alert variant="destructive">
                  <AlertDescription>{qhCalcError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="qhScreens">¿Cuántas pantallas tiene?</Label>
                <Input
                  id="qhScreens"
                  type="number"
                  value={qhScreens}
                  onChange={(e) => setQhScreens(e.target.value)}
                  min={0}
                  step={1}
                />
              </div>

              <YesNoRadioGroup
                name="pantalla-personalizada"
                legend="¿Requiere pantalla personalizada? (gigantografía)"
                value={qhPantallaPersonalizada}
                onChange={setQhPantallaPersonalizada}
              />

              <YesNoRadioGroup
                name="foam-nuevo"
                legend="¿Incluye foam nuevo?"
                value={qhFoamNuevo}
                onChange={setQhFoamNuevo}
              />

              <YesNoRadioGroup
                name="foam-pers"
                legend="¿Incluye foam personalizado?"
                value={qhFoamPers}
                onChange={setQhFoamPers}
              />

              <YesNoRadioGroup
                name="alquiler"
                legend="¿Requiere alquiler de mobiliario / telas?"
                value={qhAlquiler}
                onChange={setQhAlquiler}
              />

              {qhAlquiler === "si" && (
                <div className="space-y-2">
                  <Label htmlFor="qhAlquilerMonto">
                    ¿Cuánto es el costo estimado de alquiler?
                  </Label>
                  <div className="relative">
                    <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                      S/.
                    </span>
                    <Input
                      id="qhAlquilerMonto"
                      type="number"
                      className="pl-10"
                      value={qhAlquilerMonto}
                      onChange={(e) => setQhAlquilerMonto(e.target.value)}
                      min={0}
                      step={0.01}
                    />
                  </div>
                </div>
              )}

              <YesNoRadioGroup
                name="fuera-huacho"
                legend="¿La decoración está fuera de Huacho?"
                value={qhFueraHuacho}
                onChange={setQhFueraHuacho}
              />

              <Button type="button" className="w-full" onClick={handleQuoteHelpCalculate}>
                Calcular
              </Button>

              {qhCalcResult && (
                <>
                  <Separator />
                  <p className="text-sm font-semibold">Detalle del cálculo</p>
                  <div className="flex flex-col gap-1.5">
                    {qhCalcResult.lines.map((line, i) => (
                      <div
                        key={`${line.label}-${i}`}
                        className="flex items-baseline justify-between gap-4"
                      >
                        <span className="text-sm text-muted-foreground">
                          {line.label}
                        </span>
                        <span className="shrink-0 text-sm">
                          S/. {formatMoneyEs(line.amount)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between gap-4 pt-2">
                      <span className="text-sm">Subtotal</span>
                      <span className="text-sm">
                        S/. {formatMoneyEs(qhCalcResult.subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-sm">15% sobre el subtotal</span>
                      <span className="text-sm">
                        S/. {formatMoneyEs(qhCalcResult.porcentaje15)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4 pt-2">
                      <span className="font-bold">Total estimado</span>
                      <span className="font-bold">
                        S/. {formatMoneyEs(qhCalcResult.total)}
                      </span>
                    </div>
                  </div>

                  <p className="mt-2 text-sm text-muted-foreground">
                    ¿Está de acuerdo?
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={handleQuoteHelpDecline}>
                      No
                    </Button>
                    <Button type="button" onClick={handleQuoteHelpAccept}>
                      Sí
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Sheet open={eventsDrawerOpen} onOpenChange={setEventsDrawerOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Eventos del {date || "día"}</SheetTitle>
          </SheetHeader>
          <Accordion type="multiple" className="px-1">
            {eventsOnSelectedDate.map((order) => (
              <AccordionItem key={order.id} value={String(order.id)}>
                <AccordionTrigger>
                  <div className="flex flex-col items-start gap-0.5 text-left">
                    <span className="text-sm font-semibold">
                      {order.clientName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {order.category?.name ?? "Sin temática"}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-col gap-2 text-sm">
                    <p>
                      <strong>Cliente:</strong> {order.clientName}
                    </p>
                    {order.phone && (
                      <p>
                        <strong>Teléfono:</strong> {order.phone}
                      </p>
                    )}
                    <p>
                      <strong>Fecha:</strong> {order.date}
                    </p>
                    <p>
                      <strong>Dirección:</strong> {order.address}
                    </p>
                    {order.description && (
                      <p>
                        <strong>Descripción:</strong> {order.description}
                      </p>
                    )}
                    <p>
                      <strong>Cotización:</strong> S/.{" "}
                      {Number(order.price).toFixed(2)}
                    </p>
                    {order.deposit != null && (
                      <p>
                        <strong>A cuenta:</strong> S/.{" "}
                        {Number(order.deposit).toFixed(2)}
                      </p>
                    )}
                    {order.balance != null && (
                      <p>
                        <strong>Pendiente:</strong> S/.{" "}
                        {Number(order.balance).toFixed(2)}
                      </p>
                    )}
                    <p>
                      <strong>Estado:</strong> {order.status}
                    </p>
                    {order.category && (
                      <p>
                        <strong>Temática:</strong> {order.category.name}
                      </p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </SheetContent>
      </Sheet>

      <CompleteOrderModal
        open={completePastEventModalOpen}
        onClose={() => {
          if (!completingPastEvent) setCompletePastEventModalOpen(false);
        }}
        onConfirm={handleCompletePastEvent}
        confirming={completingPastEvent}
        clientName={clientName}
        clientDni={dni.length === 8 ? dni : null}
        confirmLabel="Registrar evento completado"
      />
    </>
  );
}
