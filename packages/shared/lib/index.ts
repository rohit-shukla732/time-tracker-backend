// Utility functions for time calculations and formatting

/**
 * Converts milliseconds to minutes
 */
export function msToMinutes(ms: number): number {
  return Math.floor(ms / (1000 * 60));
}

/**
 * Converts minutes to a human-readable duration string
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}m`;
  }
  
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

/**
 * Calculates the duration between two dates in minutes
 */
export function calculateDuration(startTime: Date, endTime: Date): number {
  return msToMinutes(endTime.getTime() - startTime.getTime());
}

/**
 * Formats a date to ISO string for API communication
 */
export function formatDateForAPI(date: Date): string {
  return date.toISOString();
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generates a unique ID (simple UUID v4 implementation)
 */
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}