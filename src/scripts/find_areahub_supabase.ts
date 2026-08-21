async function extractSupabaseKey() {
  const jsUrl = "https://www.area-hub.com/assets/index-4IXjnObx.js";
  const res = await fetch(jsUrl);
  const text = await res.text();

  // Find Supabase ANON key (JWT starting with eyJ)
  const jwtMatches = [...text.matchAll(/eyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+/g)].map((m) => m[0]);
  console.log("Found JWT keys in Area Hub bundle:", jwtMatches.length);
  const anonKey = jwtMatches[0];
  console.log("Anon Key:", anonKey ? `${anonKey.slice(0, 30)}...` : "None");

  const supabaseUrl = "https://vztirszogukjfcyfmpkk.supabase.co";

  if (!anonKey) {
    console.error("No anon key found.");
    return;
  }

  // Test fetching from Supabase REST API tables
  const tables = ["posts", "blog", "blogs", "news", "noticias", "articles", "articulos"];
  console.log("\nQuerying Area Hub Supabase tables:");

  for (const table of tables) {
    try {
      const tableRes = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*&order=created_at.desc&limit=10`, {
        headers: {
          apikey: anonKey,
          authorization: `Bearer ${anonKey}`,
        },
      });

      console.log(`- Table '${table}': Status ${tableRes.status}`);
      if (tableRes.ok) {
        const rows = await tableRes.json();
        if (Array.isArray(rows) && rows.length > 0) {
          console.log(`  >>> SUCCESS! Found ${rows.length} rows in '${table}' table!`);
          console.log("  Sample row:", JSON.stringify(rows[0]).slice(0, 200));
        }
      }
    } catch (err) {
      console.log(`- Table '${table}': Error ${(err as Error).message}`);
    }
  }
}

extractSupabaseKey();
