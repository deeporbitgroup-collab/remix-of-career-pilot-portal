import { format, parseISO, isValid } from "date-fns";

// Meeting slot datetimes are produced by <input type="datetime-local">, i.e.
// "YYYY-MM-DDTHH:mm" — a wall-clock value with NO timezone offset. We show the
// wall-clock time exactly as entered and append the timezone label separately
// (no conversion, matching how the slots were proposed). Falls back to the raw
// string if it ever isn't a parseable datetime.
export function formatSlot(datetime?: string | null, timezone?: string | null): string {
  if (!datetime) return "";
  let label = datetime;
  try {
    const d = parseISO(datetime);
    if (isValid(d)) label = format(d, "EEE d MMM yyyy · HH:mm");
  } catch {
    /* keep the raw string */
  }
  return timezone ? `${label} (${timezone})` : label;
}
