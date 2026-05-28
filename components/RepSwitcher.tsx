"use client";

import { useEffect, useState } from "react";
import type { User } from "@/types";

const STORAGE_KEY = "pipeline.currentRep";

export default function RepSwitcher({ users }: { users: User[] }) {
  const [current, setCurrent] = useState<string>("");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && users.some((u) => u.id === stored)) {
      setCurrent(stored);
    } else if (users[0]) {
      setCurrent(users[0].id);
      localStorage.setItem(STORAGE_KEY, users[0].id);
    }
  }, [users]);

  function pick(id: string) {
    setCurrent(id);
    localStorage.setItem(STORAGE_KEY, id);
  }

  return (
    <select
      value={current}
      onChange={(e) => pick(e.target.value)}
      className="bg-transparent border border-line rounded px-2 py-1 text-sm focus:outline-none focus:border-ink"
    >
      {users.map((u) => (
        <option key={u.id} value={u.id}>
          {u.name}
        </option>
      ))}
    </select>
  );
}
