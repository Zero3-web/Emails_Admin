async function getExactKeys() {
  const res = await fetch("https://www.area-hub.com/assets/index-4IXjnObx.js");
  const text = await res.text();
  const keys = [...text.matchAll(/eyJ[a-zA-Z0-9_\-\.]+/g)].map((m) => m[0]);
  console.log("All JWT keys in Area Hub bundle:");
  keys.forEach((k, i) => console.log(`Key ${i + 1} (${k.length} chars): ${k}`));
}
getExactKeys();
