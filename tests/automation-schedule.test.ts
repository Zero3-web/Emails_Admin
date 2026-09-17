import assert from "node:assert/strict";
import test from "node:test";
import { nextRun } from "../trigger/tasks";
import { calculateNextRunInZone } from "../src/services/schedule";

test("programa el siguiente flujo semanal en la zona horaria de Lima", () => {
  const result = nextRun(
    { frequency: "weekly", day_of_week: 1, day_of_month: null, send_time: "09:00:00" },
    new Date("2026-08-21T12:00:00.000Z"),
  );
  assert.equal(result.toISOString(), "2026-08-24T14:00:00.000Z");
});

test("respeta un cambio de horario de verano en otra zona", () => {
  const result = calculateNextRunInZone(
    { frequency: "weekly", day_of_week: 1, day_of_month: null, send_time: "09:00:00" },
    new Date("2026-03-07T12:00:00.000Z"),
    "America/New_York",
  );
  assert.equal(result.toISOString(), "2026-03-09T13:00:00.000Z");
});

test("programa el siguiente flujo mensual en la zona horaria de Lima", () => {
  const result = nextRun(
    { frequency: "monthly", day_of_week: null, day_of_month: 21, send_time: "09:00:00" },
    new Date("2026-08-21T12:00:00.000Z"),
  );
  assert.equal(result.toISOString(), "2026-08-21T14:00:00.000Z");
});

test("salta al siguiente periodo cuando la hora ya pasó", () => {
  const result = nextRun(
    { frequency: "weekly", day_of_week: 5, day_of_month: null, send_time: "09:00:00" },
    new Date("2026-08-21T15:00:00.000Z"),
  );
  assert.equal(result.toISOString(), "2026-08-28T14:00:00.000Z");
});
