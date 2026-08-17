import { task } from "@trigger.dev/sdk";
import { runTask, taskNames } from "./tasks";

export const areaMailTask = task({
  id: "area-mail-operation",
  run: async (payload: { name: (typeof taskNames)[number] }) =>
    runTask(payload.name),
});
