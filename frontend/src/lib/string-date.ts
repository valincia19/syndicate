export function toLocalDateString(dateObj: Date): string {
  // Get time offset in minutes
  const timezoneOffset = dateObj.getTimezoneOffset();
  // Adjust the time by subtracting the offset to shift to UTC equivalent of local time
  const localDate = new Date(dateObj.getTime() - timezoneOffset * 60000);
  // Extract only the 'YYYY-MM-DD' part
  return localDate.toISOString().split('T')[0];
}
