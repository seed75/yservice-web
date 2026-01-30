function pad2(n: number) {
  return String(n).padStart(2, "0");
}

// "7" / "19" / "7:30" / "07:30" -> "HH:MM" or null
export function normalizeTimeInput(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  if (/^\d{1,2}$/.test(s)) {
    const h = Number(s);
    if (h < 0 || h > 23) return null;
    return `${pad2(h)}:00`;
  }

  if (/^\d{1,2}:\d{2}$/.test(s)) {
    const [hh, mm] = s.split(":");
    const h = Number(hh);
    const m = Number(mm);
    if (h < 0 || h > 23) return null;
    if (m < 0 || m > 59) return null;
    return `${pad2(h)}:${pad2(m)}`;
  }

  return null;
}

export function toHHMM(t: string | null) {
  if (!t) return "";
  return t.slice(0, 5); // "11:00:00" -> "11:00"
}

// ✅ 유도리: 퇴근이 출근보다 작으면 +12시간 시도(오후로 해석)
export function relaxEndTime(startHHMM: string | null, endHHMM: string | null): string | null {
  if (!startHHMM || !endHHMM) return endHHMM;

  const [sh, sm] = startHHMM.split(":").map(Number);
  const [eh, em] = endHHMM.split(":").map(Number);

  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;

  if (endMin >= startMin) return endHHMM;

  const endPlus12 = endMin + 12 * 60;
  if (endPlus12 >= startMin && endPlus12 < 24 * 60) {
    const h = Math.floor(endPlus12 / 60);
    const m = endPlus12 % 60;
    return `${pad2(h)}:${pad2(m)}`;
  }

  // 그래도 작으면(야간근무 등) 일단 그대로 반환 → RPC에서 막힐 수 있음
  return endHHMM;
}
