import test from "node:test";
import assert from "node:assert/strict";
import { campaignTypeLabel, createCampaign, filterBySite } from "../src/services/campaigns";
import type { Site } from "../src/domain/types";

const site: Site = { id: "prime", name: "Area Prime", slug: "area-prime", description: "", businessType: "", domain: "areaprime.pe", wordpressUrl: "https://areaprime.pe", logoUrl: "", primaryColor: "#2563EB", secondaryColor: "#DBEAFE", senderName: "Area Prime", senderEmail: "novedades@areaprime.pe", timezone: "America/Lima", isActive: true, tokkoFilter: {} };
test("crea una campaña en borrador", () => assert.equal(createCampaign(site, "weekly_new_properties").status, "draft"));
test("clasifica los tipos de campaña", () => assert.equal(campaignTypeLabel("monthly_blog"), "Blog mensual"));
test("filtra entidades por sitio", () => assert.deepEqual(filterBySite([{ siteId: "prime" }, { siteId: "hub" }], "prime"), [{ siteId: "prime" }]));
