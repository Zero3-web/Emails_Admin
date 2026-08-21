import { createClient } from "@supabase/supabase-js";
import { syncTokkoProperties } from "../database/repositories";

async function main() {
  console.log("Starting Tokko properties sync for Area Hub...");
  try {
    const res = await syncTokkoProperties("area-areahub");
    console.log("Tokko Sync Results:", res);
  } catch (err) {
    console.error("Error in Tokko sync:", err);
  }
}

main();
