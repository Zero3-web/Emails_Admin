import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = fs.readFileSync(".env.local", "utf-8");
const envVars: Record<string, string> = {};
for (const line of env.split("\n")) {
  const parts = line.split("=");
  if (parts.length >= 2 && !parts[0].startsWith("#")) {
    envVars[parts[0].trim()] = parts.slice(1).join("=").trim();
  }
}

const supabase = createClient(envVars["SUPABASE_URL"]!, envVars["SUPABASE_SERVICE_ROLE_KEY"]!);

async function main() {
  const { data: emails } = await supabase.from("outbound_emails").select("*");
  console.log("=== Outbound Emails in DB ===");
  console.log(JSON.stringify(emails, null, 2));

  const { data: camps } = await supabase.from("campaigns").select("*");
  console.log("=== Campaigns in DB ===");
  console.log(JSON.stringify(camps, null, 2));

  const { data: contacts } = await supabase.from("contacts").select("*");
  console.log("=== Contacts count in DB ===", contacts?.length);
  if (contacts?.length) console.log("Sample contacts:", JSON.stringify(contacts.slice(0, 3), null, 2));

  const { data: emailEvents } = await supabase.from("email_events").select("*");
  console.log("=== Email Events in DB ===");
  console.log(JSON.stringify(emailEvents, null, 2));

  if (envVars["RESEND_API_KEY"]) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        headers: { Authorization: "Bearer " + envVars["RESEND_API_KEY"] }
      });
      const resendData = await res.json();
      console.log("=== Resend API Emails ===");
      console.log(JSON.stringify(resendData, null, 2));
    } catch (e) {
      console.error("Resend error:", e);
    }
  }
}

main();
