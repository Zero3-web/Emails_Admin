async function printHtml() {
  const url = "https://www.area-hub.com/blog";
  const res = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });
  const html = await res.text();
  console.log("=== RAW HTML START ===");
  console.log(html);
  console.log("=== RAW HTML END ===");
}
printHtml();
