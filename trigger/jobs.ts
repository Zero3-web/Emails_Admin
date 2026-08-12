import { task } from "@trigger.dev/sdk";
import { runMockTask, taskNames } from "./tasks";

export const areaMailTask = task({
  id: "area-mail-operation",
  run: async (payload: { name: (typeof taskNames)[number] }) =>
    runMockTask(payload.name),
});
