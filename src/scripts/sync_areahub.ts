import { createClient } from "@supabase/supabase-js";

const localUrl = "https://rlzebebsuxmxkorvltnz.supabase.co";
const localServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsemViZWJzdXhteGtvcnZsdG56Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjU3NDUzOCwiZXhwIjoyMTAyMTUwNTM4fQ.e9u77ETv49DIBV84wgPRK5qqTH8Q2uFELL3-rTAwaXw";

const areahubSupabaseUrl = "https://vztirszogukjfcyfmpkk.supabase.co";
const areahubAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6dGlyc3pvZ3VramZjeWZtcGtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwMDcwNjIsImV4cCI6MjA3MTU4MzA2Mn0.W_-U0Zi3XT1-BGhDYO4Gm6qLGEHLdaNL4fLM9-m9IJc";

async function syncAreaHub() {
  const localDb = createClient(localUrl, localServiceKey);

  // 1. Find Area Hub site in local DB
  const { data: sites } = await localDb.from("sites").select("*");
  const hubSite = (sites || []).find((s: any) => s.slug.includes("hub") || s.domain.includes("hub"));

  if (!hubSite) {
    console.error("Area Hub site not found locally.");
    return;
  }

  console.log("Found Area Hub locally:", hubSite.name, "ID:", hubSite.id);

  // 2. Fetch blogs from Area Hub Vercel/Supabase backend
  const areaHubDb = createClient(areahubSupabaseUrl, areahubAnonKey);
  const { data: rows, error: fetchErr } = await areaHubDb
    .from("blogs")
    .select("*")
    .order("created_at", { ascending: false });

  if (fetchErr) {
    console.error("Error fetching Area Hub blogs:", fetchErr);
    return;
  }

  console.log(`Fetched ${rows?.length || 0} blogs from Area Hub Vercel backend!`);

  if (!rows || rows.length === 0) return;

  const mappedPosts = rows.map((item: any) => {
    const title = item.title_es || item.title_en || item.title || "Artículo Area Hub";
    const excerpt = item.excerpt_es || item.excerpt_en || item.excerpt || `Conoce más sobre ${title}`;
    const slug = item.slug || item.id;
    const publicUrl = `https://www.area-hub.com/blog/${slug}`;
    const imageUrl = item.image_url || item.cover_image || item.thumbnail_url || "https://vztirszogukjfcyfmpkk.supabase.co/storage/v1/object/public/receipts/Logo.png";

    return {
      site_id: hubSite.id,
      external_id: String(item.id),
      title,
      excerpt: excerpt.length > 210 ? `${excerpt.slice(0, 210)}…` : excerpt,
      image_url: imageUrl,
      public_url: publicUrl,
      published_at: item.created_at || item.published_at || new Date().toISOString(),
      source_data: {
        provider: "areahub_vercel",
        synced_at: new Date().toISOString(),
      },
    };
  });

  // 3. Upsert into local blog_posts table
  const { error: upsertErr } = await localDb.from("blog_posts").upsert(
    mappedPosts,
    { onConflict: "site_id,external_id" }
  );

  if (upsertErr) {
    console.error("Error upserting to local DB:", upsertErr);
    return;
  }

  // 4. Update site_integrations table for Area Hub
  const now = new Date().toISOString();
  await localDb.from("site_integrations").upsert(
    {
      site_id: hubSite.id,
      provider: "wordpress", // Label integration as active blog provider
      status: "connected",
      config: { endpoint: "https://www.area-hub.com/blog" },
      last_sync_at: now,
      last_error: null,
    },
    { onConflict: "site_id,provider" }
  );

  // Update site wordpress_url
  await localDb.from("sites").update({ wordpress_url: "https://www.area-hub.com/blog" }).eq("id", hubSite.id);

  console.log(`SUCCESS: Synced ${mappedPosts.length} blog posts for Area Hub into local database!`);
}

syncAreaHub();
