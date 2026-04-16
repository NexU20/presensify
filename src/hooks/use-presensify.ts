"use client";

import {
  ChangeEvent,
  FormEvent,
  startTransition,
  useEffect,
  useEffectEvent,
  useState,
} from "react";

import { convertImageToWebp, formatBytes } from "@/lib/image";
import type {
  AttendanceResponse,
  FeedbackTone,
  SessionResponse,
  StatusState,
} from "@/lib/types";
import { DEFAULT_LOCATION } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Return-type sub-interfaces — one per concern (Interface Segregation)  */
/* ------------------------------------------------------------------ */

export type SessionState = {
  sessionReady: boolean;
  sessionChecking: boolean;
  refreshSession: () => void;
  handleLogout: () => void;
};

export type LoginState = {
  nim: string;
  password: string;
  loginLoading: boolean;
  onNimChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  handleLoginSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export type PhotoState = {
  photoFile: File | null;
  photoPreviewUrl: string | null;
  convertingPhoto: boolean;
  handlePhotoChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export type AttendanceState = {
  lokasi: string;
  alasan: string;
  submitLoading: boolean;
  attendanceResult: AttendanceResponse | null;
  onLokasiChange: (value: string) => void;
  onAlasanChange: (value: string) => void;
  handleAttendanceSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export type FeedbackState = {
  feedbackTone: FeedbackTone;
  statusMessage: string;
};

export type DerivedState = {
  controlsLocked: boolean;
  submitDisabled: boolean;
  statusState: StatusState;
};

export type PresensifyHook = {
  session: SessionState;
  login: LoginState;
  photo: PhotoState;
  attendance: AttendanceState;
  feedback: FeedbackState;
  derived: DerivedState;
};

/* ------------------------------------------------------------------ */
/*  Hook implementation                                                */
/* ------------------------------------------------------------------ */

export function usePresensify(): PresensifyHook {
  const [nim, setNim] = useState("");
  const [password, setPassword] = useState("");
  const [lokasi, setLokasi] = useState(DEFAULT_LOCATION);
  const [alasan, setAlasan] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [convertingPhoto, setConvertingPhoto] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Memeriksa session login yang tersimpan...",
  );
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>("info");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [attendanceResult, setAttendanceResult] =
    useState<AttendanceResponse | null>(null);

  /* ---- internal helpers ---- */

  function clearPhotoState() {
    startTransition(() => {
      setAttendanceResult(null);
      setPhotoFile(null);
      setPhotoPreviewUrl((currentUrl) => {
        if (currentUrl) {
          URL.revokeObjectURL(currentUrl);
        }
        return null;
      });
    });
  }

  async function refreshSession() {
    setSessionChecking(true);

    try {
      const response = await fetch("/api/session", {
        cache: "no-store",
      });
      const data = (await response.json()) as SessionResponse;
      setSessionReady(data.loggedIn);
      setStatusMessage(data.message);
      setFeedbackTone(data.loggedIn ? "success" : "info");

      if (!data.loggedIn) {
        clearPhotoState();
      }
    } catch {
      setSessionReady(false);
      setStatusMessage("Gagal memeriksa session. Coba refresh halaman.");
      setFeedbackTone("danger");
      clearPhotoState();
    } finally {
      setSessionChecking(false);
    }
  }

  /* ---- effects ---- */

  const hydrateSession = useEffectEvent(() => {
    void refreshSession();
  });

  useEffect(() => {
    hydrateSession();
  }, []);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  /* ---- event handlers ---- */

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!nim.trim() || !password.trim()) {
      setFeedbackTone("danger");
      setStatusMessage("Username/NIM dan password wajib diisi.");
      return;
    }

    setLoginLoading(true);
    setAttendanceResult(null);

    try {
      const response = await fetch("/api/session", {
        body: JSON.stringify({
          nim: nim.trim(),
          password,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const data = (await response.json()) as SessionResponse;
      setSessionReady(data.loggedIn);
      setStatusMessage(data.message);
      setFeedbackTone(response.ok ? "success" : "danger");

      if (response.ok) {
        setPassword("");
      } else {
        clearPhotoState();
      }
    } catch {
      setSessionReady(false);
      setFeedbackTone("danger");
      setStatusMessage("Request login gagal dikirim dari browser.");
      clearPhotoState();
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleLogout() {
    setSessionChecking(true);

    try {
      const response = await fetch("/api/session", {
        method: "DELETE",
      });
      const data = (await response.json()) as SessionResponse;
      setSessionReady(false);
      setFeedbackTone("info");
      setStatusMessage(data.message);
      clearPhotoState();
    } catch {
      setSessionReady(false);
      setFeedbackTone("danger");
      setStatusMessage("Session lokal gagal dibersihkan.");
    } finally {
      setSessionChecking(false);
    }
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";

    if (!selectedFile) {
      return;
    }

    setConvertingPhoto(true);
    setAttendanceResult(null);
    setFeedbackTone("info");
    setStatusMessage("Foto sedang dikonversi ke .webp...");

    try {
      const webpFile = await convertImageToWebp(selectedFile);
      const previewUrl = URL.createObjectURL(webpFile);

      startTransition(() => {
        setPhotoFile(webpFile);
        setPhotoPreviewUrl((currentUrl) => {
          if (currentUrl) {
            URL.revokeObjectURL(currentUrl);
          }
          return previewUrl;
        });
      });

      setFeedbackTone("success");
      setStatusMessage(
        `Foto siap dipakai. Format otomatis diubah ke .webp (${formatBytes(webpFile.size)}).`,
      );
    } catch (error) {
      clearPhotoState();
      setFeedbackTone("danger");
      setStatusMessage(
        error instanceof Error ? error.message : "Konversi foto gagal.",
      );
    } finally {
      setConvertingPhoto(false);
    }
  }

  async function handleAttendanceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!sessionReady) {
      setFeedbackTone("danger");
      setStatusMessage("Session login belum aktif.");
      return;
    }

    if (!photoFile) {
      setFeedbackTone("danger");
      setStatusMessage("Ambil atau pilih foto dulu sebelum mengirim presensi.");
      return;
    }

    setSubmitLoading(true);
    setAttendanceResult(null);
    setFeedbackTone("info");
    setStatusMessage("Mengirim request presensi ke target...");

    try {
      const payload = new FormData();
      payload.set("lokasi", lokasi.trim() || DEFAULT_LOCATION);
      payload.set("alasan", alasan.trim());
      payload.set("foto", photoFile, photoFile.name);

      const response = await fetch("/api/attendance", {
        body: payload,
        method: "POST",
      });
      const data = (await response.json()) as AttendanceResponse;

      setAttendanceResult(data);
      setFeedbackTone(data.ok ? "success" : "danger");
      setStatusMessage(data.message);

      if (response.status === 401) {
        setSessionReady(false);
        clearPhotoState();
      }
    } catch {
      setFeedbackTone("danger");
      setStatusMessage("Request presensi gagal dikirim dari browser.");
    } finally {
      setSubmitLoading(false);
    }
  }

  /* ---- derived state ---- */

  const controlsLocked =
    !sessionReady || sessionChecking || loginLoading || convertingPhoto;
  const submitDisabled =
    controlsLocked || submitLoading || convertingPhoto || !photoFile;
  const statusState: StatusState = sessionChecking
    ? "checking"
    : sessionReady
      ? "ready"
      : "locked";

  /* ---- return grouped state ---- */

  return {
    session: {
      sessionReady,
      sessionChecking,
      refreshSession: () => void refreshSession(),
      handleLogout: () => void handleLogout(),
    },
    login: {
      nim,
      password,
      loginLoading,
      onNimChange: setNim,
      onPasswordChange: setPassword,
      handleLoginSubmit: (e) => void handleLoginSubmit(e),
    },
    photo: {
      photoFile,
      photoPreviewUrl,
      convertingPhoto,
      handlePhotoChange: (e) => void handlePhotoChange(e),
    },
    attendance: {
      lokasi,
      alasan,
      submitLoading,
      attendanceResult,
      onLokasiChange: setLokasi,
      onAlasanChange: setAlasan,
      handleAttendanceSubmit: (e) => void handleAttendanceSubmit(e),
    },
    feedback: {
      feedbackTone,
      statusMessage,
    },
    derived: {
      controlsLocked,
      submitDisabled,
      statusState,
    },
  };
}
