"use client";
/* eslint-disable @next/next/no-img-element -- Frozen campaign snapshots retain their external source image. */
import { Eye, Laptop, Smartphone, X } from "lucide-react";
import { useState } from "react";

interface PreviewItem {
  id: string;
  itemType: "property" | "blog_post";
  title: string;
  excerpt?: string;
  imageUrl: string;
  publicUrl: string;
  location?: string;
  area?: number;
  price?: number;
  currency?: string;
}

export function CampaignEmailPreviewModalButton({
  siteName,
  senderEmail,
  subject,
  introduction,
  items,
  recipientCount,
}: {
  siteName: string;
  senderEmail: string;
  subject: string;
  introduction?: string;
  items: PreviewItem[];
  recipientCount: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"desktop" | "mobile">("desktop");

  const brandAbbr = siteName
    .split(" ")
    .filter((w) => w.length > 1)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "AP";

  return (
    <>
      {/* Minimalist Top Trigger Button */}
      <button
        type="button"
        className="btn subtle"
        onClick={() => setIsOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 14px",
          fontSize: "12px",
          fontWeight: 600,
          borderRadius: "8px",
          border: "1px solid #cbd5e1",
          background: "#ffffff",
          color: "#0f172a",
          cursor: "pointer",
        }}
      >
        <Eye size={14} style={{ color: "#4f46e5" }} />
        Vista previa
      </button>

      {/* High-End Preview Modal Overlay */}
      {isOpen && (
        <div
          className="campaign-email-preview"
          role="dialog"
          aria-modal="true"
          aria-label="Vista previa del correo"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            background: "rgba(9, 13, 22, 0.82)",
            backdropFilter: "blur(6px)",
            display: "grid",
            gridTemplateRows: "60px 1fr",
            color: "#ffffff",
            overflow: "hidden",
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          {/* Modal Header Bar */}
          <header
            className="campaign-email-preview-head"
            style={{
              background: "#0f172a",
              borderBottom: "1px solid #1e293b",
              padding: "0 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff" }}>
                Vista previa del correo
              </span>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                ({siteName})
              </span>
            </div>

            {/* Desktop / Mobile Switcher */}
            <div
              className="campaign-email-preview-modes"
              style={{
                background: "#1e293b",
                padding: "3px",
                borderRadius: "8px",
                display: "flex",
                gap: "4px",
                border: "1px solid #334155",
              }}
            >
              <button
                type="button"
                onClick={() => setMode("desktop")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 14px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 150ms ease",
                  background: mode === "desktop" ? "#ffffff" : "transparent",
                  color: mode === "desktop" ? "#0f172a" : "#94a3b8",
                }}
              >
                <Laptop size={14} /> Desktop
              </button>
              <button
                type="button"
                onClick={() => setMode("mobile")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 14px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 150ms ease",
                  background: mode === "mobile" ? "#ffffff" : "transparent",
                  color: mode === "mobile" ? "#0f172a" : "#94a3b8",
                }}
              >
                <Smartphone size={14} /> Celular
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                background: "#1e293b",
                border: "1px solid #334155",
                color: "#94a3b8",
                borderRadius: "8px",
                width: "32px",
                height: "32px",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
              }}
              aria-label="Cerrar vista previa"
            >
              <X size={16} />
            </button>
          </header>

          {/* Modal Content Viewport */}
          <main
            className="campaign-email-preview-viewport"
            style={{
              overflowY: "auto",
              display: "grid",
              placeItems: "center",
              padding: mode === "desktop" ? "32px 24px" : "24px 16px",
              background: "#090d16",
            }}
          >
            <div
              className="campaign-email-preview-paper"
              style={{
                width: "100%",
                maxWidth: mode === "desktop" ? "640px" : "360px",
                background: "#ffffff",
                borderRadius: "14px",
                border: "1px solid #1e293b",
                boxShadow: "0 25px 60px rgba(0, 0, 0, 0.5)",
                overflow: "hidden",
                transition: "max-width 200ms ease",
              }}
            >
              {/* Email Header Bar */}
              <div
                style={{
                  padding: "16px 20px",
                  background: "#ffffff",
                  borderBottom: "1px solid #f1f5f9",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    background: "#0f172a",
                    color: "#ffffff",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 700,
                    fontSize: "14px",
                    flexShrink: 0,
                  }}
                >
                  {brandAbbr}
                </div>
                <div style={{ display: "grid", gap: "2px", flex: 1, minWidth: 0, fontSize: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <strong style={{ color: "#0f172a", fontSize: "14px" }}>{siteName}</strong>
                    <span style={{ color: "#94a3b8", fontSize: "11px" }}>Hoy, 10:30 AM</span>
                  </div>
                  <div style={{ color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {senderEmail}
                  </div>
                  <div style={{ color: "#64748b", marginTop: "2px" }}>
                    Para: <span style={{ color: "#334155", fontWeight: 500 }}>
                      {recipientCount > 0
                        ? `${recipientCount.toLocaleString("es-PE")} destinatario${recipientCount !== 1 ? "s" : ""}`
                        : "Sin destinatarios"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Email Body */}
              <div style={{ padding: mode === "desktop" ? "28px 24px" : "20px 16px", display: "grid", gap: "18px" }}>
                {/* Brand Banner */}
                <div style={{ borderBottom: "2px solid #0f172a", paddingBottom: "14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <strong style={{ fontSize: mode === "desktop" ? "20px" : "17px", color: "#0f172a", fontWeight: 800, letterSpacing: "-0.01em" }}>{siteName}</strong>
                  <span suppressHydrationWarning style={{ fontSize: "11px", color: "#64748b" }}>{new Date().toLocaleDateString("es-PE", { month: "short", year: "numeric" })}</span>
                </div>

                {/* Subject */}
                <h2 style={{ margin: 0, fontSize: mode === "desktop" ? "17px" : "15px", color: "#0f172a", fontWeight: 700, lineHeight: 1.35 }}>{subject}</h2>

                {/* Introduction */}
                {introduction && (
                  <p style={{ margin: 0, fontSize: "14px", color: "#334155", lineHeight: 1.55 }}>
                    {introduction}
                  </p>
                )}

                {/* Property / Post Cards */}
                <div style={{ display: "grid", gap: "14px" }}>
                  {items.map((item) => {
                    const detail = item.itemType === "property"
                      ? `${item.location ?? ""}${item.area ? ` · ${item.area} m²` : ""}`
                      : item.excerpt ?? "";
                    const priceLabel = item.itemType === "property" && item.price
                      ? `${item.currency ?? "USD"} ${item.price.toLocaleString("es-PE")}`
                      : null;

                    return (
                      <div key={item.id} style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "10px",
                        overflow: "hidden",
                        background: "#ffffff",
                        display: "grid",
                        gridTemplateColumns: mode === "desktop" && item.imageUrl ? "150px 1fr" : "1fr",
                      }}>
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            style={{ width: "100%", height: mode === "desktop" ? "100%" : "130px", objectFit: "cover", minHeight: mode === "desktop" ? "110px" : undefined }}
                          />
                        )}
                        <div style={{ padding: "14px", display: "grid", gap: "5px" }}>
                          <strong style={{ fontSize: "13px", color: "#0f172a", lineHeight: 1.35 }}>{item.title}</strong>
                          {detail && <span style={{ fontSize: "11px", color: "#64748b" }}>{detail}</span>}
                          {priceLabel && <span style={{ fontSize: "13px", color: "#0f172a", fontWeight: 700 }}>{priceLabel}</span>}
                          <div style={{ marginTop: "6px" }}>
                            <a
                              href={item.publicUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: "inline-block",
                                padding: "6px 14px",
                                background: "#0f172a",
                                color: "#ffffff",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: 600,
                                textDecoration: "none",
                              }}
                            >
                              {item.itemType === "property" ? "Ver propiedad" : "Leer artículo"} &rarr;
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "14px", textAlign: "center", fontSize: "11px", color: "#94a3b8" }}>
                  <p style={{ margin: "0 0 4px" }}>Recibes este correo por tu relación comercial con {siteName}.</p>
                  <span style={{ color: "#64748b", textDecoration: "underline" }}>Cancelar suscripción</span>
                </div>
              </div>
            </div>
          </main>
        </div>
      )}
    </>
  );
}
