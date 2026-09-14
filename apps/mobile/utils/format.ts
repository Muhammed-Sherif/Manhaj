/**
 * Formats a duration in seconds into a human-readable string (e.g., "45m", "1h 30m").
 */
export const formatDuration = (seconds?: number | null): string => {
  if (!seconds || seconds <= 0) return '0m';

  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  if (hours > 0) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  return `${totalMinutes}m`;
};

/**
 * Formats a Date/time as "hh:mm" (24-hour) without relying on Intl.
 * Hermes (React Native's JS engine) doesn't implement Intl by default,
 * so Date.prototype.toLocaleTimeString throws "undefined is not a function".
 */
export const formatTime = (date?: Date | string | null): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};
