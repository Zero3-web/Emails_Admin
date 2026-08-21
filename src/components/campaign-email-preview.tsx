"use client";

import { Eye, Laptop, Smartphone, X } from "lucide-react";
import { useState } from "react";

export function CampaignEmailPreviewModalButton({
  siteName,
  html,
}: {
  siteName: string;
  html: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"desktop" | "mobile">("desktop");

  return (
    <>
      <button type="button" className="btn subtle campaign-preview-trigger" onClick={() => setIsOpen(true)}>
        <Eye size={14} /> Vista previa
      </button>

      {isOpen && (
        <div className="campaign-email-preview" role="dialog" aria-modal="true" aria-label="Vista previa del correo" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}>
          <header className="campaign-email-preview-head">
            <div className="campaign-email-preview-title" style={{ display: "grid", gap: "2px", minWidth: 0 }}>
              <strong style={{ display: "block", color: "#ffffff" }}>Vista previa del correo</strong>
              <span style={{ display: "block", color: "#9aa9bc" }}>{siteName}</span>
            </div>
            <div className="campaign-email-preview-modes" role="group" aria-label="Tamaño de la vista previa">
              <button type="button" className={mode === "desktop" ? "active" : ""} aria-pressed={mode === "desktop"} onClick={() => setMode("desktop")}><Laptop size={14} /> <span>Desktop</span></button>
              <button type="button" className={mode === "mobile" ? "active" : ""} aria-pressed={mode === "mobile"} onClick={() => setMode("mobile")}><Smartphone size={14} /> <span>Móvil</span></button>
            </div>
            <button type="button" className="campaign-email-preview-close" onClick={() => setIsOpen(false)} aria-label="Cerrar vista previa"><X size={16} /></button>
          </header>
          <main className="campaign-email-preview-viewport">
            <div className={`campaign-email-preview-paper ${mode}`}>
              <iframe title={`Vista previa de ${siteName}`} srcDoc={html} sandbox="allow-popups allow-popups-to-escape-sandbox" />
            </div>
          </main>
        </div>
      )}
    </>
  );
}
