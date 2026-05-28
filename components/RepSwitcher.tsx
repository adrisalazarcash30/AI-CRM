"use client";

import { useEffect, useState } from "react";
import type { User } from "@/types";
import { initials } from "@/lib/format";

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

  const me = users.find((u) => u.id === current) ?? users[0];

  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <span className="w-8 h-8 rounded-full bg-forest text-white flex items-center justify-center text-[11px] font-semibold">
        {initials(me?.name)}
      </span>
      <select
        value={current}
        onChange={(e) => pick(e.target.value)}
        className="bg-transparent border-0 text-[13px] text-inkDeep focus:outline-none cursor-pointer"
        aria-label="Switch rep"
      >
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
    </label>
  );
}
