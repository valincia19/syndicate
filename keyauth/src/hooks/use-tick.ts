"use client";

import { useState, useEffect } from "react";

export function useTick(intervalMs = 1000) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  return tick;
}
