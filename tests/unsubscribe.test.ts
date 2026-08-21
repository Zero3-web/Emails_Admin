import assert from "node:assert/strict";
import test from "node:test";
import { createUnsubscribeToken, verifyUnsubscribeToken } from "../src/security/unsubscribe";

test("firma y valida una baja sin exponer el secreto", () => {
  const previous = process.env.UNSUBSCRIBE_SECRET;
  process.env.UNSUBSCRIBE_SECRET = "test-secret-with-at-least-thirty-two-characters";
  try {
    const token = createUnsubscribeToken({ email: "Persona@Example.com", siteId: "site-1" });
    assert.deepEqual(verifyUnsubscribeToken(token), { email: "persona@example.com", siteId: "site-1" });
    assert.equal(verifyUnsubscribeToken(`${token}alterado`), null);
  } finally {
    if (previous === undefined) delete process.env.UNSUBSCRIBE_SECRET;
    else process.env.UNSUBSCRIBE_SECRET = previous;
  }
});
