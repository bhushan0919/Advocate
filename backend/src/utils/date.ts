/**
 * Date utility for Indian legal calendar (Asia/Kolkata timezone UTC+05:30)
 * Ensures calendar dates (e.g. 30 October 2026) are preserved consistently across
 * database queries, diary listings, and audit trails.
 */

/**
 * Parses a date string (YYYY-MM-DD or ISO) into a clean normalized Date object at UTC midnight.
 */
export function parseDateOnly(dateInput: string | Date | undefined | null): Date | undefined {
  if (!dateInput) return undefined;

  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return undefined;
    const year = dateInput.getUTCFullYear();
    const month = dateInput.getUTCMonth();
    const day = dateInput.getUTCDate();
    return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  }

  const str = String(dateInput).trim();
  if (!str) return undefined;

  // Match YYYY-MM-DD
  const match = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  }

  const parsed = new Date(str);
  if (isNaN(parsed.getTime())) return undefined;

  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Formats a Date object to YYYY-MM-DD string in Asia/Kolkata timezone.
 */
export function formatDateOnly(date: Date | string | undefined | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Formats a Date object to Indian display string: DD/MM/YYYY
 */
export function formatDateIndian(date: Date | string | undefined | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/**
 * Generates MongoDB $gte and $lte range to capture all timestamps belonging to the given YYYY-MM-DD
 * in Asia/Kolkata (IST: UTC+5:30) and UTC midnight boundaries.
 */
export function getCalendarDayRange(dateInput: string | Date): { $gte: Date; $lte: Date } {
  let year: number;
  let month: number;
  let day: number;

  if (typeof dateInput === 'string') {
    const match = dateInput.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
      year = parseInt(match[1], 10);
      month = parseInt(match[2], 10) - 1;
      day = parseInt(match[3], 10);
    } else {
      const d = new Date(dateInput);
      year = d.getUTCFullYear();
      month = d.getUTCMonth();
      day = d.getUTCDate();
    }
  } else {
    year = dateInput.getUTCFullYear();
    month = dateInput.getUTCMonth();
    day = dateInput.getUTCDate();
  }

  // IST start: 00:00:00 IST = 18:30:00 UTC previous day
  const istStart = new Date(Date.UTC(year, month, day - 1, 18, 30, 0, 0));
  // Covers through end of UTC day 23:59:59.999 UTC to account for UTC-midnight records
  const utcEnd = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

  return {
    $gte: istStart,
    $lte: utcEnd,
  };
}

/**
 * Generates MongoDB $gte and $lte range to capture all timestamps spanning between startDate and endDate
 * inclusive, handling Asia/Kolkata (IST: UTC+5:30) and UTC midnight boundaries.
 */
export function getDateRangeFilter(startDateInput: string | Date, endDateInput: string | Date): { $gte: Date; $lte: Date } {
  const startRange = getCalendarDayRange(startDateInput);
  const endRange = getCalendarDayRange(endDateInput);
  return {
    $gte: startRange.$gte,
    $lte: endRange.$lte,
  };
}


