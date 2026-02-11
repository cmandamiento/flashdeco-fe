import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "decorapp-auth";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, password } = body;

  // Validación simple para demo - acepta cualquier credencial no vacía
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email y contraseña son requeridos" },
      { status: 400 }
    );
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(AUTH_COOKIE, "authenticated", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 horas
    path: "/",
  });

  return response;
}
