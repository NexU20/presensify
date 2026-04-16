#!/usr/bin/env python3
"""Otomasi login dan submit presensi ke presensi.ppmuinjkt.com.

Script selalu mengirim status `Hadir`.

Contoh:
    python otomasi_presensi.py ^
        --foto .\foto_absen.webp ^
        --verbose

Nilai login dan lokasi dibaca dari `.env`:
    PRESENSI_NIM=11230910000097
    PRESENSI_PASSWORD=kata-sandi
    PRESENSI_LOKASI=UIN Syarif Hidayatullah, Jalan Haji Limun, RW 08, Pisangan, Ciputat Timur, South Tangerang, Banten, Java, 15419, Indonesia
"""

from __future__ import annotations

import argparse
import contextlib
import html
import mimetypes
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO

import requests

BASE_URL = "https://presensi.ppmuinjkt.com"
LOGIN_URL = f"{BASE_URL}/login"
DASHBOARD_URL = f"{BASE_URL}/dashboard-mahasiswa"
ATTENDANCE_URL = f"{BASE_URL}/dashboard"
ATTENDANCE_STATUS = "Hadir"
DEFAULT_TIMEOUT = 30
DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:149.0) "
    "Gecko/20100101 Firefox/149.0"
)

TOKEN_INPUT_RE = re.compile(
    r'<input[^>]+name=["\']_token["\'][^>]+value=["\']([^"\']+)["\']',
    re.IGNORECASE,
)
META_CSRF_RE = re.compile(
    r'<meta[^>]+name=["\']csrf-token["\'][^>]+content=["\']([^"\']+)["\']',
    re.IGNORECASE,
)


@dataclass
class TokenSnapshot:
    form_token: str
    xsrf_token: str
    ppm_security_session: str


def short_secret(value: str, keep: int = 10) -> str:
    if len(value) <= keep:
        return value
    return f"{value[:keep]}..."


def extract_form_token(page_html: str) -> str:
    match = TOKEN_INPUT_RE.search(page_html)
    if match:
        return html.unescape(match.group(1))

    match = META_CSRF_RE.search(page_html)
    if match:
        return html.unescape(match.group(1))

    raise RuntimeError("Tidak menemukan _token / csrf-token pada HTML.")


def require_cookie(session: requests.Session, name: str) -> str:
    value = session.cookies.get(name)
    if not value:
        raise RuntimeError(f"Cookie wajib `{name}` tidak ditemukan di session.")
    return value


def load_dotenv_file(path: Path) -> None:
    if not path.is_file():
        return

    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        if line.startswith("export "):
            line = line[7:].strip()

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if not key:
            continue

        if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
            value = value[1:-1]

        os.environ.setdefault(key, value)


def resolve_text_argument(
    cli_value: str | None,
    env_names: tuple[str, ...],
    default: str | None = None,
) -> str:
    if cli_value:
        return cli_value

    for env_name in env_names:
        value = os.getenv(env_name)
        if value:
            return value

    if default is not None:
        return default

    joined_names = ", ".join(f"`{name}`" for name in env_names)
    raise RuntimeError(
        "Nilai belum diisi. "
        f"Berikan argumen CLI atau set environment {joined_names}."
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Login ke presensi.ppmuinjkt.com lalu mengirim request absensi "
            "dengan token dan cookie hasil login."
        )
    )
    parser.add_argument(
        "--nim",
        help="NIM login. Fallback ke `.env`/environment `PRESENSI_NIM`.",
    )
    parser.add_argument(
        "--password",
        help="Password login. Fallback ke `.env`/environment `PRESENSI_PASSWORD`.",
    )
    parser.add_argument(
        "--foto",
        type=Path,
        help="Path foto absensi. Wajib karena status selalu Hadir.",
    )
    parser.add_argument(
        "--lokasi",
        help="Nilai field lokasi. Fallback ke `.env`/environment `PRESENSI_LOKASI`.",
    )
    parser.add_argument(
        "--alasan",
        default="",
        help="Field alasan. Untuk status Hadir biasanya dibiarkan kosong.",
    )
    parser.add_argument(
        "--surat-sakit",
        type=Path,
        help="Lampiran surat sakit (PDF/gambar) jika diperlukan.",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=DEFAULT_TIMEOUT,
        help="Timeout request per langkah dalam detik.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Cetak token/cookie singkat dan detail redirect untuk debugging.",
    )
    return parser


class PresensiClient:
    def __init__(self, timeout: int, verbose: bool = False) -> None:
        self.timeout = timeout
        self.verbose = verbose
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": DEFAULT_USER_AGENT,
                "Accept-Language": "en-US,en;q=0.9",
            }
        )

    def log(self, message: str) -> None:
        if self.verbose:
            print(message, file=sys.stderr)

    def bootstrap_login(self) -> TokenSnapshot:
        response = self.session.get(
            f"{BASE_URL}/",
            headers={
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Referer": BASE_URL,
                "Upgrade-Insecure-Requests": "1",
            },
            timeout=self.timeout,
        )
        response.raise_for_status()

        snapshot = TokenSnapshot(
            form_token=extract_form_token(response.text),
            xsrf_token=require_cookie(self.session, "XSRF-TOKEN"),
            ppm_security_session=require_cookie(self.session, "ppm-security-session"),
        )
        self.log(
            "GET / -> "
            f"_token={short_secret(snapshot.form_token)}, "
            f"XSRF={short_secret(snapshot.xsrf_token)}, "
            f"ppm-security-session={short_secret(snapshot.ppm_security_session)}"
        )
        return snapshot

    def login(self, nim: str, password: str, login_token: str) -> TokenSnapshot:
        response = self.session.post(
            LOGIN_URL,
            headers={
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Content-Type": "application/x-www-form-urlencoded",
                "Origin": BASE_URL,
                "Referer": f"{BASE_URL}/",
                "Upgrade-Insecure-Requests": "1",
            },
            data={
                "_token": login_token,
                "nim": nim,
                "password": password,
            },
            timeout=self.timeout,
            allow_redirects=False,
        )

        location = response.headers.get("Location", "")
        if response.status_code not in {302, 303}:
            raise RuntimeError(
                f"Login gagal. HTTP {response.status_code}. "
                f"Body awal: {response.text[:300]!r}"
            )
        if "dashboard-mahasiswa" not in location:
            raise RuntimeError(
                "Login tidak redirect ke dashboard-mahasiswa. "
                f"Location: {location or '<kosong>'}"
            )

        snapshot = TokenSnapshot(
            form_token=login_token,
            xsrf_token=require_cookie(self.session, "XSRF-TOKEN"),
            ppm_security_session=require_cookie(self.session, "ppm-security-session"),
        )
        self.log(
            "POST /login -> "
            f"HTTP {response.status_code}, Location={location}, "
            f"XSRF={short_secret(snapshot.xsrf_token)}, "
            f"ppm-security-session={short_secret(snapshot.ppm_security_session)}"
        )
        return snapshot

    def fetch_dashboard(self) -> TokenSnapshot:
        response = self.session.get(
            DASHBOARD_URL,
            headers={
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Referer": f"{BASE_URL}/",
                "Upgrade-Insecure-Requests": "1",
            },
            timeout=self.timeout,
        )
        response.raise_for_status()

        snapshot = TokenSnapshot(
            form_token=extract_form_token(response.text),
            xsrf_token=require_cookie(self.session, "XSRF-TOKEN"),
            ppm_security_session=require_cookie(self.session, "ppm-security-session"),
        )
        self.log(
            "GET /dashboard-mahasiswa -> "
            f"_token={short_secret(snapshot.form_token)}, "
            f"XSRF={short_secret(snapshot.xsrf_token)}, "
            f"ppm-security-session={short_secret(snapshot.ppm_security_session)}"
        )
        return snapshot

    def submit_attendance(
        self,
        dashboard_token: str,
        lokasi: str,
        alasan: str,
        foto: Path | None,
        surat_sakit: Path | None,
    ) -> requests.Response:
        with contextlib.ExitStack() as stack:
            files: dict[str, tuple[str, BinaryIO | bytes, str]] = {}

            files["foto"] = self._build_file_part(stack, foto)
            files["surat_sakit"] = self._build_file_part(stack, surat_sakit)

            response = self.session.post(
                ATTENDANCE_URL,
                headers={
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Origin": BASE_URL,
                    "Referer": DASHBOARD_URL,
                    "Upgrade-Insecure-Requests": "1",
                },
                data={
                    "_token": dashboard_token,
                    "status": ATTENDANCE_STATUS,
                    "lokasi": lokasi,
                    "alasan": alasan,
                },
                files=files,
                timeout=self.timeout,
                allow_redirects=False,
            )

        self.log(
            "POST /dashboard -> "
            f"HTTP {response.status_code}, Location={response.headers.get('Location', '')}"
        )
        return response

    @staticmethod
    def _build_file_part(
        stack: contextlib.ExitStack,
        path: Path | None,
    ) -> tuple[str, BinaryIO | bytes, str]:
        if path is None:
            return ("", b"", "application/octet-stream")

        resolved = path.expanduser().resolve()
        if not resolved.is_file():
            raise RuntimeError(f"File tidak ditemukan: {resolved}")

        mime_type = mimetypes.guess_type(resolved.name)[0] or "application/octet-stream"
        file_handle = stack.enter_context(resolved.open("rb"))
        return (resolved.name, file_handle, mime_type)


def validate_args(args: argparse.Namespace) -> None:
    if args.foto is None:
        raise RuntimeError("Argumen `--foto` wajib diisi karena status selalu Hadir.")


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    try:
        load_dotenv_file(Path(__file__).resolve().with_name(".env"))
        validate_args(args)
        nim = resolve_text_argument(args.nim, ("PRESENSI_NIM", "NIM"))
        password = resolve_text_argument(
            args.password,
            ("PRESENSI_PASSWORD", "PASSWORD"),
        )
        lokasi = resolve_text_argument(
            args.lokasi,
            ("PRESENSI_LOKASI", "LOKASI"),
            default=(
                "UIN Syarif Hidayatullah, Jalan Haji Limun, RW 08, Pisangan, "
                "Ciputat Timur, South Tangerang, Banten, Java, 15419, Indonesia"
            ),
        )

        client = PresensiClient(timeout=args.timeout, verbose=args.verbose)

        login_bootstrap = client.bootstrap_login()
        client.login(nim=nim, password=password, login_token=login_bootstrap.form_token)
        dashboard_tokens = client.fetch_dashboard()

        response = client.submit_attendance(
            dashboard_token=dashboard_tokens.form_token,
            lokasi=lokasi,
            alasan=args.alasan,
            foto=args.foto,
            surat_sakit=args.surat_sakit,
        )

        location = response.headers.get("Location", "")
        print("Login token awal :", short_secret(login_bootstrap.form_token))
        print("Cookie login baru:", short_secret(dashboard_tokens.xsrf_token))
        print(
            "Session login baru:",
            short_secret(dashboard_tokens.ppm_security_session),
        )
        print("Token dashboard  :", short_secret(dashboard_tokens.form_token))
        print("Status submit    :", ATTENDANCE_STATUS)
        print("Lokasi           :", lokasi)
        print("HTTP submit      :", response.status_code)
        if location:
            print("Redirect         :", location)
        else:
            print("Response URL     :", str(response.url))
        print("Body awal        :", response.text[:300].replace("\n", " "))
        return 0

    except requests.RequestException as exc:
        print(f"Request gagal: {exc}", file=sys.stderr)
        return 1
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
