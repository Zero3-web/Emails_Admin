"use client";

import { CircleAlert, CircleCheck, Info, Loader2, Mail, Send } from "lucide-react";
import { useState } from "react";

export function ResendTestForm() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("Prueba de envío");
  const [message, setMessage] = useState("Hola, este es un mensaje de prueba para verificar la integración de Resend y la configuración del dominio.");
  const [senderDomain, setSenderDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | null; message: string; id?: string }>({ type: null, message: "" });

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setStatus({ type: null, message: "" });
    try {
      const response = await fetch("/api/resend/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to, subject, message, senderDomain }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo enviar el correo");
      setStatus({ type: "success", message: data.message || "Correo enviado correctamente", id: data.id });
    } catch (error: unknown) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "No se pudo conectar con la API" });
    } finally { setLoading(false); }
  };

  return <section className={`card resend-console ${loading ? "is-processing" : ""}`} aria-busy={loading}>
    <header className="resend-console-head"><span className="resend-icon"><Mail size={18} /></span><div><h2>Enviar correo de prueba</h2><p>Valida el remitente, el contenido y la entrega mediante Resend.</p></div><span className="badge connected">API conectada</span></header>
    {status.type && <div className={`inline-feedback ${status.type}`} role="status" aria-live="polite">{status.type === "success" ? <CircleCheck className="feedback-icon" size={17} /> : <CircleAlert className="feedback-icon" size={17} />}<div><strong>{status.type === "success" ? "Envío aceptado" : "No se pudo enviar"}</strong><span>{status.message}</span>{status.id && <code>ID: {status.id}</code>}</div></div>}
    <form onSubmit={handleSend} className="resend-form">
      <div className="field"><label htmlFor="resend-sender">Remitente</label><input id="resend-sender" value={senderDomain} onChange={(event) => setSenderDomain(event.target.value)} placeholder="notificaciones@dominio.com" required /><span className="field-help"><Info size={13} /> Usa un remitente perteneciente a tu dominio verificado.</span></div>
      <div className="field"><label htmlFor="resend-to">Destinatario</label><input id="resend-to" type="email" value={to} onChange={(event) => setTo(event.target.value)} placeholder="nombre@empresa.com" required /></div>
      <div className="field full"><label htmlFor="resend-subject">Asunto</label><input id="resend-subject" value={subject} onChange={(event) => setSubject(event.target.value)} required /></div>
      <div className="field full"><label htmlFor="resend-message">Mensaje</label><textarea id="resend-message" rows={5} value={message} onChange={(event) => setMessage(event.target.value)} required /></div>
      <div className="resend-form-actions"><span>{loading ? "Conectando con Resend y registrando el envío…" : "El envío se realizará con la configuración actual."}</span><button type="submit" disabled={loading} className="btn primary" aria-busy={loading}>{loading ? <Loader2 className="spin" size={15} /> : <Send size={14} />}{loading ? "Enviando…" : status.type === "success" ? "Enviar otra prueba" : "Enviar prueba"}</button></div>
    </form>
  </section>;
}
