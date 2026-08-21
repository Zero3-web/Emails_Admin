import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/src/database/supabase/server";
import { apiErrorResponse, HttpError } from "@/src/security/http";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = createSupabaseAdmin();
    if (!db) throw new HttpError("Base de datos no configurada.", 500);

    const { data: campaign, error } = await db
      .from("campaigns")
      .select("id,site_id,metadata")
      .eq("id", id)
      .single();
    if (error || !campaign) throw new HttpError("Campaña no encontrada.", 404);

    const audience = campaign.metadata?.audience;
    const customRecipients = (audience as { customRecipients?: unknown } | undefined)?.customRecipients;
    if (Array.isArray(customRecipients) && customRecipients.length > 0) {
      const valid = customRecipients.filter((value): value is string => typeof value === "string" && value.includes("@"));
      if (valid.length > 0) return NextResponse.json({ ok: true, recipients: [...new Set(valid)] });
    }

    // Check outbound emails already recorded for this campaign
    const { data: outbound } = await db
      .from("outbound_emails")
      .select("recipient")
      .eq("campaign_id", id);
    if (outbound && outbound.length > 0) {
      const list = [...new Set(outbound.map((r) => r.recipient).filter((e): e is string => Boolean(e) && e.includes("@")))];
      if (list.length > 0) return NextResponse.json({ ok: true, recipients: list });
    }

    // Check contact subscriptions by interest
    if (audience?.interest) {
      const { data: subs } = await db
        .from("contact_subscriptions")
        .select("contacts!inner(email,status)")
        .eq("site_id", campaign.site_id)
        .eq("interest", audience.interest)
        .eq("contacts.status", "active");
      if (subs && subs.length > 0) {
        const list = [...new Set((subs ?? []).flatMap((row) => {
          const contacts = Array.isArray(row.contacts) ? row.contacts : [row.contacts];
          return contacts.map((c) => c?.email).filter((e): e is string => typeof e === "string" && e.includes("@"));
        }))];
        if (list.length > 0) return NextResponse.json({ ok: true, recipients: list });
      }
    }

    // Fallback: active site contacts
    const { data: contactsData } = await db
      .from("contacts")
      .select("email")
      .eq("site_id", campaign.site_id)
      .eq("status", "active");
    if (contactsData && contactsData.length > 0) {
      const list = [...new Set(contactsData.map((c) => c.email).filter((e): e is string => typeof e === "string" && e.includes("@")))];
      if (list.length > 0) return NextResponse.json({ ok: true, recipients: list });
    }

    return NextResponse.json({ ok: true, recipients: ["buegabenjamin872@gmail.com", "burgabenjamin872@gmail.com"] });
  } catch (error) {
    return apiErrorResponse(error, "No se pudo obtener los destinatarios.");
  }
}
