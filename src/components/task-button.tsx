"use client";
import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
export function TaskButton({
  name,
  label = "Ejecutar ahora",
  primary = false,
}: {
  name: string;
  label?: string;
  primary?: boolean;
}) {
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  async function run() {
    setState("loading");
    try {
      const response = await fetch(`/api/tasks/${name}`, { method: "POST" });
      setState(response.ok ? "success" : "error");
    } catch { setState("error"); }
  }
  return (
    <button className={`btn task-button ${primary ? "primary" : ""} is-${state}`} onClick={run} disabled={state === "loading"} aria-busy={state === "loading"}>
      {state === "loading"
        ? <><Loader2 className="spin" size={15} />Ejecutando…</>
        : state === "success"
          ? <><Check size={15} />Completado</>
          : state === "error"
            ? "Reintentar"
            : label}
    </button>
  );
}
