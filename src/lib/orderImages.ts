/** Normaliza reference/result del API (legacy string o array JSON). */
export function parseOrderImageList(value: unknown): string[] {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) {
    return value.filter((u): u is string => typeof u === "string" && u.trim() !== "");
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (u): u is string => typeof u === "string" && u.trim() !== "",
          );
        }
      } catch {
        /* legacy single URL */
      }
    }
    return [trimmed];
  }
  return [];
}

export function firstOrderImage(value: unknown): string | null {
  const list = parseOrderImageList(value);
  return list[0] ?? null;
}
