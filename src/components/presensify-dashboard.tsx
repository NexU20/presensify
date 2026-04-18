"use client";

import { usePresensify } from "@/hooks/use-presensify";
import AttendanceStatusCard from "./dashboard/attendance-status-card";
import AuthPanel from "./dashboard/auth-panel";
import CameraPanel from "./dashboard/camera-panel";
import DashboardHeader from "./dashboard/dashboard-header";
import StatusPill from "./dashboard/status-pill";
import SubmitPanel from "./dashboard/submit-panel";

export default function PresensifyDashboard() {
  const { session, login, photo, attendance, feedback, portal, derived } =
    usePresensify();

  return (
    <main className="neuro-shell relative min-h-screen px-4 py-10 text-foreground sm:px-6 lg:px-10">

      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="sticky top-4 z-10 flex justify-end">
          <StatusPill
            sessionChecking={session.sessionChecking}
            sessionReady={session.sessionReady}
            statusState={derived.statusState}
          />
        </div>

        <DashboardHeader />

        <AttendanceStatusCard
          dashboardInfo={portal.dashboardInfo}
          loading={portal.dashboardInfoLoading}
          sessionReady={session.sessionReady}
        />

        <div className="grid gap-6 md:grid-cols-[1.05fr_0.95fr]">
          <AuthPanel
            nim={login.nim}
            password={login.password}
            loginLoading={login.loginLoading}
            sessionChecking={session.sessionChecking}
            feedbackTone={feedback.feedbackTone}
            statusMessage={feedback.statusMessage}
            onNimChange={login.onNimChange}
            onPasswordChange={login.onPasswordChange}
            onLogin={login.handleLoginSubmit}
            onLogout={session.handleLogout}
            onRefreshSession={session.refreshSession}
          />

          <CameraPanel
            photoFile={photo.photoFile}
            photoPreviewUrl={photo.photoPreviewUrl}
            controlsLocked={derived.controlsLocked}
            convertingPhoto={photo.convertingPhoto}
            onPhotoChange={photo.handlePhotoChange}
          />
        </div>

        <SubmitPanel
          lokasi={attendance.lokasi}
          alasan={attendance.alasan}
          controlsLocked={derived.controlsLocked}
          submitLoading={attendance.submitLoading}
          submitDisabled={derived.submitDisabled}
          sessionReady={session.sessionReady}
          photoFile={photo.photoFile}
          attendanceResult={attendance.attendanceResult}
          onLokasiChange={attendance.onLokasiChange}
          onAlasanChange={attendance.onAlasanChange}
          onSubmit={attendance.handleAttendanceSubmit}
        />
      </section>
    </main>
  );
}

