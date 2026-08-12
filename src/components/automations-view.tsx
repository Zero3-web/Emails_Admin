"use client";
import { useState } from "react";
import type { Automation, Site } from "@/src/domain/types";
import { SiteMark } from "./ui";

export function AutomationsView({
  initial,
  sites,
}: {
  initial: Automation[];
  sites: Site[];
}) {
  const [items, setItems] = useState(initial);
  const [message, setMessage] = useState("");
  async function update(id: string, patch: Partial<Automation>) {
    const previous = items;
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
    const response = await fetch(`/api/automations/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!response.ok) setItems(previous);
    setMessage(
      response.ok
        ? "Automatización actualizada."
        : "No se pudo guardar el cambio.",
    );
  }
  return (
    <>
      <div className="automation-groups">
        {sites.map((site) => (
          <section key={site.id}>
            <div className="group-head">
              <SiteMark site={site} small />
              {site.name.toUpperCase()}
            </div>
            <div className="card">
              {items
                .filter((item) => item.siteId === site.id)
                .map((item) => (
                  <div className="automation-card editable" key={item.id}>
                    <div>
                      <strong>{item.name}</strong>
                      <div className="muted automation-code">{item.type}</div>
                    </div>
                    <div className="compact-field">
                      <label htmlFor={`${item.id}-frequency`}>Frecuencia</label>
                      <select
                        id={`${item.id}-frequency`}
                        value={item.frequency}
                        onChange={(event) =>
                          update(item.id, {
                            frequency: event.target
                              .value as Automation["frequency"],
                          })
                        }
                      >
                        <option value="weekly">Semanal</option>
                        <option value="monthly">Mensual</option>
                      </select>
                    </div>
                    <div className="compact-field">
                      <label htmlFor={`${item.id}-day`}>Día</label>
                      <input
                        id={`${item.id}-day`}
                        type="number"
                        min="1"
                        max={item.frequency === "weekly" ? "7" : "28"}
                        value={item.day}
                        onChange={(event) =>
                          update(item.id, { day: Number(event.target.value) })
                        }
                      />
                    </div>
                    <div className="compact-field">
                      <label htmlFor={`${item.id}-time`}>Hora</label>
                      <input
                        id={`${item.id}-time`}
                        type="time"
                        value={item.sendTime}
                        onChange={(event) =>
                          update(item.id, { sendTime: event.target.value })
                        }
                      />
                    </div>
                    <button
                      aria-label={`${item.isEnabled ? "Desactivar" : "Activar"} ${item.name}`}
                      className={`toggle ${item.isEnabled ? "on" : ""}`}
                      onClick={() =>
                        update(item.id, { isEnabled: !item.isEnabled })
                      }
                    />
                  </div>
                ))}
            </div>
          </section>
        ))}
      </div>
      <div className="toast" aria-live="polite">
        {message}
      </div>
    </>
  );
}
