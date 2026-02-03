import { supabase } from "@/lib/supabaseClient";

export type Employee = {
  id: string;
  name: string;
  hourly_wage: number | null;
  memo: string | null;
};

export async function getEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from("employees")
    .select("id,name,hourly_wage,memo")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createEmployee(input: {
  name: string;
  hourly_wage?: number | null;
  memo?: string | null;
}) {
  const { data, error } = await supabase
    .from("employees")
    .insert([
      {
        name: input.name.trim(),
        hourly_wage: input.hourly_wage ?? null,
        memo: input.memo ?? null,
      },
    ])
    .select("id,name,hourly_wage,memo")
    .single();

  if (error) throw error;
  return data;
}

// ✅ U: Update employee (name/hourly rate/notes)
export async function updateEmployee(
  employeeId: string,
  patch: { name?: string; hourly_wage?: number | null; memo?: string | null }
) {
  const payload: any = {};
  if (patch.name !== undefined) payload.name = patch.name.trim();
  if (patch.hourly_wage !== undefined) payload.hourly_wage = patch.hourly_wage;
  if (patch.memo !== undefined) payload.memo = patch.memo;

  const { data, error } = await supabase
    .from("employees")
    .update(payload)
    .eq("id", employeeId)
    .select("id,name,hourly_wage,memo")
    .single();

  if (error) throw error;
  return data;
}

// ✅ D: Delete employee (related weekly/daily entries deleted via FK: on delete cascade)
export async function deleteEmployee(employeeId: string) {
  const { error } = await supabase.from("employees").delete().eq("id", employeeId);
  if (error) throw error;
}
