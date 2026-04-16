import type { FeedbackTone } from "@/lib/types";

type FeedbackBannerProps = {
  message: string;
  tone: FeedbackTone;
};

const TONE_CLASSES: Record<FeedbackTone, string> = {
  danger: "border-red-400/14 bg-red-400/8 text-red-100",
  success: "border-emerald-300/12 bg-emerald-300/8 text-emerald-50",
  info: "border-white/8 bg-white/5 text-[var(--text-dim)]",
};

export default function FeedbackBanner({ message, tone }: FeedbackBannerProps) {
  return (
    <div
      className={`rounded-[22px] border px-4 py-4 text-sm leading-7 ${TONE_CLASSES[tone]}`}
    >
      {message}
    </div>
  );
}
