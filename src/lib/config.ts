/** URL base del backend. Las llamadas autenticadas usan Authorization: Bearer <token>. */
export const API_BASE_URL = "https://app-deco.cesarmandamiento.com";

/** Rutas que no requieren login (sin AppBar). */
export const PUBLIC_PATHS = ["/login", "/users"];
