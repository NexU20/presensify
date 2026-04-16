import type { StatusState } from "@/lib/types";

type StatusPillProps = {
  sessionChecking: boolean;
  sessionReady: boolean;
  statusState: StatusState;
};

const DOT_COLORS: Record<StatusState, string> = {
  checking: "bg-[var(--accent)]",
  ready: "bg-[var(--success)]",
  locked: "bg-[var(--danger)]",
};

const LABELS: Record<StatusState, string> = {
  checking: "Checking session",
  ready: "Session aktif",
  locked: "Session terkunci",
};

export default function StatusPill({
  statusState,
}: StatusPillProps) {
  return (
    <div
      className="status-pill inline-flex items-center gap-3 self-start rounded-full px-4 py-3 text-sm font-medium backdrop-blur"
      data-state={statusState}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${DOT_COLORS[statusState]}`} />
      {LABELS[statusState]}
    </div>
  );
}
