"use client";

import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Campaign } from "@/src/domain/types";

export function CampaignApproval({ campaign, canApprove }: { campaign: Campaign; canApprove: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const approved = campaign.status === "ready";
  async function approve() {
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "approve" }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? "No se pudo aprobar la campaña.");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo aprobar la campaña."); setSaving(false); }
  }
  return <section className="campaign-approval" aria-live="polite">
    <div className="campaign-approval-icon">{approved ? <CheckCircle2 size={17} /> : <ShieldCheck size={17} />}</div>
    <div><strong>{approved ? "Lista para envío de prueba" : "Revisión manual"}</strong><p>{approved ? "La campaña fue aprobada. El envío masivo permanece bloqueado." : "Verifica contenido y audiencia antes de aprobarla."}</p></div>
    {error && <p className="notice error">{error}</p>}
    {campaign.status === "draft" && canApprove && !confirming && <button className="btn primary" type="button" onClick={() => setConfirming(true)} disabled={!campaign.recipientCount}>Revisar y aprobar</button>}
    {campaign.status === "draft" && canApprove && confirming && <div className="campaign-confirm"><p>La aprobación no enviará correos. Solo preparará esta campaña para una prueba.</p><div><button className="btn" type="button" onClick={() => setConfirming(false)} disabled={saving}>Cancelar</button><button className="btn primary" type="button" onClick={() => void approve()} disabled={saving}>{saving ? <Loader2 className="spin" size={15} /> : <CheckCircle2 size={15} />}{saving ? "Aprobando…" : "Confirmar aprobación"}</button></div></div>}
    {campaign.status === "draft" && !canApprove && <small>Solo un administrador o aprobador de esta marca puede aprobarla.</small>}
  </section>;
}
