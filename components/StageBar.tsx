"use client";

import type { Stage } from "@/types";
import { STAGES, STAGE_LABEL } from "@/types";

interface Props {
  counts: Record<Stage, number>;
}

export default function StageBar({ counts }: Props) {
  return (
    <div className="flex items-stretch gap-0 select-none">
      {STAGES.map((stage, i) => {
        const isFirst = i === 0;
        const isLast = i === STAGES.length - 1;
        // Closed Lost gets the muted navy
        const muted = stage === "closed_lost";
        const clipPath = isFirst
          ? "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)"
          : "polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%)";
        return (
          <div
            key={stage}
            className={`flex-1 h-11 flex items-center justify-center text-white whitespace-nowrap ${
              isLast ? "" : "-mr-3.5"
            }`}
            style={{
              clipPath,
              background: muted
                ? "#2A3B5A"
                : "linear-gradient(180deg, #0F1F3D 0%, #1A2F52 100%)",
              paddingLeft: isFirst ? "14px" : "28px",
              paddingRight: isLast ? "14px" : "28px",
            }}
          >
            <span
              className="text-[11px] font-semibold uppercase"
              style={{ letterSpacing: "0.08em" }}
            >
              {STAGE_LABEL[stage].toUpperCase()}{" "}
              <span className="opacity-70 font-normal ml-1">
                ({counts[stage] ?? 0})
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
