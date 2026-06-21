const dateTimeFormatter = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** Epoch en ms → "21/06/2026 14:30". */
export function formatDateTime(ms: number): string {
  if (!Number.isFinite(ms)) return '';
  return dateTimeFormatter.format(new Date(ms));
}
