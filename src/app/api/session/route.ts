import { NextRequest, NextResponse } from "next/server";

import {
  clearSessionCookie,
  loginAndCreateSession,
  readSessionFromRequest,
  verifySession,
  writeSessionCookie,
} from "@/lib/presensi";

export const runtime = "nodejs";

type LoginBody = {
  nim?: string;
  password?: string;
};

export async function GET(request: NextRequest) {
  const session = readSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({
      loggedIn: false,
      message: "Session login belum tersedia.",
    });
  }

  try {
    const refreshedSession = await verifySession(session);
    const response = NextResponse.json({
      loggedIn: true,
      message: "Session target aktif dan siap dipakai.",
    });
    writeSessionCookie(response, request, refreshedSession);
    return response;
  } catch {
    const response = NextResponse.json({
      loggedIn: false,
      message: "Session target sudah tidak valid. Login ulang diperlukan.",
    });
    clearSessionCookie(response, request);
    return response;
  }
}

export async function POST(request: NextRequest) {
  let body: LoginBody;

  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json(
      {
        loggedIn: false,
        message: "Payload login tidak valid.",
      },
      { status: 400 },
    );
  }

  const nim = body.nim?.trim();
  const password = body.password?.trim();

  if (!nim || !password) {
    return NextResponse.json(
      {
        loggedIn: false,
        message: "Username/NIM dan password wajib diisi.",
      },
      { status: 400 },
    );
  }

  try {
    const session = await loginAndCreateSession(nim, password);
    const response = NextResponse.json({
      loggedIn: true,
      message: "Login berhasil. Upload foto dan kirim presensi sekarang aktif.",
    });
    writeSessionCookie(response, request, session);
    return response;
  } catch (error) {
    const response = NextResponse.json(
      {
        loggedIn: false,
        message:
          error instanceof Error
            ? error.message
            : "Login gagal karena error yang tidak terduga.",
      },
      { status: 400 },
    );
    clearSessionCookie(response, request);
    return response;
  }
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({
    loggedIn: false,
    message: "Session login dibersihkan.",
  });
  clearSessionCookie(response, request);
  return response;
}
