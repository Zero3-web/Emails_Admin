import { defineConfig } from "@trigger.dev/sdk";
export default defineConfig({
  project: process.env.TRIGGER_PROJECT_ID ?? "proj_fbajnmkuuzvwbmvwcztr",
  dirs: ["./trigger"],
  // Los envíos se procesan fuera del límite de funciones de Vercel.
  maxDuration: 300,
});
