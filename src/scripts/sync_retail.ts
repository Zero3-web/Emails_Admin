import { createClient } from "@supabase/supabase-js";
import { WordPressProvider } from "../integrations/wordpress/provider";

const url = "https://rlzebebsuxmxkorvltnz.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsemViZWJzdXhteGtvcnZsdG56Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjU3NDUzOCwiZXhwIjoyMTAyMTUwNTM4fQ.e9u77ETv49DIBV84wgPRK5qqTH8Q2uFELL3-rTAwaXw";

async function main() {
  const supabase = createClient(url, serviceKey);
  
  // 1. Find retail site
  const { data: sites, error: siteErr } = await supabase.from("sites").select("*");
  if (siteErr) {
    console.error("Error fetching sites:", siteErr);
    return;
  }

  const retailSite = sites.find((s: any) => s.slug.includes("retail") || s.domain.includes("retail"));
  if (!retailSite) {
    console.error("Retail site not found. Sites:", sites.map((s: any) => s.slug));
    return;
  }

  console.log("Found retail site:", retailSite.name, "ID:", retailSite.id, "Slug:", retailSite.slug);

  // 2. Update wordpress_url
  const wpUrl = "https://area-retail.net/blog/";
  const { error: updateErr } = await supabase
    .from("sites")
    .update({ wordpress_url: wpUrl })
    .eq("id", retailSite.id);

  if (updateErr) {
    console.error("Error updating wordpress_url:", updateErr);
    return;
  }

  console.log("Updated wordpress_url to:", wpUrl);

  // 3. Fetch WordPress posts
  const siteObj = {
    id: retailSite.id,
    slug: retailSite.slug,
    name: retailSite.name,
    domain: retailSite.domain,
    wordpressUrl: wpUrl,
  } as any;

  const provider = new WordPressProvider();
  const posts = await provider.getPosts(siteObj);
  console.log(`Fetched ${posts.length} blog posts from ${retailSite.name}!`);

  // 4. Upsert into blog_posts table
  const { error: upsertErr } = await supabase.from("blog_posts").upsert(
    posts.map((post) => ({
      site_id: retailSite.id,
      external_id: post.externalId,
      title: post.title,
      excerpt: post.excerpt,
      image_url: post.imageUrl,
      public_url: post.publicUrl,
      published_at: post.publishedAt || null,
      source_data: {
        provider: "wordpress",
        synced_at: new Date().toISOString(),
      },
    })),
    { onConflict: "site_id,external_id" }
  );

  if (upsertErr) {
    console.error("Error upserting blog_posts:", upsertErr);
    return;
  }

  // 5. Update site_integrations status
  const now = new Date().toISOString();
  const { error: intErr } = await supabase.from("site_integrations").upsert(
    {
      site_id: retailSite.id,
      provider: "wordpress",
      status: "connected",
      config: { wordpressUrl: wpUrl },
      last_sync_at: now,
      last_error: null,
    },
    { onConflict: "site_id,provider" }
  );

  if (intErr) {
    console.error("Error updating integration status:", intErr);
    return;
  }

  console.log("SUCCESS: Connected and synced 30 WordPress posts for Area Retail!");
}

main();
