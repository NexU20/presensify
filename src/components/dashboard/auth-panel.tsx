"use client";

import type { FormEvent } from "react";
import type { FeedbackTone } from "@/lib/types";
import FeedbackBanner from "./feedback-banner";

type AuthPanelProps = {
  nim: string;
  password: string;
  loginLoading: boolean;
  sessionChecking: boolean;
  feedbackTone: FeedbackTone;
  statusMessage: string;
  onNimChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onLogin: (event: FormEvent<HTMLFormElement>) => void;
  onLogout: () => void;
  onRefreshSession: () => void;
};

export default function AuthPanel({
  nim,
  password,
  loginLoading,
  sessionChecking,
  feedbackTone,
  statusMessage,
  onNimChange,
  onPasswordChange,
  onLogin,
  onLogout,
  onRefreshSession,
}: AuthPanelProps) {
  return (
    <section className="neuro-panel rise-in p-5 sm:p-6 [animation-delay:120ms]">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-dim)]">
              Step 1
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Login
            </h2>
          </div>
          <button
            className="neuro-button px-4 py-3 text-sm font-semibold text-white"
            disabled={sessionChecking || loginLoading}
            onClick={onLogout}
            type="button"
          >
            Reset Session
          </button>
        </div>

        <form className="grid gap-4" onSubmit={onLogin}>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[var(--text-dim)]">
              Username / NIM
            </span>
            <input
              autoComplete="username"
              className="neuro-field px-4 py-4"
              onChange={(event) => onNimChange(event.target.value)}
              placeholder="112233445566"
              type="text"
              value={nim}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-[var(--text-dim)]">
              Password
            </span>
            <input
              autoComplete="current-password"
              className="neuro-field px-4 py-4"
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="**********"
              type="password"
              value={password}
            />
          </label>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              className="neuro-button flex-1 px-5 py-4 text-sm font-semibold text-white"
              disabled={loginLoading || sessionChecking}
              type="submit"
            >
              {loginLoading ? "Mencoba login..." : "Coba Login"}
            </button>
            <button
              className="neuro-button px-5 py-4 text-sm font-semibold text-[var(--accent)]"
              disabled={sessionChecking}
              onClick={onRefreshSession}
              type="button"
            >
              Re-check Session
            </button>
          </div>
        </form>

        <FeedbackBanner tone={feedbackTone} message={statusMessage} />
      </div>
    </section>
  );
}
