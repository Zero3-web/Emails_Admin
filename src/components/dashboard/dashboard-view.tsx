"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Send, Zap, Activity } from "lucide-react";
import type { BlogPost, Contact, Property, Site } from "@/src/domain/types";
import { CampaignComposer } from "@/src/components/campaign-composer";

type DashboardViewProps = {
  sites: Site[];
  selectedSiteId?: string;
  properties: Property[];
  posts: BlogPost[];
  contacts: Contact[];
  contactsReady: boolean;
};

export function DashboardView({
  sites,
  selectedSiteId,
  properties,
  posts,
  contacts,
  contactsReady,
}: DashboardViewProps) {
  const [showComposer, setShowComposer] = useState(false);
  const [currentSiteId, setCurrentSiteId] = useState(selectedSiteId);

  useEffect(() => {
    setCurrentSiteId(selectedSiteId);
  }, [selectedSiteId]);

  useEffect(() => {
    const onSiteChange = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail !== undefined) {
        setCurrentSiteId(custom.detail === "all" ? undefined : custom.detail);
      }
    };
    window.addEventListener("area-mail-site-change", onSiteChange);
    return () => window.removeEventListener("area-mail-site-change", onSiteChange);
  }, []);

  const activeSite = sites.find((s) => s.id === currentSiteId);
  const greetingName = activeSite ? activeSite.name : "Todas las marcas";
  const siteQueryOnly = currentSiteId ? `?site=${currentSiteId}` : "";

  return (
    <div className="up-dashboard dashboard-workspace">
      <header className="minimal-page-head dashboard-head">
        <div>
          <h1>Hola {greetingName}</h1>
          <p>¿Qué vamos a hacer hoy?</p>
        </div>
      </header>

      <section className={`dashboard-shortcuts ${showComposer ? "is-modal-open" : ""}`} aria-label="Accesos rápidos">
        <button
          type="button"
          onClick={() => setShowComposer(true)}
          className="shortcut-card"
          style={{ width: "100%", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
        >
          <span className="shortcut-icon"><Send size={18} /></span>
          <div>
            <h3>Enviar correo</h3>
            <p>Crea y envía una nueva campaña de correo electrónico</p>
          </div>
        </button>
        <Link href={`/automations${siteQueryOnly}`} className="shortcut-card">
          <span className="shortcut-icon"><Zap size={18} /></span>
          <div>
            <h3>Crear automatización</h3>
            <p>Configura flujos automáticos de envío por marca</p>
          </div>
        </Link>
        <Link href={`/analytics${siteQueryOnly}`} className="shortcut-card">
          <span className="shortcut-icon"><Activity size={18} /></span>
          <div>
            <h3>Revisar analíticas</h3>
            <p>Monitorea la entrega de correos y estadísticas</p>
          </div>
        </Link>
      </section>

      {showComposer && (
        <CampaignComposer
          sites={sites}
          initialSiteId={currentSiteId}
          properties={properties}
          posts={posts}
          contacts={contacts}
          contactsReady={contactsReady}
          initialOpen={true}
          onClose={() => setShowComposer(false)}
        />
      )}
    </div>
  );
}

