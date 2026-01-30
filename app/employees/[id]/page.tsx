"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { addDays, formatWeekRange, startOfWeekMonday, toISODate } from "@/lib/week";
import {
  formatTotalMinutes,
  formatWorkMinutes,
  getWeekDetail,
  saveDay,
  type DayRow,
  type WeekDetail,
} from "@/lib/timesheets";
import { normalizeTimeInput, relaxEndTime, toHHMM } from "@/lib/timeInput";
import PageShell from "@/components/PageShell";
import { isDateRangePaid } from "@/lib/payruns";

const DOW = ["월", "화", "수", "목", "금", "토", "일"];
type SaveState = "idle" | "saving" | "saved" | "error";

export default function EmployeeWeekPage() {
  const params = useParams<{ id: string }>();
  const employeeId = params.id;

  const [weekStart, setWeekStart] = useState(() =>
    toISODate(startOfWeekMonday(new Date()))
  );
  const [detail, setDetail] = useState<WeekDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPaidLocked, setIsPaidLocked] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [saveStateByDate, setSaveStateByDate] = useState<Record<string, SaveState>>(
    {}
  );

  const endTimersRef = useRef<Record<string, number>>({});
  const refreshTimerRef = useRef<number | null>(null);

  const weekLabel = useMemo(() => formatWeekRange(weekStart), [weekStart]);

  function showToast(msg: string) {
    setToast(msg);
    window.clearTimeout((showToast as any)._t);
    (showToast as any)._t = window.setTimeout(() => setToast(null), 1200);
  }

  async function refresh() {
    setLoading(true);
    try {
      const d = await getWeekDetail(employeeId, weekStart);
      setDetail(d);
      setSaveStateByDate({});
    } catch (e: any) {
      // ✅ 최소한의 에러 표시 (멈춘 것처럼 보이지 않게)
      showToast(e?.message ?? "주간 데이터 로드 실패");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }

  // ✅ (핵심) 페이지 진입/주 변경 시 실제로 데이터를 불러오는 트리거
  useEffect(() => {
    if (!employeeId) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, weekStart]);

  // ✅ Paid 잠금 체크 (데이터 로딩과는 분리)
  useEffect(() => {
    (async () => {
      try {
        const start = weekStart;
        const end = toISODate(addDays(new Date(weekStart), 6));
        const locked = await isDateRangePaid(employeeId, start, end);
        setIsPaidLocked(locked);
      } catch {
        setIsPaidLocked(false);
      }
    })();
  }, [employeeId, weekStart]);

  function moveWeek(delta: number) {
    const next = addDays(new Date(weekStart), 7 * delta);
    setWeekStart(toISODate(next));
  }

  function updateRow(idx: number, patch: Partial<DayRow>) {
    if (!detail) return;
    const nextDays = detail.days.map((d, i) => (i === idx ? { ...d, ...patch } : d));
    setDetail({ ...detail, days: nextDays });
  }

  function setSaveState(date: string, state: SaveState) {
    setSaveStateByDate((p) => ({ ...p, [date]: state }));
  }

  async function saveWhenEndReady(row: DayRow) {
    if (isPaidLocked) return;

    const start = normalizeTimeInput(row.startTime ?? "");
    let end = normalizeTimeInput(row.endTime ?? "");

    if (!start || !end) return;

    end = relaxEndTime(start, end);

    try {
      setSaveState(row.date, "saving");
      await saveDay({
        employeeId,
        weekStart,
        workDate: row.date,
        startTime: start,
        endTime: end,
        breakMinutes: 0,
      });

      setSaveState(row.date, "saved");
      showToast("저장됨");

      // ✅ 저장 후 totals/workMinutes만 조용히 갱신
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = window.setTimeout(async () => {
        try {
          const d = await getWeekDetail(employeeId, weekStart);
          setDetail(d);
        } catch {
          // ignore
        }
      }, 400);
    } catch (e: any) {
      setSaveState(row.date, "error");
      showToast(e?.message ?? "저장 실패");
    }
  }

  function scheduleEndSave(idx: number) {
    if (isPaidLocked) return;
    if (!detail) return;

    const key = detail.days[idx].date;
    if (endTimersRef.current[key]) clearTimeout(endTimersRef.current[key]);

    endTimersRef.current[key] = window.setTimeout(() => {
      saveWhenEndReady(detail.days[idx]);
    }, 600);
  }

  function flushEndSave(idx: number) {
    if (isPaidLocked) return;
    if (!detail) return;

    const key = detail.days[idx].date;
    if (endTimersRef.current[key]) clearTimeout(endTimersRef.current[key]);

    saveWhenEndReady(detail.days[idx]);
  }

  function renderRight(row: DayRow) {
    const st = saveStateByDate[row.date];
    if (st === "saving") return "저장중…";
    if (st === "saved") return "저장됨";
    if (st === "error") return "오류";
    return row.isComplete ? `시간 ${formatWorkMinutes(row.workMinutes)}` : "미완료";
  }

  return (
    <PageShell>
      <main>
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 rounded-lg border bg-black/80 px-4 py-2 text-sm text-white">
            {toast}
          </div>
        )}

        <a href="/" className="underline text-sm">
          ← 직원 목록
        </a>

        <div className="mt-4 flex items-center justify-center gap-3">
          <button onClick={() => moveWeek(-1)}>◀</button>
          <h2 className="text-lg font-semibold">{weekLabel}</h2>
          <button onClick={() => moveWeek(1)}>▶</button>
        </div>

        {loading || !detail ? (
          <div className="mt-6">불러오는 중…</div>
        ) : (
          <>
            <div className="mt-4 text-sm opacity-70">
              상태 <b>{detail.status}</b> · 미완료 <b>{detail.missingDaysCount}</b>일
            </div>

            {isPaidLocked ? (
              <div
                style={{
                  marginTop: 10,
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: "rgba(245,158,11,0.12)",
                  border: "1px solid rgba(245,158,11,0.35)",
                  fontSize: 14,
                }}
              >
                이 주는 <b>지급 완료(Paid)</b> 처리되어 수정할 수 없습니다.
              </div>
            ) : null}

            <div className="mt-6 divide-y divide-white/10">
              {detail.days.map((row, idx) => (
                <div key={row.date} className="py-3">
                  <div className="mb-2 text-sm font-semibold">
                    {DOW[idx]} <span className="opacity-60">{row.date.slice(5)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:items-center">
                    <input
                      value={toHHMM(row.startTime)}
                      onChange={(e) => updateRow(idx, { startTime: e.target.value || null })}
                      placeholder="출근"
                      disabled={isPaidLocked}
                      className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
                    />

                    <input
                      value={toHHMM(row.endTime)}
                      onChange={(e) => {
                        updateRow(idx, { endTime: e.target.value || null });
                        scheduleEndSave(idx);
                      }}
                      onBlur={() => flushEndSave(idx)}
                      onKeyDown={(e) => e.key === "Enter" && flushEndSave(idx)}
                      placeholder="퇴근"
                      disabled={isPaidLocked}
                      className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
                    />

                    <div className="hidden text-right text-xs opacity-70 sm:block">
                      {renderRight(row)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-sm font-medium">
              주간 총 근무 <b>{formatTotalMinutes(detail.totals.totalMinutes)}</b>
              {detail.totals.totalWage != null && (
                <span className="ml-3">
                  예상 주급 <b>{detail.totals.totalWage.toLocaleString()}불</b>
                </span>
              )}
            </div>
          </>
        )}
      </main>
    </PageShell>
  );
}
