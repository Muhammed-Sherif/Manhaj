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
