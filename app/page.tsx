"use client";

import { useEffect, useState } from "react";
import type { Employee } from "@/lib/employees";
import {
  createEmployee,
  deleteEmployee,
  getEmployees,
  updateEmployee,
} from "@/lib/employees";
import PageShell from "@/components/PageShell";



export default function Home() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // 추가 폼
  const [name, setName] = useState("");
  const [wage, setWage] = useState<string>("");

  // 드롭다운 이동
  const [selectedId, setSelectedId] = useState<string>("");

  // 인라인 편집 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editWage, setEditWage] = useState<string>("");

  async function refresh(keepSelection = true) {
    setLoading(true);
    try {
      const list = await getEmployees();
      setEmployees(list);

      if (!keepSelection) return;

      // 선택 유지/보정
      if (list.length === 0) {
        setSelectedId("");
      } else if (!selectedId) {
        setSelectedId(list[0].id);
      } else {
        const exists = list.some((e) => e.id === selectedId);
        if (!exists) setSelectedId(list[0].id);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onAdd() {
    const trimmed = name.trim();
    if (!trimmed) {
      alert("직원 이름을 입력하세요.");
      return;
    }

    try {
      const created = await createEmployee({
        name: trimmed,
        hourly_wage: wage ? Number(wage) : null,
      });
      setName("");
      setWage("");
      await refresh(false);
      setSelectedId(created.id);
    } catch (e: any) {
      alert(e?.message ?? "직원 추가 실패");
    }
  }

  function goSelected() {
    if (!selectedId) {
      alert("직원을 선택하세요.");
      return;
    }
    window.location.href = `/employees/${selectedId}`;
  }

  function startEdit(emp: Employee) {
    setEditingId(emp.id);
    setEditName(emp.name ?? "");
    setEditWage(emp.hourly_wage != null ? String(emp.hourly_wage) : "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditWage("");
  }

  async function saveEdit(empId: string) {
    const trimmed = editName.trim();
    if (!trimmed) {
      alert("직원 이름은 비울 수 없습니다.");
      return;
    }

    const wageValue = editWage.trim() ? Number(editWage) : null;
    if (editWage.trim() && Number.isNaN(wageValue)) {
      alert("시급은 숫자만 입력하세요.");
      return;
    }
    if (wageValue != null && wageValue < 0) {
      alert("시급은 0 이상이어야 합니다.");
      return;
    }

    try {
      await updateEmployee(empId, { name: trimmed, hourly_wage: wageValue });
      await refresh();
      cancelEdit();
    } catch (e: any) {
      alert(e?.message ?? "수정 실패");
    }
  }

  async function onDelete(emp: Employee) {
    const ok = window.confirm(
      `${emp.name} 직원을 삭제할까요?\n\n주의: 이 직원의 주간 기록도 함께 삭제됩니다.`
    );
    if (!ok) return;

    try {
      await deleteEmployee(emp.id);
      await refresh();
      if (editingId === emp.id) cancelEdit();
    } catch (e: any) {
      alert(e?.message ?? "삭제 실패");
    }
  }

  return (
    <PageShell>
    <main style={{ padding: 24, maxWidth: 650 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>직원 관리</h1>
      <p style={{ marginTop: 6, opacity: 0.8 }}>
        직원 추가/수정/삭제는 여기서 바로 처리합니다.
        </p>
        
        {/* 2주 정산(Pay Run) 이동 */}
<div style={{ marginTop: 12 }}>
  <a
    href="/payruns"
    style={{
      display: "inline-block",
      padding: "10px 16px",
      borderRadius: 999,
      border: "1px solid #ccc",
      textDecoration: "none",
      fontWeight: 500,
    }}
  >
    2주 정산 (Pay Run)
  </a>
</div>

      {/* 드롭다운 이동 */}
      <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center" }}>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{ flex: 1, padding: 10, border: "1px solid #ccc" }}
          disabled={loading || employees.length === 0}
        >
          {employees.length === 0 ? (
            <option value="">직원이 없습니다</option>
          ) : (
            employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))
          )}
        </select>

        <button onClick={goSelected} style={{ padding: "10px 14px" }} disabled={!selectedId}>
          주간 입력으로 이동
        </button>
      </div>

      {/* 직원 추가 */}
      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="직원 이름"
          style={{ flex: 1, padding: 10, border: "1px solid #ccc" }}
        />
        <input
          value={wage}
          onChange={(e) => setWage(e.target.value)}
          placeholder="시급(선택)"
          inputMode="numeric"
          style={{ width: 160, padding: 10, border: "1px solid #ccc" }}
        />
        <button onClick={onAdd} style={{ padding: "10px 14px" }}>
          추가
        </button>
      </div>

      {/* 직원 목록 + 인라인 CRUD */}
      <div style={{ marginTop: 18 }}>
        {loading ? (
          <div>불러오는 중...</div>
        ) : employees.length === 0 ? (
          <div>직원이 없습니다. 위에서 추가해보세요.</div>
        ) : (
          <div style={{ marginTop: 8 }}>
            {employees.map((e) => {
              const isEditing = editingId === e.id;

              return (
                <div
                  key={e.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 160px 240px",
                    gap: 8,
                    alignItems: "center",
                    padding: "10px 0",
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  {/* 이름(또는 편집 입력) */}
                  <div>
                    {isEditing ? (
                      <input
                        value={editName}
                        onChange={(ev) => setEditName(ev.target.value)}
                        style={{ width: "100%", padding: 8, border: "1px solid #ccc" }}
                      />
                    ) : (
                      <a href={`/employees/${e.id}`} style={{ textDecoration: "underline" }}>
                        {e.name}
                      </a>
                    )}
                  </div>

                  {/* 시급(또는 편집 입력) */}
                  <div style={{ textAlign: "right" }}>
                    {isEditing ? (
                      <input
                        value={editWage}
                        onChange={(ev) => setEditWage(ev.target.value)}
                        inputMode="numeric"
                        placeholder="시급(선택)"
                        style={{ width: "100%", padding: 8, border: "1px solid #ccc" }}
                      />
                    ) : e.hourly_wage != null ? (
                      <span style={{ opacity: 0.85 }}>
                        시급 {e.hourly_wage.toLocaleString()}불
                      </span>
                    ) : (
                      <span style={{ opacity: 0.5 }}>시급 없음</span>
                    )}
                  </div>

                  {/* 액션 버튼들 */}
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    {isEditing ? (
                      <>
                        <button onClick={() => saveEdit(e.id)} style={{ padding: "8px 10px" }}>
                          저장
                        </button>
                        <button onClick={cancelEdit} style={{ padding: "8px 10px" }}>
                          취소
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(e)} style={{ padding: "8px 10px" }}>
                          수정
                        </button>
                        <button onClick={() => onDelete(e)} style={{ padding: "8px 10px" }}>
                          삭제
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </main>
    </PageShell>
  );
}
