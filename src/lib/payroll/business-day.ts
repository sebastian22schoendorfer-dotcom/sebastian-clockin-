// Decision #13: business day boundary at 04:00 location-local.
// All locations on Bonaire share America/Kralendijk (UTC-4, no DST).

const TZ_OFFSET_MIN = -4 * 60;
const DAY_BOUNDARY_HOURS = 4;

export function businessDayOf(utc: Date): string {
  const localMs = utc.getTime() + TZ_OFFSET_MIN * 60_000;
  const shifted = new Date(localMs - DAY_BOUNDARY_HOURS * 60 * 60 * 1000);
  const y = shifted.getUTCFullYear();
  const m = (shifted.getUTCMonth() + 1).toString().padStart(2, "0");
  const d = shifted.getUTCDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function businessDayEnd(yyyymmdd: string): Date {
  const [y, m, d] = yyyymmdd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1, DAY_BOUNDARY_HOURS - TZ_OFFSET_MIN / 60, 0, 0));
}

export function isoWeekOf(yyyymmdd: string): string {
  const [y, m, d] = yyyymmdd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dayNum = (dt.getUTCDay() + 6) % 7;
  dt.setUTCDate(dt.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(dt.getUTCFullYear(), 0, 4));
  const weekNum =
    1 +
    Math.round(
      ((dt.getTime() - firstThursday.getTime()) / 86_400_000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    );
  return `${dt.getUTCFullYear()}-W${weekNum.toString().padStart(2, "0")}`;
}
