import { supabase } from "@/lib/supabaseClient";

export type DayRow = {
  date: string;
  startTime: string | null;
  endTime: string | null;
  breakMinutes: number;
  workMinutes: number | null;
  isComplete: boolean;
};

export type WeekDetail = {
  employeeId: string;
  weekStart: string;
  status: "draft" | "confirmed" | "paid";
  days: DayRow[];
  totals: { totalMinutes: number; totalWage: number | null };
  missingDaysCount: number;
};

function minutesToHHMM(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

// ✅ Fetch weekly details: simple version using direct queries
export async function getWeekDetail(employeeId: string, weekStart: string): Promise<WeekDetail> {
  // Ensure week_timesheets exist first because day_shifts may be missing
  await supabase.from("week_timesheets").upsert(
    { employee_id: employeeId, week_start_date: weekStart },
    { onConflict: "employee_id,week_start_date" }
  );

  const { data: week, error: weekErr } = await supabase
    .from("week_timesheets")
    .select("id,status,total_minutes,total_wage,missing_days_count")
    .eq("employee_id", employeeId)
    .eq("week_start_date", weekStart)
    .single();

  if (weekErr) throw weekErr;

  const { data: shifts, error: shiftsErr } = await supabase
    .from("day_shifts")
    .select("work_date,start_time,end_time,break_minutes,work_minutes,is_complete")
    .eq("week_timesheet_id", week.id);

  if (shiftsErr) throw shiftsErr;

  // map by date
  const byDate = new Map<string, any>();
  (shifts ?? []).forEach((r) => byDate.set(r.work_date, r));

  // Fill 7 days
  const start = new Date(weekStart);
  const days: DayRow[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10);

    const row = byDate.get(iso);
    days.push({
      date: iso,
      startTime: row?.start_time ?? null,
      endTime: row?.end_time ?? null,
      breakMinutes: row?.break_minutes ?? 0,
      workMinutes: row?.work_minutes ?? null,
      isComplete: row?.is_complete ?? false,
    });
  }

  return {
    employeeId,
    weekStart,
    status: week.status,
    days,
    totals: { totalMinutes: week.total_minutes, totalWage: week.total_wage ?? null },
    missingDaysCount: week.missing_days_count,
  };
}

// ✅ Save a day: call RPC (DB handles calculations/validation/totals)
export async function saveDay(input: {
  employeeId: string;
  weekStart: string;
  workDate: string;
  startTime: string | null;
  endTime: string | null;
  breakMinutes: number;
}) {
  const { error } = await supabase.rpc("upsert_day_shift", {
    p_employee_id: input.employeeId,
    p_week_start: input.weekStart,
    p_work_date: input.workDate,
    p_start: input.startTime,
    p_end: input.endTime,
    p_break_minutes: input.breakMinutes,
  });

  if (error) throw error;
}

export function formatWorkMinutes(workMinutes: number | null) {
  if (workMinutes == null) return "-";
  return minutesToHHMM(workMinutes);
}

export function formatTotalMinutes(total: number) {
  return minutesToHHMM(total);
}

export function toHHMM(t: string | null) {
  if (!t) return "";
  // "11:00:00" -> "11:00", "11:00" -> "11:00"
  return t.slice(0, 5);
}