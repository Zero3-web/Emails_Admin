export type ScheduleRow = {
  frequency: string;
  day_of_week?: number | null;
  day_of_month?: number | null;
  send_time: string;
};

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(value.year),
    month: Number(value.month),
    day: Number(value.day),
    hour: Number(value.hour),
    minute: Number(value.minute),
  };
}

function zonedDate(year: number, month: number, day: number, hour: number, minute: number, timeZone: string) {
  let candidate = new Date(Date.UTC(year, month - 1, day, hour, minute));
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = zonedParts(candidate, timeZone);
    const desiredUtc = Date.UTC(year, month - 1, day, hour, minute);
    const actualUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute);
    const delta = desiredUtc - actualUtc;
    if (!delta) return candidate;
    candidate = new Date(candidate.getTime() + delta);
  }
  return candidate;
}

export function startOfDayInZone(date = new Date(), timeZone = "America/Lima") {
  const local = zonedParts(date, timeZone);
  return zonedDate(local.year, local.month, local.day, 0, 0, timeZone);
}

export function startOfMonthInZone(date = new Date(), timeZone = "America/Lima") {
  const local = zonedParts(date, timeZone);
  return zonedDate(local.year, local.month, 1, 0, 0, timeZone);
}

export function calculateNextRunInZone(row: ScheduleRow, after = new Date(), timeZone = "America/Lima") {
  const [hour, minute] = row.send_time.slice(0, 5).split(":").map(Number);
  const local = zonedParts(after, timeZone);
  if (row.frequency === "weekly") {
    const localAnchor = new Date(Date.UTC(local.year, local.month - 1, local.day));
    const today = localAnchor.getUTCDay() || 7;
    const days = (Number(row.day_of_week ?? 1) - today + 7) % 7;
    const target = new Date(Date.UTC(local.year, local.month - 1, local.day + days));
    let candidate = zonedDate(target.getUTCFullYear(), target.getUTCMonth() + 1, target.getUTCDate(), hour, minute, timeZone);
    if (candidate <= after) {
      target.setUTCDate(target.getUTCDate() + 7);
      candidate = zonedDate(target.getUTCFullYear(), target.getUTCMonth() + 1, target.getUTCDate(), hour, minute, timeZone);
    }
    return candidate;
  }
  const requestedDay = Number(row.day_of_month ?? 1);
  let candidate = zonedDate(local.year, local.month, requestedDay, hour, minute, timeZone);
  if (candidate <= after) {
    const next = new Date(Date.UTC(local.year, local.month, 1));
    candidate = zonedDate(next.getUTCFullYear(), next.getUTCMonth() + 1, requestedDay, hour, minute, timeZone);
  }
  return candidate;
}
