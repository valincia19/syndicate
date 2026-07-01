"use client";

import React from "react";

export function SlantedPattern() {
  return (
    <div className="relative h-8 self-stretch overflow-hidden select-none">
      <div className="absolute inset-0 h-full w-full overflow-hidden">
        <div className="relative h-full w-full">
          {Array.from({ length: 300 }).map((_, i) => (
            <div
              key={i}
              className="outline-primary/45 absolute h-4 w-full origin-top-left -rotate-45 outline-[0.5px] outline-offset-[-0.25px]"
              style={{
                top: `${i * 16 - 120}px`,
                left: "-100%",
                width: "300%",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
