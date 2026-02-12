/** URL base del backend. Las llamadas autenticadas usan Authorization: Bearer <token>. */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

/** Rutas que no requieren login (sin AppBar). */
export const PUBLIC_PATHS = ["/login", "/users"];
