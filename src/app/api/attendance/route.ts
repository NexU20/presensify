import { NextRequest, NextResponse } from "next/server";

import {
  ATTENDANCE_STATUS,
  DEFAULT_LOCATION,
  clearSessionCookie,
  readSessionFromRequest,
  submitAttendance,
  writeSessionCookie,
} from "@/lib/presensi";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = readSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      {
        ok: false,
        message: "Session login belum ada. Login dulu sebelum upload foto.",
      },
      { status: 401 },
    );
  }

  const formData = await request.formData();
  const lokasiValue = formData.get("lokasi");
  const alasanValue = formData.get("alasan");
  const foto = formData.get("foto");

  if (!(foto instanceof File) || foto.size === 0) {
    return NextResponse.json(
      {
        ok: false,
        message: "Foto presensi wajib dipilih terlebih dulu.",
      },
      { status: 400 },
    );
  }

  if (foto.type !== "image/webp") {
    return NextResponse.json(
      {
        ok: false,
        message: "Foto harus berformat .webp hasil konversi aplikasi.",
      },
      { status: 400 },
    );
  }

  const lokasi =
    typeof lokasiValue === "string" && lokasiValue.trim()
      ? lokasiValue.trim()
      : DEFAULT_LOCATION;
  const alasan =
    typeof alasanValue === "string" ? alasanValue.trim() : "";

  try {
    const result = await submitAttendance(session, {
      alasan,
      foto,
      lokasi,
    });

    const response = NextResponse.json({
      ok: result.success,
      message: result.success
        ? "Request presensi sudah dikirim ke target."
        : "Target menolak atau tidak memproses request presensi.",
      redirectTo: result.redirectTo,
      status: ATTENDANCE_STATUS,
      upstreamBody: result.bodySnippet,
      upstreamStatus: result.status,
    });

    writeSessionCookie(response, request, result.session);
    return response;
  } catch (error) {
    const response = NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal mengirim request presensi ke target.",
      },
      { status: 401 },
    );
    clearSessionCookie(response, request);
    return response;
  }
}
