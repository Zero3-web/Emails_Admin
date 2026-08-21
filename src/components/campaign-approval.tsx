"use client";

import { CheckCircle2, Loader2, Send, ShieldCheck, Trash2, UsersRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Campaign } from "@/src/domain/types";
import { PrepareAudienceButton } from "@/src/components/prepare-audience-button";

const sendingSteps = [
  "Armando estructura de la campaña...",
  "Validando destinatarios y plantilla...",
  "Procesando la aprobación...",
  "Entregando correos a los destinatarios...",
];

export function CampaignApproval({ 
  campaign, 
  canApprove,
  onDeleted,
}: { 
  campaign: Campaign; 
  canApprove: boolean;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [sending, setSending] = useState(false);
  const [confirmingSend, setConfirmingSend] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!saving && !sending) {
      setLoadingStepIndex(0);
      return;
    }
    const timer = setInterval(() => {
      setLoadingStepIndex((prev) => (prev + 1) % sendingSteps.length);
    }, 1400);
    return () => clearInterval(timer);
  }, [saving, sending]);

  const approved = campaign.status === "ready";

  async function deleteDraft() {
    setDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? "No se pudo eliminar la campaña.");
      if (onDeleted) onDeleted();
      router.push("/campaigns");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo eliminar la campaña.");
      setDeleting(false);
    }
  }

  async function approveAndSend() {
    setSaving(true);
    setError("");
    setSuccessMsg("");
    try {
      // 1. Approve campaign
      const appResp = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const appRes = await appResp.json();
      if (!appResp.ok || !appRes.ok) {
        console.warn("Approval patch:", appRes);
      }

      // 2. Send campaign immediately
      const sendResp = await fetch(`/api/campaigns/${campaign.id}/send`, {
        method: "POST",
      });
      const sendRes = await sendResp.json();
      if (!sendResp.ok || !sendRes.ok) {
        throw new Error(sendRes.error ?? "No se pudo enviar la campaña.");
      }

      setShowSuccessAnimation(true);
      setTimeout(() => {
        router.push("/activity");
        router.refresh();
      }, 1600);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo completar la acción.");
      setSaving(false);
    }
  }

  async function sendCampaign() {
    setSending(true);
    setError("");
    setSuccessMsg("");
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/send`, { method: "POST" });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? "No se pudo enviar la campaña.");

      setShowSuccessAnimation(true);
      setTimeout(() => {
        router.push("/activity");
        router.refresh();
      }, 1600);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo enviar la campaña.");
      setSending(false);
    }
  }

  if (saving || sending || showSuccessAnimation) {
    return (
      <div
        className="campaign-sending-overlay"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 999999,
          background: "var(--am-surface, #ffffff)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px",
          textAlign: "center",
        }}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-step-text {
            animation: fadeIn 0.35s ease-out forwards;
          }
        `,
          }}
        />

        {showSuccessAnimation ? (
          <div key="success" className="animate-step-text">
            <h2
              style={{ fontSize: "24px", fontWeight: 700, color: "#15803d", margin: "0 0 8px" }}
            >
              ¡Campaña enviada con éxito!
            </h2>
            <p style={{ fontSize: "14px", color: "var(--muted, #64748b)", margin: 0 }}>
              Redirigiendo al historial de envíos...
            </p>
          </div>
        ) : (
          <div key={loadingStepIndex} className="animate-step-text">
            <h2 style={{ fontSize: "22px", fontWeight: 700, color: "var(--am-ink, #0f172a)", margin: "0 0 8px" }}>
              {sendingSteps[loadingStepIndex]}
            </h2>
            <p style={{ fontSize: "13px", color: "var(--muted, #64748b)", margin: 0 }}>
              Por favor espera un momento...
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="campaign-approval" aria-live="polite">
      <div className="campaign-approval-icon">
        {approved ? <CheckCircle2 size={17} /> : <ShieldCheck size={17} />}
      </div>
      <div>
        <strong>
          {campaign.status === "sent"
            ? "Campaña enviada"
            : approved
              ? "Lista para envíos"
              : "Aprobación y envío"}
        </strong>
        <p>
          {campaign.status === "sent"
            ? campaign.sentAt
              ? `La campaña ya fue enviada el ${campaign.sentAt}.`
              : "La campaña ya fue enviada."
            : approved
              ? "La campaña fue aprobada. Puedes realizar envíos de prueba o iniciar el envío masivo ahora."
              : "Verifica contenido y envía la campaña a todos los destinatarios."}
        </p>
      </div>

      {error && (
        <p className="notice error campaign-approval-error" style={{ gridColumn: "1 / -1" }}>
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Cerrar error">
            <X size={13} />
          </button>
        </p>
      )}

      {successMsg && (
        <p
          className="notice success campaign-approval-success"
          style={{
            gridColumn: "1 / -1",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            color: "#166534",
            padding: "8px 10px",
            borderRadius: "6px",
            fontSize: "12px",
            margin: "6px 0 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{successMsg}</span>
          <button
            type="button"
            onClick={() => setSuccessMsg("")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#166534" }}
            aria-label="Cerrar mensaje"
          >
            <X size={13} />
          </button>
        </p>
      )}

      {campaign.status === "draft" && canApprove && !campaign.recipientCount && (
        <div className="campaign-approval-blocked" style={{ gridColumn: "1 / -1" }}>
          <UsersRound size={15} />
          <span>
            <strong>Falta audiencia</strong>
            <small>Necesitas al menos un contacto elegible.</small>
          </span>
          <PrepareAudienceButton campaignId={campaign.id} siteId={campaign.siteId} interest={campaign.metadata?.audience?.interest ?? "prime"} label="Agregar" />
        </div>
      )}

      {campaign.status === "draft" && canApprove && !confirming && (
        <div style={{ gridColumn: "1 / -1", display: "grid", gap: "10px", marginTop: "8px" }}>
          {/* Main Action: Approve & Send */}
          <button
            className="btn primary"
            type="button"
            onClick={() => setConfirming(true)}
            disabled={!campaign.recipientCount}
            title={!campaign.recipientCount ? "Agrega contactos para habilitar el envío" : undefined}
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "10px 14px",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            <Send size={14} /> Aprobar y enviar
          </button>

          {/* Delete Draft Button */}
          {!confirmingDelete ? (
            <button
              className="btn subtle"
              type="button"
              onClick={() => setConfirmingDelete(true)}
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "8px 12px",
                fontSize: "12px",
                color: "#ef4444",
                border: "1px solid #fee2e2",
                background: "#fef2f2",
                borderRadius: "6px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <Trash2 size={13} /> Eliminar borrador
            </button>
          ) : (
            <div
              style={{
                padding: "10px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <p style={{ margin: 0, fontSize: "12px", color: "#991b1b", fontWeight: 600 }}>
                ¿Eliminar borrador? Se borrará permanentemente.
              </p>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  className="btn subtle"
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                  style={{ flex: 1, fontSize: "12px", padding: "6px" }}
                >
                  Cancelar
                </button>
                <button
                  className="btn primary"
                  type="button"
                  onClick={() => void deleteDraft()}
                  disabled={deleting}
                  style={{
                    flex: 1,
                    fontSize: "12px",
                    padding: "6px",
                    background: "#dc2626",
                    borderColor: "#dc2626",
                    color: "#ffffff",
                  }}
                >
                  {deleting ? <Loader2 className="spin" size={13} /> : <Trash2 size={13} />}
                  {deleting ? "Eliminando..." : "Sí, eliminar"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {campaign.status === "draft" && canApprove && confirming && (
        <div
          className="campaign-confirm"
          style={{
            gridColumn: "1 / -1",
            width: "100%",
            boxSizing: "border-box",
            marginTop: "10px",
            padding: "12px 14px",
            background: "#fffdf0",
            border: "1px solid #fef08a",
            borderRadius: "10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          }}
        >
          <p style={{ fontSize: "12px", color: "#334155", margin: "0 0 12px", lineHeight: 1.5 }}>
            ¿Confirmar aprobación y envío? La campaña se enviará inmediatamente a los{" "}
            <strong>{campaign.recipientCount.toLocaleString("es-PE")}</strong> destinatario(s).
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%", boxSizing: "border-box" }}>
            <button
              className="btn primary"
              type="button"
              onClick={() => void approveAndSend()}
              disabled={saving}
              style={{
                width: "100%",
                maxWidth: "100%",
                boxSizing: "border-box",
                justifyContent: "center",
                fontSize: "12px",
                padding: "9px 10px",
                fontWeight: 600,
                background: "var(--am-lime, #d3ff00)",
                borderColor: "var(--am-lime, #d3ff00)",
                color: "#101828",
                borderRadius: "8px",
                whiteSpace: "normal",
                wordBreak: "break-word",
              }}
            >
              <CheckCircle2 size={14} />
              Confirmar envío
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={saving}
              style={{
                width: "100%",
                maxWidth: "100%",
                boxSizing: "border-box",
                justifyContent: "center",
                fontSize: "12px",
                background: "transparent",
                border: "none",
                color: "#64748b",
                cursor: "pointer",
                padding: "6px",
                fontWeight: 500,
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {campaign.status === "draft" && !canApprove && (
        <small style={{ gridColumn: "1 / -1" }}>
          Solo un administrador o aprobador de esta marca puede aprobarla.
        </small>
      )}

      {approved && !confirmingSend && (
        <div style={{ gridColumn: "1 / -1", display: "grid", gap: "10px", marginTop: "8px", width: "100%", boxSizing: "border-box" }}>
          <button
            type="button"
            onClick={() => setConfirmingSend(true)}
            className="btn primary"
            disabled={sending}
            style={{
              width: "100%",
              maxWidth: "100%",
              boxSizing: "border-box",
              justifyContent: "center",
              padding: "9px 10px",
              fontSize: "12px",
              fontWeight: 600,
              background: "var(--am-lime, #d3ff00)",
              borderColor: "var(--am-lime, #d3ff00)",
              color: "#101828",
              borderRadius: "8px",
            }}
          >
            <Send size={14} />
            Enviar a destinatarios ahora
          </button>
        </div>
      )}

      {approved && confirmingSend && (
        <div
          className="campaign-confirm"
          style={{
            gridColumn: "1 / -1",
            width: "100%",
            boxSizing: "border-box",
            marginTop: "10px",
            padding: "12px 14px",
            background: "#fffdf0",
            border: "1px solid #fef08a",
            borderRadius: "10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          }}
        >
          <p style={{ fontSize: "12px", color: "#334155", margin: "0 0 12px", lineHeight: 1.5 }}>
            Se enviará <strong>{campaign.name}</strong> a <strong>{campaign.recipientCount.toLocaleString("es-PE")}</strong> {campaign.recipientCount === 1 ? "destinatario" : "destinatarios"}. Esta acción no se puede deshacer.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%", boxSizing: "border-box" }}>
            <button
              className="btn primary"
              type="button"
              onClick={() => void sendCampaign()}
              disabled={sending}
              style={{
                width: "100%",
                maxWidth: "100%",
                boxSizing: "border-box",
                justifyContent: "center",
                fontSize: "12px",
                padding: "9px 10px",
                fontWeight: 600,
                background: "var(--am-lime, #d3ff00)",
                borderColor: "var(--am-lime, #d3ff00)",
                color: "#101828",
                borderRadius: "8px",
                whiteSpace: "normal",
                wordBreak: "break-word",
              }}
            >
              <Send size={14} />
              Confirmar envío
            </button>
            <button
              type="button"
              onClick={() => setConfirmingSend(false)}
              disabled={sending}
              style={{
                width: "100%",
                maxWidth: "100%",
                boxSizing: "border-box",
                justifyContent: "center",
                fontSize: "12px",
                background: "transparent",
                border: "none",
                color: "#64748b",
                cursor: "pointer",
                padding: "6px",
                fontWeight: 500,
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
