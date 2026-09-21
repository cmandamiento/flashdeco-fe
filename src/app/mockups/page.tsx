"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowDown, ArrowUp, Copy, Eye, Minus, Plus, RotateCcw, RotateCw, Trash2, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const KEY = "flashdeco_mockup_v1";
const PALETTE_KEY = "flashdeco_mockup_palette_v1";
const catalog = [
  { name: "Globo", icon: "🎈" }, { name: "Globos", icon: "🎉" },
  { name: "Flor", icon: "🌸" }, { name: "Planta", icon: "🪴" },
  { name: "Regalo", icon: "🎁" }, { name: "Pastel", icon: "🎂" },
  { name: "Corazón", icon: "💗" }, { name: "Estrella", icon: "⭐" },
  { name: "Lazo", icon: "🎀" }, { name: "Brillos", icon: "✨" },
] as const;
const imageCatalog = [
  { name: "Arco", image: "arco", ratio: 1536 / 1024, tintable: true },
  { name: "Burbuja", image: "burbuja", ratio: 1, tintable: true },
  { name: "Globos", image: "globo", ratio: 1099 / 1431, tintable: true },
  { name: "Aplique", image: "aplique", ratio: 1223 / 1286, tintable: true },
  { name: "Mesa", image: "mesa", ratio: 1536 / 1024, tintable: false },
  { name: "Mesa 2", image: "mesa-2", ratio: 1536 / 1024, tintable: false },
  { name: "Mesa 3", image: "mesa-3", ratio: 1536 / 1024, tintable: false },
  { name: "Mesa 4", image: "mesa-4", ratio: 1536 / 1024, tintable: false },
  { name: "Happy Birthday", image: "happy", ratio: 887 / 1774, tintable: false },
  { name: "Shimmer", image: "shimmer", ratio: 2004 / 686, tintable: true },
] as const;
type Item = { id: string; icon?: string; image?: string; name: string; x: number; y: number; size: number; rotation: number; color?: string };
type Drag = { id: string; pointerId: number; dx: number; dy: number; recorded: boolean };
type Snapshot = { items: Item[]; selectedId: string | null; palette: string[] };
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function validItem(value: unknown): value is Item {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<Item>;
  return typeof v.id === "string" && (catalog.some((c) => c.icon === v.icon && c.name === v.name) || imageCatalog.some((c) => c.image === v.image && c.name === v.name)) &&
    typeof v.x === "number" && Number.isFinite(v.x) && typeof v.y === "number" && Number.isFinite(v.y) &&
    typeof v.size === "number" && Number.isFinite(v.size) &&
    (v.rotation === undefined || (typeof v.rotation === "number" && Number.isFinite(v.rotation)));
}

function ItemArtwork({ item }: { item: Item }) {
  const imageEntry = imageCatalog.find((entry) => entry.image === item.image);
  if (!imageEntry) return <>{item.icon}</>;
  if (imageEntry.image === "shimmer") return <span className="pointer-events-none relative block size-full" style={{ backgroundColor: item.color || "#ffffff" }} aria-hidden="true">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src="/mockup/shimmer.webp?v=2" alt="" draggable={false} className="absolute inset-0 size-full mix-blend-multiply" />
  </span>;
  if (imageEntry.tintable) return <span className="pointer-events-none relative block size-full" aria-hidden="true">
    <span className="absolute inset-0" style={{ backgroundColor: item.color || "#ffffff", maskImage: `url(/mockup/${imageEntry.image}-mask.webp)`, maskSize: "100% 100%", maskRepeat: "no-repeat" }} />
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={`/mockup/${imageEntry.image}-base.webp`} alt="" draggable={false} className="absolute inset-0 size-full" />
  </span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/mockup/${imageEntry.image}.webp`} alt="" draggable={false} className="pointer-events-none size-full" />
  );
}

export default function MockupsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [palette, setPalette] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);
  const board = useRef<HTMLDivElement>(null);
  const previewBoard = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const colorEdit = useRef(false);

  useEffect(() => {
    let savedItems: Item[] = [];
    let savedPalette: string[] = [];
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (Array.isArray(saved)) savedItems = saved.filter(validItem).map((v) => ({ ...v, x: clamp(v.x, 0, 100), y: clamp(v.y, 0, 100), size: clamp(v.size, 36, 480), rotation: typeof v.rotation === "number" ? ((v.rotation % 360) + 360) % 360 : 0, color: typeof v.color === "string" && /^#[0-9a-f]{6}$/i.test(v.color) ? v.color : "#ffffff" }));
    } catch { /* Ignore damaged browser storage. */ }
    try {
      const saved = JSON.parse(localStorage.getItem(PALETTE_KEY) || "[]");
      if (Array.isArray(saved)) savedPalette = [...new Set(saved.filter((color): color is string => typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color)).map((color) => color.toLowerCase()))].slice(0, 6);
    } catch { /* Ignore damaged browser storage. */ }
    const timer = window.setTimeout(() => { setItems(savedItems); setPalette(savedPalette); setReady(true); }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(KEY, JSON.stringify(items)); }, [items, ready]);
  useEffect(() => { if (ready) localStorage.setItem(PALETTE_KEY, JSON.stringify(palette)); }, [palette, ready]);
  useEffect(() => {
    if (!previewOpen || !previewBoard.current) return;
    const node = previewBoard.current;
    const observer = new ResizeObserver(() => setPreviewScale(node.clientWidth / (board.current?.clientWidth || node.clientWidth)));
    observer.observe(node);
    return () => observer.disconnect();
  }, [previewOpen]);

  const selected = items.find((v) => v.id === selectedId);
  const record = () => setHistory((current) => [...current.slice(-49), { items, selectedId, palette }]);
  const undo = () => {
    const previous = history[history.length - 1];
    if (!previous) return;
    setItems(previous.items);
    setSelectedId(previous.selectedId);
    setPalette(previous.palette);
    setHistory((current) => current.slice(0, -1));
    colorEdit.current = false;
  };
  const add = (entry: (typeof catalog)[number]) => {
    const item = { ...entry, id: crypto.randomUUID(), x: 50 + (items.length % 5) * 4 - 8, y: 50 + (items.length % 4) * 4 - 6, size: 72, rotation: 0 };
    record();
    setItems((current) => [...current, item]);
    setSelectedId(item.id);
  };
  const addImage = (entry: (typeof imageCatalog)[number]) => {
    const item: Item = { ...entry, id: crypto.randomUUID(), x: 50, y: 50, size: entry.image === "shimmer" ? 180 : entry.image === "arco" ? 375 : 150, rotation: 0, color: "#ffffff" };
    record();
    setItems((current) => [...current, item]);
    setSelectedId(item.id);
  };
  const duplicate = () => {
    if (!selected) return;
    const copy: Item = {
      ...selected,
      id: crypto.randomUUID(),
      x: selected.x <= 94 ? selected.x + 6 : selected.x - 6,
      y: selected.y <= 94 ? selected.y + 6 : selected.y - 6,
    };
    record();
    setItems((current) => [...current, copy]);
    setSelectedId(copy.id);
  };
  const resize = (amount: number) => { record(); setItems((current) => current.map((v) => v.id === selectedId ? { ...v, size: clamp(v.size + amount, 36, 480) } : v)); };
  const recolor = (color: string) => {
    if (!colorEdit.current) { record(); colorEdit.current = true; }
    setItems((current) => current.map((v) => v.id === selectedId ? { ...v, color } : v));
  };
  const choosePaletteColor = (color: string) => {
    if (!selected || selected.color?.toLowerCase() === color) return;
    record();
    setItems((current) => current.map((item) => item.id === selectedId ? { ...item, color } : item));
  };
  const savePaletteColor = () => {
    if (!selected || palette.length >= 6) return;
    const color = (selected.color || "#ffffff").toLowerCase();
    if (palette.includes(color)) return;
    record();
    setPalette((current) => [...current, color]);
  };
  const removePaletteColor = (color: string) => {
    record();
    setPalette((current) => current.filter((entry) => entry !== color));
  };
  const rotate = (amount: number) => { record(); setItems((current) => current.map((v) => v.id === selectedId ? { ...v, rotation: (v.rotation + amount + 360) % 360 } : v)); };
  const layer = (step: number) => { record(); setItems((current) => {
    const index = current.findIndex((v) => v.id === selectedId);
    const next = index + step;
    if (index < 0 || next < 0 || next >= current.length) return current;
    const copy = [...current];
    [copy[index], copy[next]] = [copy[next], copy[index]];
    return copy;
  }); };
  const start = (event: React.PointerEvent<HTMLButtonElement>, item: Item) => {
    if (!board.current) return;
    const rect = board.current.getBoundingClientRect();
    drag.current = { id: item.id, pointerId: event.pointerId, dx: event.clientX - rect.left - rect.width * item.x / 100, dy: event.clientY - rect.top - rect.height * item.y / 100, recorded: false };
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(item.id);
  };
  const move = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId || !board.current) return;
    const rect = board.current.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left - drag.current.dx) / rect.width * 100, 0, 100);
    const y = clamp((event.clientY - rect.top - drag.current.dy) / rect.height * 100, 0, 100);
    if (!drag.current.recorded) { record(); drag.current.recorded = true; }
    const id = drag.current.id;
    setItems((current) => current.map((v) => v.id === id ? { ...v, x, y } : v));
  };
  const stop = (event: React.PointerEvent<HTMLButtonElement>) => { if (drag.current?.pointerId === event.pointerId) drag.current = null; };

  return <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
    <div>
      <Link href="/" className="mb-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"><ArrowLeft className="size-4" />Inicio</Link>
      <h1 className="text-3xl font-bold">Creador de mockups</h1>
      <p className="mt-1 text-sm text-muted-foreground">Toca un elemento del menú inferior para agregarlo. Arrástralo sobre la página para acomodarlo.</p>
    </div>
    <div className="sticky top-2 z-20 flex w-full flex-wrap items-center gap-2 rounded-xl border bg-card/95 p-3 shadow-lg backdrop-blur-sm" aria-label="Controles del mockup">
      <Button className="shrink-0" variant="outline" size="sm" onClick={undo} disabled={history.length === 0}><Undo2 className="size-4" />Deshacer</Button>
      <Button className="shrink-0" variant="outline" size="sm" onClick={() => setPreviewOpen(true)}><Eye className="size-4" />Preview</Button>
      {selected && <>
      <span className="mr-2 shrink-0 whitespace-nowrap text-sm font-medium">{selected.name}</span>
      <Button className="shrink-0" variant="outline" size="sm" onClick={duplicate}><Copy className="size-4" />Duplicar</Button>
      <Button className="shrink-0" variant="outline" size="icon-sm" onClick={() => resize(-12)} disabled={selected.size <= 36} aria-label="Reducir tamaño" title="Reducir tamaño"><Minus className="size-4" /></Button>
      <Button className="shrink-0" variant="outline" size="icon-sm" onClick={() => resize(12)} disabled={selected.size >= 480} aria-label="Agrandar" title="Agrandar"><Plus className="size-4" /></Button>
      {imageCatalog.some((entry) => entry.image === selected.image && entry.tintable) && <>
        <label className="flex shrink-0 items-center gap-2 whitespace-nowrap text-sm">Color libre <input type="color" value={selected.color || "#ffffff"} onChange={(e) => recolor(e.target.value)} onBlur={() => { colorEdit.current = false; }} aria-label={`Color de ${selected.name}`} className="size-9 cursor-pointer rounded border bg-transparent p-0.5" /></label>
        <span className="shrink-0 text-sm text-muted-foreground">Paleta {palette.length}/6</span>
        {palette.map((color) => <span key={color} className="relative shrink-0">
          <button type="button" onClick={() => choosePaletteColor(color)} aria-label={`Aplicar color ${color}`} title={`Aplicar ${color}`} className={`size-8 rounded-md border-2 ${selected.color?.toLowerCase() === color ? "border-primary ring-2 ring-primary/30" : "border-border"}`} style={{ backgroundColor: color }} />
          <button type="button" onClick={() => removePaletteColor(color)} aria-label={`Quitar ${color} de la paleta`} title="Quitar de la paleta" className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-foreground text-background"><X className="size-3" /></button>
        </span>)}
        <Button className="shrink-0" variant="outline" size="icon-sm" onClick={savePaletteColor} disabled={palette.length >= 6 || palette.includes((selected.color || "#ffffff").toLowerCase())} aria-label="Guardar color actual en la paleta" title="Guardar color actual en la paleta"><Plus className="size-4" /></Button>
      </>}
      <Button className="shrink-0" variant="outline" size="icon-sm" onClick={() => rotate(-15)} aria-label="Girar 15 grados a la izquierda" title="Girar a la izquierda"><RotateCcw className="size-4" /></Button>
      <span className="min-w-10 shrink-0 text-center text-sm tabular-nums" aria-label={`Rotación: ${selected.rotation} grados`}>{selected.rotation}°</span>
      <Button className="shrink-0" variant="outline" size="icon-sm" onClick={() => rotate(15)} aria-label="Girar 15 grados a la derecha" title="Girar a la derecha"><RotateCw className="size-4" /></Button>
      <Button className="shrink-0" variant="outline" size="sm" onClick={() => layer(-1)} disabled={items[0]?.id === selected.id}><ArrowDown className="size-4" />Atrás</Button>
      <Button className="shrink-0" variant="outline" size="sm" onClick={() => layer(1)} disabled={items[items.length - 1]?.id === selected.id}><ArrowUp className="size-4" />Adelante</Button>
      <Button className="shrink-0" variant="destructive" size="icon-sm" onClick={() => { record(); setItems((current) => current.filter((v) => v.id !== selected.id)); setSelectedId(null); }} aria-label="Eliminar elemento" title="Eliminar elemento"><Trash2 className="size-4" /></Button>
      </>}
    </div>
    <div className="rounded-2xl border bg-muted/50 p-3 sm:p-6">
      <div ref={board} onPointerDown={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }} className="relative mx-auto aspect-[4/3] w-full max-w-4xl overflow-hidden rounded-sm bg-white shadow-md" aria-label="Página del mockup">
        {items.length === 0 && <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-gray-400">Tu página está vacía. Elige una decoración del menú de abajo.</p>}
        {items.map((item) => {
          const imageEntry = imageCatalog.find((entry) => entry.image === item.image);
          return <button key={item.id} type="button" title={item.name} aria-label={`${item.name}: arrastrar para mover`}
          onPointerDown={(e) => start(e, item)} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop}
          className={`absolute flex items-center justify-center rounded-md select-none touch-none ${selectedId === item.id ? "outline-2 outline-dashed outline-primary" : "hover:outline-1 hover:outline-gray-300"}`}
          style={{ left: `${item.x}%`, top: `${item.y}%`, width: item.size, height: imageEntry ? item.size * imageEntry.ratio : item.size, fontSize: item.size * .72, lineHeight: 1, transform: `translate(-50%, -50%) rotate(${item.rotation}deg)` }}>
          <ItemArtwork item={item} />
        </button>})}
      </div>
    </div>
    <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
      <DialogContent showCloseButton={false} className="inset-0 top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 items-center justify-center rounded-none border-0 bg-neutral-900 p-4 sm:max-w-none">
        <DialogTitle className="sr-only">Vista previa del mockup</DialogTitle>
        <Button variant="secondary" size="icon" onClick={() => setPreviewOpen(false)} aria-label="Cerrar vista previa" className="absolute top-4 right-4 z-20 rounded-full"><X className="size-5" /></Button>
        <div ref={previewBoard} className="relative aspect-[4/3] overflow-hidden bg-white shadow-2xl" style={{ width: "min(calc(100vw - 2rem), calc((100dvh - 2rem) * 4 / 3))" }} aria-label="Diseño completo">
          {items.map((item) => {
            const imageEntry = imageCatalog.find((entry) => entry.image === item.image);
            return <div key={item.id} className="absolute flex items-center justify-center" style={{ left: `${item.x}%`, top: `${item.y}%`, width: item.size * previewScale, height: item.size * previewScale * (imageEntry?.ratio || 1), fontSize: item.size * previewScale * .72, lineHeight: 1, transform: `translate(-50%, -50%) rotate(${item.rotation}deg)` }}><ItemArtwork item={item} /></div>;
          })}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-flash.png" alt="FlashDeco" className="pointer-events-none absolute top-1/2 left-1/2 z-10 w-1/3 -translate-x-1/2 -translate-y-1/2 opacity-30" />
        </div>
      </DialogContent>
    </Dialog>
    <div className="rounded-xl border bg-card p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-semibold">Elementos</h2>
        {items.length > 0 && <Button variant="ghost" size="sm" onClick={() => { if (window.confirm("¿Vaciar toda la página?")) { record(); setItems([]); setSelectedId(null); } }}>Vaciar página</Button>}</div>
      <h3 className="mb-2 text-sm font-medium">Tus imágenes</h3>
      <div className="flex gap-2 overflow-x-auto pb-2">{imageCatalog.map((entry) => <button key={entry.image} type="button" onClick={() => addImage(entry)} aria-label={`Agregar ${entry.name}`}
        className="flex min-w-24 shrink-0 flex-col items-center gap-1 rounded-lg border px-3 py-2 transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/mockup/${entry.image}.webp${entry.image === "shimmer" ? "?v=2" : ""}`} alt="" className="h-12 w-16 object-contain" /><span className="text-xs">{entry.name}</span></button>)}</div>
      <h3 className="mt-4 mb-2 text-sm font-medium">Otros elementos</h3>
      <div className="flex gap-2 overflow-x-auto pb-2">{catalog.map((entry) => <button key={entry.name} type="button" onClick={() => add(entry)} aria-label={`Agregar ${entry.name}`}
        className="flex min-w-20 shrink-0 flex-col items-center gap-1 rounded-lg border px-3 py-2 transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary"><span className="text-3xl" aria-hidden="true">{entry.icon}</span><span className="text-xs">{entry.name}</span></button>)}</div>
    </div>
    <p className="text-xs text-muted-foreground">El diseño se guarda automáticamente en este navegador.</p>
  </div>;
}
