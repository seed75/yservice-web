"use client";

import { useEffect, useState } from "react";
import type { Employee } from "@/lib/employees";
import { createEmployee, deleteEmployee, getEmployees, updateEmployee } from "@/lib/employees";
import PageShell from "@/components/PageShell";
import LogoutButton from "@/components/LogoutButton";

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
    const ok = window.confirm(`${emp.name} 직원을 삭제할까요?\n\n주의: 이 직원의 주간 기록도 함께 삭제됩니다.`);
    if (!ok) return;

    try {
      await deleteEmployee(emp.id);
      await refresh();
      if (editingId === emp.id) cancelEdit();
    } catch (e: any) {
      alert(e?.message ?? "삭제 실패");
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: 12,
    borderRadius: 12,
    border: "1px solid var(--card-border)",
    background: "rgba(255,255,255,0.92)",
    color: "var(--text)",
    outline: "none",
  };

  const btnPrimary: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0)",
    background: "var(--cta)",
    color: "white",
    fontWeight: 700,
    whiteSpace: "nowrap",
  };

  const btnGhost: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid var(--card-border)",
    background: "rgba(255,255,255,0.85)",
    color: "var(--text)",
    fontWeight: 600,
    whiteSpace: "nowrap",
  };

  return (
    <PageShell>
      <main style={{ maxWidth: 760 }}>
        {/* 상단 헤더 라인: 타이틀 + 로그아웃 */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>직원 관리</h1>
            <p style={{ marginTop: 6, color: "var(--muted)", fontSize: 14 }}>
              직원 추가/수정/삭제는 여기서 바로 처리합니다.
            </p>
          </div>
          <LogoutButton />
        </div>

        {/* 액션 바: PayRun + 드롭다운 + 이동 */}
        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            gap: 10,
            alignItems: "center",
          }}
        >
          <button
            onClick={() => (window.location.href = "/payruns")}
            style={btnGhost}
          >
            2주 정산 (Pay Run)
          </button>

          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            style={{ ...inputStyle, height: 44 }}
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

          <button onClick={goSelected} style={btnPrimary} disabled={!selectedId}>
            주간 입력으로 이동
          </button>
        </div>

        {/* 추가 폼 */}
        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "1fr 180px auto",
            gap: 10,
            alignItems: "center",
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="직원 이름"
            style={inputStyle}
          />
          <input
            value={wage}
            onChange={(e) => setWage(e.target.value)}
            placeholder="시급(선택)"
            inputMode="numeric"
            style={inputStyle}
          />
          <button onClick={onAdd} style={btnPrimary}>
            추가
          </button>
        </div>

        {/* 직원 목록 */}
        <div style={{ marginTop: 18 }}>
          {loading ? (
            <div style={{ color: "var(--muted)" }}>불러오는 중...</div>
          ) : employees.length === 0 ? (
            <div style={{ color: "var(--muted)" }}>직원이 없습니다. 위에서 추가해보세요.</div>
          ) : (
            <div style={{ marginTop: 8 }}>
              {employees.map((e) => {
                const isEditing = editingId === e.id;

                return (
                  <div
                    key={e.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 180px 210px",
                      gap: 10,
                      alignItems: "center",
                      padding: "12px 0",
                      borderBottom: "1px solid rgba(15,23,42,0.08)",
                    }}
                  >
                    <div>
                      {isEditing ? (
                        <input
                          value={editName}
                          onChange={(ev) => setEditName(ev.target.value)}
                          style={{ ...inputStyle, width: "100%", padding: 10 }}
                        />
                      ) : (
                        <a href={`/employees/${e.id}`} style={{ textDecoration: "underline", color: "var(--text)", fontWeight: 700 }}>
                          {e.name}
                        </a>
                      )}
                    </div>

                    <div style={{ textAlign: "right" }}>
                      {isEditing ? (
                        <input
                          value={editWage}
                          onChange={(ev) => setEditWage(ev.target.value)}
                          inputMode="numeric"
                          placeholder="시급(선택)"
                          style={{ ...inputStyle, width: "100%", padding: 10 }}
                        />
                      ) : e.hourly_wage != null ? (
                        <span style={{ color: "var(--muted)", fontSize: 14 }}>
                          시급 <b style={{ color: "var(--text)" }}>{e.hourly_wage.toLocaleString()}</b>불
                        </span>
                      ) : (
                        <span style={{ color: "rgba(71,85,105,0.7)", fontSize: 14 }}>시급 없음</span>
                      )}
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                      {isEditing ? (
                        <>
                          <button onClick={() => saveEdit(e.id)} style={btnPrimary}>
                            저장
                          </button>
                          <button onClick={cancelEdit} style={btnGhost}>
                            취소
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(e)} style={btnGhost}>
                            수정
                          </button>
                          <button
                            onClick={() => onDelete(e)}
                            style={{
                              ...btnGhost,
                              borderColor: "rgba(239,68,68,0.35)",
                              background: "rgba(239,68,68,0.08)",
                              color: "#991b1b",
                            }}
                          >
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

        {/* 작은 화면 대응: grid 깨지면 세로로 */}
        <style jsx>{`
          @media (max-width: 640px) {
            main {
              max-width: 100% !important;
            }
            div[style*="grid-template-columns: auto 1fr auto"] {
              grid-template-columns: 1fr !important;
            }
            div[style*="grid-template-columns: 1fr 180px auto"] {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </main>
    </PageShell>
  );
}
