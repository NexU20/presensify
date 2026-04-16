export default function DashboardHeader() {
  return (
    <div className="rise-in space-y-4">
      <span className="inline-flex rounded-full border border-white/8 bg-white/6 px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-[var(--text-dim)]">
        Presensify Console
      </span>
      <div className="space-y-3">
        <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
          Malas absen di tempat?
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-[var(--text-dim)] sm:text-base">
          Web ini dibuat untuk mempermudah absen kkn kalian tanpa harus ke posko kkn kalian.
        </p>
      </div>
    </div>
  );
}
