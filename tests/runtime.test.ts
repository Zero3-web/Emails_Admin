import assert from "node:assert/strict";
import test from "node:test";
import { getRuntimeSafety } from "../src/config/runtime";

const originalEnvironment = {
  appEnv: process.env.APP_ENV,
  bulkSending: process.env.ENABLE_BULK_SEND,
};

function restoreEnvironment() {
  if (originalEnvironment.appEnv === undefined) delete process.env.APP_ENV;
  else process.env.APP_ENV = originalEnvironment.appEnv;
  if (originalEnvironment.bulkSending === undefined)
    delete process.env.ENABLE_BULK_SEND;
  else process.env.ENABLE_BULK_SEND = originalEnvironment.bulkSending;
}

test("los envíos masivos solo se habilitan explícitamente en producción", () => {
  process.env.APP_ENV = "development";
  process.env.ENABLE_BULK_SEND = "true";
  assert.deepEqual(getRuntimeSafety(), {
    environment: "development",
    bulkSendingEnabled: false,
  });

  process.env.APP_ENV = "production";
  process.env.ENABLE_BULK_SEND = "true";
  assert.deepEqual(getRuntimeSafety(), {
    environment: "production",
    bulkSendingEnabled: true,
  });
  restoreEnvironment();
});
