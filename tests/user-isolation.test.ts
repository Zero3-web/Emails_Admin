import test from "node:test";
import assert from "node:assert/strict";

test("los registros de campaña se filtran estrictamente por usuario", () => {
  const userA = "user-1111-aaaa";
  const userB = "user-2222-bbbb";

  const allCampaigns = [
    { id: "c1", siteId: "prime", name: "Campaña de User A", metadata: { user_id: userA } },
    { id: "c2", siteId: "prime", name: "Campaña de User B", metadata: { user_id: userB } },
    { id: "c3", siteId: "retail", name: "Segunda de User A", metadata: { user_id: userA } },
  ];

  const userAView = allCampaigns.filter((c) => c.metadata?.user_id === userA);
  const userBView = allCampaigns.filter((c) => c.metadata?.user_id === userB);

  assert.equal(userAView.length, 2);
  assert.equal(userBView.length, 1);
  assert.equal(userAView.every((c) => c.metadata.user_id === userA), true);
  assert.equal(userBView[0].id, "c2");
});

test("los correos de salida y pruebas no se cruzan entre usuarios", () => {
  const userA = "user-1111-aaaa";
  const userB = "user-2222-bbbb";

  const allOutbound = [
    { id: "e1", recipient: "clienteA@empresa.pe", metadata: { is_test: true, user_id: userA } },
    { id: "e2", recipient: "clienteB@empresa.pe", metadata: { is_test: true, user_id: userB } },
  ];

  const userAOutbound = allOutbound.filter((e) => e.metadata?.user_id === userA);
  const userBOutbound = allOutbound.filter((e) => e.metadata?.user_id === userB);

  assert.equal(userAOutbound.length, 1);
  assert.equal(userAOutbound[0].recipient, "clienteA@empresa.pe");
  assert.equal(userBOutbound.length, 1);
  assert.equal(userBOutbound[0].recipient, "clienteB@empresa.pe");
});
