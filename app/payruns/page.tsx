"use client";

import { useEffect, useMemo, useState } from "react";
import PageShell from "@/components/PageShell";
import { addDays, startOfWeekMonday, toISODate } from "@/lib/week";
import {
  buildPayRun,
  getPayRunDetail,
  markPayRunPaid,
  undoPayRunPaid, // ✅ 추가
  type PayRunDetail,
} from "@/lib/payruns";
import { formatTotalMinutes } from "@/lib/timesheets";
import Link from "next/link";

function moneyAUD(v: number) {
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function PayRunsPage() {
  const [periodStart, setPeriodStart] = useState(() =>
    toISODate(startOfWeekMonday(new Date()))
  );
  const periodEnd = useMemo(
    () => toISODate(addDays(new Date(periodStart), 13)),
    [periodStart]
  );

  const [detail, setDetail] = useState<PayRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    window.clearTimeout((showToast as any)._t);
    (showToast as any)._t = window.setTimeout(() => setToast(null), 1200);
  }

  const title = useMemo(
    () => `${periodStart} ~ ${periodEnd} (2주 정산)`,
    [periodStart, periodEnd]
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const payRunId = await buildPayRun(periodStart, periodEnd);
      const d = await getPayRunDetail(payRunId);
      setDetail(d);
    } catch (e: any) {
      const msg = e?.message ?? "Pay Run 로드 실패";
      setError(msg);
      setDetail(null);
      showToast(msg);
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodStart]);

  function movePeriod(delta14: number) {
    const next = addDays(new Date(periodStart), 14 * delta14);
    setPeriodStart(toISODate(next));
  }

  const totals = useMemo(() => {
    if (!detail)
      return { minutes: 0, wage: 0, wageKnown: true, missingEmployees: 0 };
    let minutes = 0;
    let wage = 0;
    let wageKnown = true;
    let missingEmployees = 0;

    for (const it of detail.items) {
      minutes += it.total_minutes ?? 0;
      if (it.total_wage == null) wageKnown = false;
      else wage += Number(it.total_wage);
      if ((it.missing_days_count ?? 0) > 0) missingEmployees += 1;
    }
    return { minutes, wage, wageKnown, missingEmployees };
  }, [detail]);

  async function onMarkPaid() {
    if (!detail) return;
    if (detail.payRun.status === "paid") return;

    const ok = window.confirm(
      "이 2주 정산을 '지급 완료(Paid)'로 처리할까요?\n\nPaid 처리 후에는 수정이 어려워집니다."
    );
    if (!ok) return;

    try {
      await markPayRunPaid(detail.payRun.id);
      showToast("지급 완료 처리됨");
      await load();
    } catch (e: any) {
      showToast(e?.message ?? "Paid 처리 실패");
    }
  }

  // ✅ 추가: Undo Paid
  async function onUndoPaid() {
    if (!detail) return;
    if (detail.payRun.status !== "paid") return;

    const ok = window.confirm(
      "지급 완료(Paid)를 취소할까요?\n\n⚠️ 이 기간의 근무 기록이 다시 수정 가능해집니다."
    );
    if (!ok) return;

    try {
      await undoPayRunPaid(detail.payRun.id);
      showToast("Paid 취소됨 (Draft로 변경)");
      await load();
    } catch (e: any) {
      showToast(e?.message ?? "Undo 실패");
    }
  }

  return (
    <PageShell>
      <main>
        {toast ? (
          <div
            style={{
              position: "fixed",
              top: 18,
              left: "50%",
              transform: "translateX(-50%)",
              padding: "10px 14px",
              borderRadius: 10,
              background: "rgba(0,0,0,0.85)",
              border: "1px solid #333",
              zIndex: 9999,
              fontSize: 14,
              color: "white",
            }}
          >
            {toast}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="underline text-sm">
            ← 홈
          </Link>

          <div className="text-sm opacity-70">
            {detail ? (
              <>
                상태: <b>{detail.payRun.status}</b>
                {detail.payRun.paid_at ? (
                  <span>
                    {" "}
                    · paid_at{" "}
                    {new Date(detail.payRun.paid_at).toLocaleString()}
                  </span>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={() => movePeriod(-1)}
            className="rounded-full border px-3 py-1"
          >
            ◀
          </button>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
            {title}
          </h2>
          <button
            onClick={() => movePeriod(1)}
            className="rounded-full border px-3 py-1"
          >
            ▶
          </button>
        </div>

        {loading ? (
          <div className="mt-6">불러오는 중…</div>
        ) : error ? (
          <div
            className="mt-6 rounded-2xl border p-4"
            style={{
              borderColor: "var(--card-border)",
              background: "rgba(255,255,255,0.75)",
            }}
          >
            <div style={{ color: "var(--text)", fontWeight: 700 }}>
              Pay Run을 불러오지 못했습니다
            </div>
            <div className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
              {error}
            </div>
            <button
              onClick={load}
              className="mt-3 rounded-full px-4 py-2 text-sm font-medium"
              style={{ background: "var(--cta)", color: "white" }}
            >
              다시 시도
            </button>
          </div>
        ) : !detail ? (
          <div className="mt-6">데이터가 없습니다.</div>
        ) : (
          <>
            <div
              className="mt-4 rounded-2xl border p-4"
              style={{
                borderColor: "var(--card-border)",
                background: "rgba(255,255,255,0.65)",
              }}
            >
              <div className="text-sm opacity-80">
                전체 합계: <b>{formatTotalMinutes(totals.minutes)}</b>
                {totals.wageKnown ? (
                  <span className="ml-3">
                    예상 지급총액: <b>{moneyAUD(totals.wage)}</b>
                  </span>
                ) : (
                  <span className="ml-3">(시급 없는 직원 포함)</span>
                )}
                {totals.missingEmployees > 0 ? (
                  <span className="ml-3">
                    · 미완료 직원 <b>{totals.missingEmployees}</b>명
                  </span>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={load}
                  className="rounded-full px-4 py-2 text-sm font-medium"
                  style={{
                    background: "rgba(255,255,255,0.85)",
                    border: `1px solid var(--card-border)`,
                  }}
                >
                  새로고침
                </button>

                <button
                  onClick={onMarkPaid}
                  disabled={detail.payRun.status === "paid"}
                  className="rounded-full px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: "var(--cta)" }}
                >
                  지급 완료(Paid)
                </button>

                {/* ✅ 추가: paid일 때 Undo 버튼 */}
                <button
                  onClick={onUndoPaid}
                  disabled={detail.payRun.status !== "paid"}
                  className="rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50"
                  style={{
                    background: "rgba(239,68,68,0.12)",
                    border: "1px solid rgba(239,68,68,0.35)",
                    color: "#dc2626",
                  }}
                >
                  Paid 취소(Undo)
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {detail.items.map((it) => {
                const isMissing = (it.missing_days_count ?? 0) > 0;
                return (
                  <div
                    key={it.employee_id}
                    className="rounded-2xl border p-4"
                    style={{
                      borderColor: "var(--card-border)",
                      background: "rgba(255,255,255,0.85)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div
                          className="text-base font-semibold"
                          style={{ color: "var(--text)" }}
                        >
                          {it.employee_name}
                        </div>
                        <div className="mt-1 text-xs opacity-70">
                          시급:{" "}
                          {it.employee_hourly_wage != null
                            ? moneyAUD(it.employee_hourly_wage)
                            : "없음"}
                        </div>
                      </div>

                      <div className="text-right text-xs">
                        {isMissing ? (
                          <span
                            className="rounded-full border px-2 py-1"
                            style={{
                              borderColor: "#f59e0b",
                              color: "#b45309",
                              background: "rgba(245,158,11,0.12)",
                            }}
                          >
                            미완료 {it.missing_days_count}일
                          </span>
                        ) : (
                          <span
                            className="rounded-full border px-2 py-1"
                            style={{
                              borderColor: "#10b981",
                              color: "#047857",
                              background: "rgba(16,185,129,0.12)",
                            }}
                          >
                            완료
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 text-sm">
                      시간: <b>{formatTotalMinutes(it.total_minutes)}</b>
                      <span className="ml-3">
                        금액:{" "}
                        <b>
                          {it.total_wage != null
                            ? moneyAUD(Number(it.total_wage))
                            : "시급 없음"}
                        </b>
                      </span>
                    </div>

                    <div className="mt-3">
                      <Link
                        href={`/employees/${it.employee_id}`}
                        className="underline text-sm"
                      >
                        이 직원 주간 입력 보기 →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </PageShell>
  );
}
