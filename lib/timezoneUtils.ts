import { toZonedTime, format as formatTz } from 'date-fns-tz';
import { format } from 'date-fns';

// Timezone mapping
const TIMEZONE_MAP = {
  IST: 'Asia/Kolkata',
  EST: 'America/New_York'
};

export type TimezoneType = 'IST' | 'EST';

/**
 * Get the user's selected timezone from localStorage, defaults to IST
 */
export function getUserTimezone(): TimezoneType {
  if (typeof window === 'undefined') return 'IST';
  return (localStorage.getItem('timezone') as TimezoneType) || 'IST';
}

/**
 * Get the timezone string (IANA format) for the user's selected timezone
 */
export function getTimezoneString(timezone?: TimezoneType): string {
  const tz = timezone || getUserTimezone();
  return TIMEZONE_MAP[tz];
}

/**
 * Convert a UTC date to the user's selected timezone
 */
export function toUserTimezone(date: Date | string, timezone?: TimezoneType): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const tz = getTimezoneString(timezone);
  return toZonedTime(dateObj, tz);
}

/**
 * Format a date in the user's timezone
 * @param date - Date to format (UTC or ISO string)
 * @param formatStr - Format string (e.g., 'yyyy-MM-dd', 'MMM d, yyyy', 'h:mm a')
 * @param timezone - Optional timezone override
 */
export function formatInUserTimezone(
  date: Date | string,
  formatStr: string,
  timezone?: TimezoneType
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const tz = getTimezoneString(timezone);
  // toZonedTime converts a date from UTC to the target timezone
  const zonedDate = toZonedTime(dateObj, tz);
  // Format without timezone option since zonedDate is already in the correct timezone
  return format(zonedDate, formatStr);
}

/**
 * Format a date as locale string in user's timezone
 */
export function toLocaleStringTz(
  date: Date | string,
  timezone?: TimezoneType
): string {
  return formatInUserTimezone(date, 'MMM d, yyyy h:mm a', timezone);
}

/**
 * Format a date as locale date string in user's timezone
 */
export function toLocaleDateStringTz(
  date: Date | string,
  timezone?: TimezoneType
): string {
  return formatInUserTimezone(date, 'MMM d, yyyy', timezone);
}

/**
 * Format a date as locale time string in user's timezone
 */
export function toLocaleTimeStringTz(
  date: Date | string,
  timezone?: TimezoneType,
  format: '12h' | '24h' = '12h'
): string {
  const formatStr = format === '12h' ? 'h:mm a' : 'HH:mm';
  return formatInUserTimezone(date, formatStr, timezone);
}

/**
 * Get timezone abbreviation
 */
export function getTimezoneAbbr(timezone?: TimezoneType): string {
  const tz = timezone || getUserTimezone();
  return tz; // Returns 'IST' or 'EST'
}

/**
 * Get timezone name
 */
export function getTimezoneName(timezone?: TimezoneType): string {
  const tz = timezone || getUserTimezone();
  return tz === 'IST' 
    ? 'Indian Standard Time' 
    : 'Eastern Standard Time';
}
