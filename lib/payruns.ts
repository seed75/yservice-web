import { supabase } from "@/lib/supabaseClient";

export type PayRunStatus = "open" | "confirmed" | "paid";

export type PayRun = {
  id: string;
  period_start: string; // YYYY-MM-DD
  period_end: string;   // YYYY-MM-DD
  status: PayRunStatus;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
};

export type PayRunItem = {
  id: string;
  pay_run_id: string;
  employee_id: string;
  total_minutes: number;
  total_wage: number | null;
  missing_days_count: number;
  created_at: string;

  employee_name: string;
  employee_hourly_wage: number | null;
};

export type PayRunDetail = {
  payRun: PayRun;
  items: PayRunItem[];
};

export async function buildPayRun(periodStart: string, periodEnd: string): Promise<string> {
  const { data, error } = await supabase.rpc("build_pay_run", {
    p_period_start: periodStart,
    p_period_end: periodEnd,
  });

  if (error) throw error;
  // RPC returns uuid (string)
  return data as string;
}

export async function getPayRunDetail(payRunId: string): Promise<PayRunDetail> {
  const { data: payRun, error: runError } = await supabase
    .from("pay_runs")
    .select("id, period_start, period_end, status, created_at, updated_at, paid_at")
    .eq("id", payRunId)
    .single();

  if (runError) throw runError;

  const { data: items, error: itemsError } = await supabase
    .from("pay_run_items")
    .select(
      `
      id,
      pay_run_id,
      employee_id,
      total_minutes,
      total_wage,
      missing_days_count,
      created_at,
      employees (
        name,
        hourly_wage
      )
    `
    )
    .eq("pay_run_id", payRunId)
    .order("created_at", { ascending: true });

  if (itemsError) throw itemsError;

  const mapped: PayRunItem[] =
    (items ?? []).map((r: any) => ({
      id: r.id,
      pay_run_id: r.pay_run_id,
      employee_id: r.employee_id,
      total_minutes: r.total_minutes ?? 0,
      total_wage: r.total_wage ?? null,
      missing_days_count: r.missing_days_count ?? 0,
      created_at: r.created_at,
      employee_name: r.employees?.name ?? "(No name)",
      employee_hourly_wage: r.employees?.hourly_wage ?? null,
    })) ?? [];

  // Owner UX: sort so incomplete items appear first
  mapped.sort((a, b) => {
    const aKey = a.missing_days_count > 0 ? 0 : 1;
    const bKey = b.missing_days_count > 0 ? 0 : 1;
    if (aKey !== bKey) return aKey - bKey;
    return a.employee_name.localeCompare(b.employee_name);
  });

  return { payRun: payRun as PayRun, items: mapped };
}

export async function markPayRunPaid(payRunId: string): Promise<void> {
  const { error } = await supabase.rpc("mark_pay_run_paid", {
    p_pay_run_id: payRunId,
  });
  if (error) throw error;
}

export async function isDateRangePaid(employeeId: string, startDate: string, endDate: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("pay_runs")
    .select("id, status, period_start, period_end, pay_run_items!inner(employee_id)")
    .eq("status", "paid")
    .eq("pay_run_items.employee_id", employeeId);

  if (error) throw error;

  const runs = data ?? [];
  const s = new Date(startDate);
  const e = new Date(endDate);

  return runs.some((r: any) => {
    const ps = new Date(r.period_start);
    const pe = new Date(r.period_end);
    return ps <= e && pe >= s; // Lock if periods overlap
  });
}

export async function undoPayRunPaid(payRunId: string) {
  const { error } = await supabase
    .from("pay_runs")
    .update({
      status: "open",     // ✅ Change here only (draft -> open)
      paid_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payRunId);

  if (error) throw error;
}