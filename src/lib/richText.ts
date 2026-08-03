/** True si el HTML del editor está vacío (solo párrafo vacío). */
export function isRichTextEmpty(html: string): boolean {
  const trimmed = html.trim();
  if (!trimmed) return true;
  const normalized = trimmed
    .replace(/<p><br><\/p>/gi, "")
    .replace(/<p>\s*<\/p>/gi, "")
    .replace(/<br\s*\/?>/gi, "")
    .trim();
  return normalized === "";
}

export function richTextToPlain(html: string): string {
  if (typeof document === "undefined") return html;
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent ?? "").trim();
}
