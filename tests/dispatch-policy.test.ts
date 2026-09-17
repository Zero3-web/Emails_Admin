import assert from "node:assert/strict";
import test from "node:test";
import { normalizeRecipients, selectPendingRecipients } from "../src/services/dispatch-policy";

test("normaliza y deduplica destinatarios", () => {
  assert.deepEqual(normalizeRecipients([" A@Example.com ", "a@example.com", "invalido"]), ["a@example.com"]);
});

test("no vuelve a enviar cuando todos los destinatarios ya fueron persistidos", () => {
  assert.deepEqual(selectPendingRecipients(["a@example.com"], ["A@example.com"]), []);
});

test("un reintento conserva únicamente destinatarios pendientes", () => {
  assert.deepEqual(selectPendingRecipients(["a@example.com", "b@example.com"], ["a@example.com"]), ["b@example.com"]);
});
