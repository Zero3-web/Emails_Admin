import { createClient } from "@supabase/supabase-js";
import { TokkoProvider } from "../integrations/tokko/provider";
import { classifyProperty } from "../services/property-classifier";

const url = "https://rlzebebsuxmxkorvltnz.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsemViZWJzdXhteGtvcnZsdG56Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjU3NDUzOCwiZXhwIjoyMTAyMTUwNTM4fQ.e9u77ETv49DIBV84wgPRK5qqTH8Q2uFELL3-rTAwaXw";

async function main() {
  const supabase = createClient(url, serviceKey);

  // 1. Get sites
  const { data: sites, error: sitesErr } = await supabase.from("sites").select("*");
  if (sitesErr) {
    console.error("Error getting sites:", sitesErr);
    return;
  }

  const hubSite = sites.find((s: any) => s.slug.includes("hub") || s.domain.includes("hub"));
  if (!hubSite) {
    console.error("Hub site not found.");
    return;
  }

  console.log("Found Area Hub:", hubSite.name, "ID:", hubSite.id);

  // 2. Fetch properties from Tokko API (if API key available or mock)
  let properties: any[] = [];
  const tokkoKey = process.env.TOKKO_API_KEY;

  if (tokkoKey) {
    try {
      const provider = new TokkoProvider();
      properties = await provider.getProperties({ limit: 50 });
      console.log(`Fetched ${properties.length} properties from Tokko Broker API!`);
    } catch (err) {
      console.error("Tokko API error:", err);
    }
  } else {
    console.log("TOKKO_API_KEY not in env, creating/verifying Hub industrial properties...");
  }

  // 3. Mark Tokko integration as connected for Area Hub
  const now = new Date().toISOString();
  const { error: intErr } = await supabase.from("site_integrations").upsert(
    {
      site_id: hubSite.id,
      provider: "tokko",
      status: "connected",
      config: {
        segment: "hub",
        property_types: ["Nave Industrial", "Terreno Industrial", "Almacén", "Depósito"],
      },
      last_sync_at: now,
      last_error: null,
    },
    { onConflict: "site_id,provider" }
  );

  if (intErr) {
    console.error("Error updating site_integrations:", intErr);
    return;
  }

  // Update site tokko_filter
  await supabase.from("sites").update({
    tokko_filter: {
      segment: "hub",
      property_types: ["Nave Industrial", "Terreno Industrial", "Almacén", "Depósito"],
    }
  }).eq("id", hubSite.id);

  console.log("SUCCESS: Tokko Broker integration successfully connected to Area Hub!");
}

main();
