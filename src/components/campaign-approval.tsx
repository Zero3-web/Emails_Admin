"use client";

import Link from "next/link";
import { CheckCircle2, Loader2, Send, ShieldCheck, UsersRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Campaign } from "@/src/domain/types";

export function CampaignApproval({ campaign, canApprove }: { campaign: Campaign; canApprove: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [testEmail, setTestEmail] = useState("");
  const [savingTest, setSavingTest] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  const approved = campaign.status === "ready";

  async function approveAndSend() {
    setSaving(true);
    setError("");
    setSuccessMsg("");
    try {
      // 1. Approve the campaign (sets status to ready)
      const appResp = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const appRes = await appResp.json();
      if (!appResp.ok || !appRes.ok) {
        throw new Error(appRes.error ?? "No se pudo aprobar la campaña.");
      }

      // 2. Send the campaign immediately
      const sendResp = await fetch(`/api/campaigns/${campaign.id}/send`, {
        method: "POST",
      });
      const sendRes = await sendResp.json();
      if (!sendResp.ok || !sendRes.ok) {
        throw new Error(sendRes.error ?? "Se aprobó la campaña pero no se pudo enviar.");
      }

      setShowSuccessAnimation(true);
      setTimeout(() => {
        router.push("/activity");
      }, 1800);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo completar la acción.");
      setSaving(false);
    }
  }

  async function sendTest() {
    setSavingTest(true);
    setError("");
    setSuccessMsg("");
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/test`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: testEmail }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? "No se pudo enviar el correo de prueba.");
      setSuccessMsg(`Prueba enviada con éxito a ${testEmail}`);
      setTestEmail("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo enviar el correo de prueba.");
    } finally {
      setSavingTest(false);
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
      }, 1800);

      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo enviar la campaña.");
      setSending(false);
    }
  }

  if (showSuccessAnimation) {
    return (
      <section
        className="campaign-approval"
        aria-live="polite"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 12px",
          textAlign: "center",
        }}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @keyframes scaleIn {
            0% { transform: scale(0); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-scale-in {
            animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          }
          .animate-fade-in {
            animation: fadeIn 0.4s ease-out forwards;
          }
        `,
          }}
        />
        <div
          className="animate-scale-in"
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "var(--am-surface-2, #f3f4f6)",
            border: "2px solid #22c55e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#22c55e",
            marginBottom: "14px",
            boxShadow: "0 4px 12px rgba(34, 197, 94, 0.15)",
          }}
        >
          <CheckCircle2 size={32} />
        </div>
        <strong
          className="animate-fade-in"
          style={{ fontSize: "13px", color: "var(--am-ink, #1f2937)", marginBottom: "4px" }}
        >
          Campaña enviada con éxito
        </strong>
        <p
          className="animate-fade-in"
          style={{ fontSize: "11px", color: "var(--muted, #6b7280)", margin: 0, animationDelay: "0.2s" }}
        >
          Redirigiendo al historial...
        </p>
      </section>
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
          <Link href="/contacts">Agregar</Link>
        </div>
      )}

      {campaign.status === "draft" && canApprove && !confirming && (
        <div style={{ gridColumn: "1 / -1", display: "grid", gap: "12px", marginTop: "8px" }}>
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

          
        </div>
      )}

      {campaign.status === "draft" && canApprove && confirming && (
        <div className="campaign-confirm" style={{ gridColumn: "1 / -1", marginTop: "8px" }}>
          <p style={{ fontSize: "12px", color: "#334155", margin: "0 0 10px", lineHeight: 1.4 }}>
            ¿Confirmar aprobación y envío? La campaña se enviará inmediatamente a los{" "}
            <strong>{campaign.recipientCount.toLocaleString("es-PE")}</strong> destinatario(s).
          </p>
          <div style={{ display: "flex", flexDirection: "column-reverse", gap: "6px" }}>
            <button
              className="btn subtle"
              type="button"
              onClick={() => setConfirming(false)}
              disabled={saving}
              style={{ width: "100%", justifyContent: "center", fontSize: "12px" }}
            >
              Cancelar
            </button>
            <button
              className="btn primary"
              type="button"
              onClick={() => void approveAndSend()}
              disabled={saving}
              style={{
                width: "100%",
                justifyContent: "center",
                fontSize: "12px",
                padding: "8px 12px",
              }}
            >
              {saving ? <Loader2 className="spin" size={14} /> : <CheckCircle2 size={14} />}
              {saving ? "Enviando..." : "Confirmar y enviar ahora"}
            </button>
          </div>
        </div>
      )}

      {campaign.status === "draft" && !canApprove && (
        <small style={{ gridColumn: "1 / -1" }}>
          Solo un administrador o aprobador de esta marca puede aprobarla.
        </small>
      )}

      {approved && (
        <div style={{ gridColumn: "1 / -1", display: "grid", gap: "10px", marginTop: "8px" }}>
          <button
            type="button"
            onClick={() => void sendCampaign()}
            className="btn primary"
            disabled={sending}
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "10px",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            {sending ? <Loader2 className="spin" size={15} /> : "Enviar a destinatarios ahora"}
          </button>
        </div>
      )}
    </section>
  );
}
