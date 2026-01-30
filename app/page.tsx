"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const [name, setName] = useState("");

  async function addEmployee() {
    const { data, error } = await supabase
      .from("employees")
      .insert([{ name }])
      .select()
      .single();

    if (error) {
      alert(error.message);
      return;
    }
    alert(`추가됨: ${data.name}`);
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Supabase 테스트</h1>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="직원 이름"
        style={{ padding: 8, border: "1px solid #ccc" }}
      />
      <button onClick={addEmployee} style={{ marginLeft: 8, padding: 8 }}>
        직원 추가
      </button>
    </main>
  );
}
