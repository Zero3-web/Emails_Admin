import { schedules, task, tasks } from "@trigger.dev/sdk";
import { runDueAutomations, runTask, taskNames } from "./tasks";
import { dispatchCampaign, reconcileStaleCampaigns } from "@/src/services/campaign-dispatch";

export const areaMailTask = task({
  id: "area-mail-operation",
  run: async (payload: { name: (typeof taskNames)[number] }) =>
    runTask(payload.name),
});

export const sendCampaignJob = task({
  id: "send-campaign",
  retry: { maxAttempts: 5, factor: 2, minTimeoutInMs: 2_000, maxTimeoutInMs: 30_000 },
  run: async (payload: { campaignId: string }) => dispatchCampaign(payload.campaignId),
});

export const automationScheduler = schedules.task({
  id: "automation-scheduler",
  cron: {
    pattern: "*/5 * * * *",
    timezone: "America/Lima",
    environments: ["PRODUCTION"],
  },
  ttl: "4m",
  run: async () => {
    const result = await runDueAutomations();
    await Promise.all(result.autoSendCampaignIds.map((campaignId) =>
      tasks.trigger<typeof sendCampaignJob>(
        "send-campaign",
        { campaignId },
        { idempotencyKey: `automation-campaign-${campaignId}`, idempotencyKeyTTL: "30d" },
      ),
    ));
    return { ...result, queued: result.autoSendCampaignIds.length };
  },
});

export const campaignReconciler = schedules.task({
  id: "campaign-reconciler",
  cron: {
    pattern: "*/10 * * * *",
    timezone: "America/Lima",
    environments: ["PRODUCTION"],
  },
  run: async () => reconcileStaleCampaigns(),
});

export const propertySyncScheduler = schedules.task({
  id: "property-sync-scheduler",
  cron: {
    pattern: "*/5 * * * *",
    timezone: "America/Lima",
    environments: ["PRODUCTION"],
  },
  run: async () => runTask("sync-properties"),
});

