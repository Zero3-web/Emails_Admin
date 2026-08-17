import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

function loadEnv() {
  try {
    const envPath = path.resolve(".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
          const [key, ...vals] = trimmed.split("=");
          const value = vals.join("=").trim();
          if (key.trim() && value) {
            process.env[key.trim()] = value;
          }
        }
      }
    }
  } catch (e) {
    console.error("Error loading .env:", e);
  }
}

loadEnv();

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://rlzebebsuxmxkorvltnz.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("----------------------------------------");
console.log("DIAGNOSTICO DE CONEXION A SUPABASE");
console.log("----------------------------------------");
console.log("URL:", url);
console.log("SUPABASE_SERVICE_ROLE_KEY presente:", Boolean(serviceKey));
console.log("NEXT_PUBLIC_SUPABASE_ANON_KEY presente:", Boolean(anonKey));

const keyToUse = serviceKey || anonKey;

if (!keyToUse) {
  console.error("❌ CRÍTICO: No se encontró la clave de API de Supabase.");
  process.exit(1);
}

const supabase = createClient(url, keyToUse, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function runTest() {
  let hasError = false;

  console.log("\n[PRUEBA 1] Consultando tabla 'sites'...");
  const { data: sites, error: sitesErr } = await supabase.from("sites").select("*");
  if (sitesErr) {
    console.error("❌ Error al consultar 'sites':", sitesErr.message);
    hasError = true;
  } else {
    console.log(`✅ ¡Éxito! Tabla 'sites' alcanzable. Se encontraron ${sites.length} registros.`);
    if (sites.length > 0) {
      console.log("Ejemplo de sitio:", sites[0]);
    }
  }

  console.log("\n[PRUEBA 2] Consultando tabla 'automation_settings'...");
  const { data: autos, error: autosErr } = await supabase.from("automation_settings").select("*");
  if (autosErr) {
    console.error("❌ Error al consultar 'automation_settings':", autosErr.message);
    hasError = true;
  } else {
    console.log(`✅ ¡Éxito! Tabla 'automation_settings' alcanzable. Se encontraron ${autos.length} registros.`);
  }

  console.log("\n[PRUEBA 3] Consultando tabla 'properties'...");
  const { data: props, error: propsErr } = await supabase.from("properties").select("*").limit(3);
  if (propsErr) {
    console.error("❌ Error al consultar 'properties':", propsErr.message);
    hasError = true;
  } else {
    console.log(`✅ ¡Éxito! Tabla 'properties' alcanzable. Se encontraron ${props.length} registros.`);
  }

  console.log("\n[PRUEBA 4] Consultando tabla 'campaigns'...");
  const { data: camps, error: campsErr } = await supabase.from("campaigns").select("*").limit(3);
  if (campsErr) {
    console.error("❌ Error al consultar 'campaigns':", campsErr.message);
    hasError = true;
  } else {
    console.log(`✅ ¡Éxito! Tabla 'campaigns' alcanzable. Se encontraron ${camps.length} registros.`);
  }

  console.log("\n[PRUEBA 5] Consultando tabla 'outbound_emails'...");
  const { data: emails, error: emailsErr } = await supabase.from("outbound_emails").select("*").limit(3);
  if (emailsErr) {
    console.error("❌ Error al consultar 'outbound_emails':", emailsErr.message);
    hasError = true;
  } else {
    console.log(`✅ ¡Éxito! Tabla 'outbound_emails' alcanzable. Se encontraron ${emails.length} registros.`);
  }

  console.log("\n[PRUEBA 6] Consultando tabla 'email_events'...");
  const { data: events, error: eventsErr } = await supabase.from("email_events").select("*").limit(3);
  if (eventsErr) {
    console.error("❌ Error al consultar 'email_events':", eventsErr.message);
    hasError = true;
  } else {
    console.log(`✅ ¡Éxito! Tabla 'email_events' alcanzable. Se encontraron ${events.length} registros.`);
  }

  console.log("\n----------------------------------------");
  if (hasError) {
    console.log("⚠️ La conexión tuvo algunos errores.");
  } else {
    console.log("🎉 CONEXIÓN EXITOSA A SUPABASE Y TODAS LAS TABLAS!");
  }
  console.log("----------------------------------------");
}

runTest();
