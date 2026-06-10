"use client";

import { MoreVertical, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StarRating } from "@/components/ui/star-rating";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { API_BASE_URL } from "@/lib/config";
import { getAuthHeaders } from "@/lib/auth";
import { formatPhone, getWhatsAppUrl } from "@/lib/phone";

type Client = {
  id: number;
  dni: string;
  full_name: string;
  phone: string | null;
  order_count?: number;
  rating?: number | null;
};

function PhoneCell({ phone }: { phone: string | null }) {
  const formatted = formatPhone(phone);
  const whatsappUrl = phone ? getWhatsAppUrl(phone) : null;

  if (!formatted) return <>—</>;
  if (!whatsappUrl) return <>{formatted}</>;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline"
    >
      {formatted}
    </a>
  );
}

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
        toast.success("Cliente actualizado correctamente.");
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
        toast.success("Cliente guardado correctamente.");
      }
      closeModal();
      await fetchClients();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <PageHeader
        title="Clientes"
        backHref="/"
        backLabel="Volver"
        action={
          <Button onClick={() => openModal()}>
            <Plus className="size-4" />
            Agregar cliente
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {error && (
            <p className="p-4 text-sm text-destructive">{error}</p>
          )}
          {loading ? (
            <p className="p-6 text-muted-foreground">Cargando clientes...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>DNI</TableHead>
                  <TableHead>Nombres completos</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead className="text-center">Nro de pedidos</TableHead>
                  <TableHead className="text-center">Estrellas</TableHead>
                  <TableHead className="w-14 text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center">
                      <span className="text-muted-foreground">
                        No hay clientes registrados
                      </span>
                    </TableCell>
                  </TableRow>
                ) : (
                  clients.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.dni}</TableCell>
                      <TableCell>{row.full_name}</TableCell>
                      <TableCell>
                        <PhoneCell phone={row.phone} />
                      </TableCell>
                      <TableCell className="text-center">
                        {row.order_count ?? 0}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <StarRating
                            value={row.rating ?? 0}
                            readOnly
                            size="sm"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-12"
                              aria-label="Acciones"
                            >
                              <MoreVertical className="size-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/listar-pedidos?dni=${row.dni}&status=all`}
                              >
                                Ver pedidos
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openModal(row)}>
                              <Pencil className="size-4" />
                              Editar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={modalOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) closeModal();
          else setModalOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId != null ? "Editar cliente" : "Agregar cliente"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="client-dni">DNI (8 dígitos)</Label>
              <Input
                id="client-dni"
                value={dni}
                onChange={(e) => handleDniChange(e.target.value)}
                required
                maxLength={8}
                inputMode="numeric"
                pattern="[0-9]*"
                disabled={editingId != null}
              />
              <p className="text-xs text-muted-foreground">Solo números</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-name">Nombres completos</Label>
              <Input
                id="client-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoFocus={editingId != null}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-phone">Teléfono</Label>
              <Input
                id="client-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !dni || dni.length !== 8 || !fullName.trim()}
            >
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
