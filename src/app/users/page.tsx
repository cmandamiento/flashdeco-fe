"use client";

import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { API_BASE_URL } from "@/lib/config";

export default function UsersPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${API_BASE_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, email, password }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          (typeof data.detail === "string" ? data.detail : data.detail?.[0]?.msg) ||
            "Error al registrar usuario"
        );
        return;
      }

      setSuccess(true);
      setUsername("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          setError("La solicitud tardó demasiado. Verifica que el backend esté corriendo.");
        } else {
          setError("Error de conexión. Intenta de nuevo.");
        }
      } else {
        setError("Error de conexión. Intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 500, mx: "auto" }}>
      <Button
        component={Link}
        href="/"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 3 }}
      >
        Volver
      </Button>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
            <Image
              src="/logo-flash.png"
              alt="FlashDeco"
              width={180}
              height={72}
              priority
            />
          </Box>
          <Typography variant="h5" component="h1" gutterBottom align="center">
            Registrar nuevo usuario
          </Typography>

          {success && (
            <Typography color="success.main" variant="body2" sx={{ mb: 2 }}>
              Usuario registrado correctamente. Puedes iniciar sesión.
            </Typography>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Usuario"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              sx={{ mb: 2 }}
              autoComplete="username"
              required
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 2 }}
              autoComplete="email"
              required
            />
            <TextField
              fullWidth
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 2 }}
              autoComplete="new-password"
              required
              helperText="Mínimo 6 caracteres"
            />
            <TextField
              fullWidth
              label="Confirmar contraseña"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              sx={{ mb: 2 }}
              autoComplete="new-password"
              required
            />

            {error && (
              <Typography color="error" variant="body2" sx={{ mb: 2 }}>
                {error}
              </Typography>
            )}

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              // disabled={loading}
            >
              {loading ? "Registrando..." : "Registrar"}
            </Button>
          </Box>

          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{ mt: 2 }}
          >
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" style={{ color: "inherit" }}>
              Iniciar sesión
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
