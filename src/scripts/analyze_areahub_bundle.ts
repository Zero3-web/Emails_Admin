async function findApiEndpoints() {
  const jsUrl = "https://www.area-hub.com/assets/index-4IXjnObx.js";
  console.log("Fetching JS bundle:", jsUrl);

  const res = await fetch(jsUrl, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  const jsText = await res.text();
  console.log("Bundle size:", jsText.length, "bytes");

  // Search for API endpoints, Supabase, Firebase, Sanity, Strapi, Notion, or custom REST APIs
  const apiUrls = [...jsText.matchAll(/https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/[a-zA-Z0-9_.\-\/]+/g)].map((m) => m[0]);
  console.log("\nFound URLs in JS bundle:");
  const uniqueUrls = Array.from(new Set(apiUrls)).filter((u) => !u.includes("w3.org") && !u.includes("facebook") && !u.includes("googleapis"));
  console.log(uniqueUrls.slice(0, 30));

  // Search for fetch/axios calls or routes like /api/ or /blog or /posts or supabase/firebase
  const fetchEndpoints = [...jsText.matchAll(/["'](\/api\/[^"']+|\/v1\/[^"']+|[a-zA-Z0-9_\-]+\.(?:json|php))["']/g)].map((m) => m[1]);
  console.log("\nFound fetch endpoints:", Array.from(new Set(fetchEndpoints)).slice(0, 20));

  // Check if blog posts are embedded statically in JS bundle (e.g. JSON array)
  const blogKeywords = [...jsText.matchAll(/title:["']([^"']{10,80})["']/g)].map((m) => m[1]);
  console.log("\nFound post titles embedded in JS bundle:", Array.from(new Set(blogKeywords)).slice(0, 10));
}

findApiEndpoints();
