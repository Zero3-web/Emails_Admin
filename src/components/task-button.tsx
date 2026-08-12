"use client";
import { useState } from "react";
export function TaskButton({
  name,
  label = "Ejecutar ahora",
}: {
  name: string;
  label?: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  async function run() {
    setState("loading");
    const response = await fetch(`/api/tasks/${name}`, { method: "POST" });
    setState(response.ok ? "success" : "error");
  }
  return (
    <button className="btn" onClick={run} disabled={state === "loading"}>
      {state === "loading"
        ? "Ejecutando…"
        : state === "success"
          ? "Completado ✓"
          : state === "error"
            ? "Reintentar"
            : label}
    </button>
  );
}
