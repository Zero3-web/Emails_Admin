export function normalizeRecipients(values: string[]) {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)))];
}

export function selectPendingRecipients(recipients: string[], persistedRecipients: string[]) {
  const persisted = new Set(persistedRecipients.map((value) => value.trim().toLowerCase()));
  return normalizeRecipients(recipients).filter((email) => !persisted.has(email));
}
