import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { campaigns, posts, properties, sites } from "../src/data/mock";
import {
  campaignTypeLabel,
  createCampaign,
  filterBySite,
} from "../src/services/campaigns";
import { MockTokkoProvider } from "../src/integrations/tokko/mock";
import { MockWordPressProvider } from "../src/integrations/wordpress/mock";
import { MockEmailProvider } from "../src/integrations/resend/mock";
import { WeeklyPropertiesEmail } from "../emails/WeeklyPropertiesEmail";
import { MonthlyBlogEmail } from "../emails/MonthlyBlogEmail";
import { renderCampaignEmail } from "../src/services/email-renderer";
import { updateAutomation, updateSite } from "../src/database/repositories";
import { runMockTask } from "../trigger/tasks";
test("crea una campaña en borrador", () => {
  assert.equal(
    createCampaign(sites[0], "weekly_new_properties").status,
    "draft",
  );
});
test("clasifica los tipos de campaña", () => {
  assert.equal(campaignTypeLabel("monthly_blog"), "Blog mensual");
});
test("filtra entidades por sitio", () => {
  assert.ok(
    filterBySite(campaigns, "prime").every((c) => c.siteId === "prime"),
  );
});
test("mock Tokko retorna 30 propiedades sin duplicados", async () => {
  const rows = await new MockTokkoProvider().getProperties();
  assert.equal(rows.length, 30);
  assert.equal(new Set(rows.map((r) => r.externalId)).size, 30);
});
test("mock WordPress retorna 5 posts por sitio", async () => {
  assert.equal(
    (await new MockWordPressProvider().getPosts(sites[0])).length,
    5,
  );
});
test("mock Resend crea y consulta broadcasts", async () => {
  const p = new MockEmailProvider();
  const b = await p.createBroadcast({
    name: "Test",
    subject: "Test",
    html: "<p>Test</p>",
  });
  assert.match(b.id, /^mock-/);
  assert.equal((await p.getBroadcast(b.id)).status, "draft");
});
test("templates renderizan branding y contenido", () => {
  const weekly = renderToStaticMarkup(
    WeeklyPropertiesEmail({
      site: sites[0],
      properties: properties.slice(0, 2),
    }),
  );
  const blog = renderToStaticMarkup(
    MonthlyBlogEmail({ site: sites[0], posts: posts.slice(0, 2) }),
  );
  assert.match(weekly, /Area Prime/);
  assert.match(weekly, /Nuevas propiedades/);
  assert.match(blog, /Novedades del mes/);
});
test("React Email produce HTML completo", async () => {
  const html = await renderCampaignEmail(sites[0], "monthly_properties");
  assert.match(html, /<!DOCTYPE html/);
  assert.match(html, /Area Prime/);
});
test("repositories mock guardan cambios", async () => {
  assert.equal(
    (await updateSite("prime", { senderName: "Prime Test" })).senderName,
    "Prime Test",
  );
  assert.equal(
    (await updateAutomation("prime-0", { isEnabled: false })).isEnabled,
    false,
  );
});
test("tarea mock genera campañas", async () => {
  const result = await runMockTask("generate-monthly-blog");
  assert.equal(result.length, 3);
  assert.ok(result.every((item) => !Array.isArray(item) && "status" in item && item.status === "draft"));
});
