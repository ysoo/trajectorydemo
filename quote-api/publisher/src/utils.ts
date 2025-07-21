// Check if markets are likely open (rough approximation)
export function isMarketHours(): boolean {
  const now = new Date();
  const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
  const est = new Date(utc.getTime() + (-5 * 3600000)); // EST/EDT approximation
  
  const hour = est.getHours();
  const dayOfWeek = est.getDay();
  
  // Weekend
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;
  
  // Rough market hours (9:30 AM - 4:00 PM EST)
  return hour >= 9 && hour <= 16;
}