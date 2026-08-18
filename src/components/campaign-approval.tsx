"use client";

import Link from "next/link";
import { CheckCircle2, Loader2, ShieldCheck, UsersRound, X } from "lucide-react";
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

  async function approve() {
    setSaving(true); setError(""); setSuccessMsg("");
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "approve" }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? "No se pudo aprobar la campaña.");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo aprobar la campaña."); setSaving(false); }
  }

  async function sendTest() {
    setSavingTest(true); setError(""); setSuccessMsg("");
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/test`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: testEmail }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? "No se pudo enviar el correo de prueba.");
      setSuccessMsg(`Correo de prueba enviado con éxito a ${testEmail}`);
      setTestEmail("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo enviar el correo de prueba.");
    } finally {
      setSavingTest(false);
    }
  }

  async function sendCampaign() {
    setSending(true); setError(""); setSuccessMsg("");
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
    return <section className="campaign-approval" aria-live="polite" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 12px", textAlign: "center" }}>
      <style dangerouslySetInnerHTML={{__html: `
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
      `}} />
      <div className="animate-scale-in" style={{
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
        boxShadow: "0 4px 12px rgba(34, 197, 94, 0.15)"
      }}>
        <CheckCircle2 size={32} />
      </div>
      <strong className="animate-fade-in" style={{ fontSize: "13px", color: "var(--am-ink, #1f2937)", marginBottom: "4px" }}>
        Campaña enviada con éxito
      </strong>
      <p className="animate-fade-in" style={{ fontSize: "11px", color: "var(--muted, #6b7280)", margin: 0, animationDelay: "0.2s" }}>
        Redirigiendo al historial...
      </p>
    </section>;
  }

  return <section className="campaign-approval" aria-live="polite">
    <div className="campaign-approval-icon">{approved ? <CheckCircle2 size={17} /> : <ShieldCheck size={17} />}</div>
    <div>
      <strong>{campaign.status === "sent" ? "Campaña enviada" : approved ? "Lista para envíos" : "Revisión manual"}</strong>
      <p>
        {campaign.status === "sent" 
          ? (campaign.sentAt ? `La campaña ya fue enviada el ${campaign.sentAt}.` : "La campaña ya fue enviada.")
          : approved 
            ? "La campaña fue aprobada. Puedes realizar envíos de prueba o iniciar el envío masivo ahora."
            : "Verifica contenido y audiencia antes de aprobarla."}
      </p>
    </div>

    {error && <p className="notice error campaign-approval-error"><span>{error}</span><button type="button" onClick={() => setError("")} aria-label="Cerrar error"><X size={13} /></button></p>}
    {successMsg && <p className="notice success campaign-approval-success" style={{ background: "var(--am-surface-2)", border: "1px solid var(--am-border)", padding: "10px", borderRadius: "6px", fontSize: "12px", width: "100%", margin: "10px 0 0" }}><span>{successMsg}</span><button type="button" onClick={() => setSuccessMsg("")} style={{ float: "right", background: "none", border: "none", cursor: "pointer" }} aria-label="Cerrar mensaje"><X size={13} /></button></p>}

    {campaign.status === "draft" && canApprove && !campaign.recipientCount && <div className="campaign-approval-blocked"><UsersRound size={15}/><span><strong>Falta audiencia</strong><small>Necesitas al menos un contacto elegible.</small></span><Link href="/contacts">Agregar</Link></div>}
    {campaign.status === "draft" && canApprove && !confirming && <button className="btn primary" type="button" onClick={() => setConfirming(true)} disabled={!campaign.recipientCount} title={!campaign.recipientCount ? "Agrega contactos para habilitar la aprobación" : undefined}>Revisar y aprobar</button>}
    {campaign.status === "draft" && canApprove && confirming && <div className="campaign-confirm"><p>La aprobación no enviará correos. Solo preparará esta campaña para una prueba.</p><div style={{ display: "flex", flexDirection: "column-reverse", gap: "8px" }}><button className="btn" type="button" onClick={() => setConfirming(false)} disabled={saving}>Cancelar</button><button className="btn primary" type="button" onClick={() => void approve()} disabled={saving}>{saving ? <Loader2 className="spin" size={15} /> : <CheckCircle2 size={15} />}{saving ? "Aprobando…" : "Confirmar aprobación"}</button></div></div>}
    {campaign.status === "draft" && !canApprove && <small style={{ gridColumn: "1 / -1" }}>Solo un administrador o aprobador de esta marca puede aprobarla.</small>}

    {approved && (
      <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "10px", marginTop: "14px", width: "100%" }}>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="correo@prueba.com"
            className="input"
            style={{ flex: 1, padding: "8px 10px", fontSize: "13px", height: "36px", border: "1px solid var(--am-border)", borderRadius: "6px", background: "var(--am-surface)" }}
          />
          <button
            type="button"
            onClick={() => void sendTest()}
            className="btn"
            disabled={savingTest || !testEmail.includes("@")}
            style={{ padding: "8px 12px", fontSize: "13px", height: "36px", cursor: "pointer" }}
          >
            {savingTest ? <Loader2 className="spin" size={14} /> : "Probar"}
          </button>
        </div>
        
        <button
          type="button"
          onClick={() => void sendCampaign()}
          className="btn primary"
          disabled={sending}
          style={{ width: "100%", padding: "10px", height: "38px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {sending ? <Loader2 className="spin" size={15} /> : "Enviar a destinatarios ahora"}
        </button>
      </div>
    )}
  </section>;
}
