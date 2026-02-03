// web/components/PageShell.tsx
export default function PageShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "linear-gradient(180deg, var(--bg-top) 0%, var(--bg-mid) 55%, var(--bg-bottom) 100%)",
      }}
    >
      <div className="mx-auto max-w-5xl px-4 py-14">
        <div className="text-center">
          <div
            className="mx-auto inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
            style={{
              borderColor: "var(--card-border)",
              color: "var(--muted)",
              background: "rgba(255,255,255,.6)",
            }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: "var(--cta)" }}
            />
            Owner-only Timesheet
          </div>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-[var(--text)] sm:text-6xl">
            Simple weekly timesheets
          </h1>

          <p
            className="mx-auto mt-4 max-w-2xl text-base sm:text-lg"
            style={{ color: "var(--muted)" }}
          >
            Only enter clock-in and clock-out times; calculations are automatic.
          </p>
        </div>

        {/* 👇 Actual page content goes here */}
        <div
          className="mx-auto mt-10 max-w-3xl rounded-3xl border p-4 shadow-sm sm:p-6"
          style={{
            background: "rgba(255,255,255,0.75)",
            backdropFilter: "blur(12px)",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
