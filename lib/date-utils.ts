export function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function parseLocalDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

export function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addCalendarDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);

  return next;
}

export function startOfCalendarWeek(date: Date) {
  const start = startOfLocalDay(date);
  start.setDate(start.getDate() - start.getDay());

  return start;
}

export function startOfCalendarMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getCalendarMonthGrid(anchor: Date) {
  const gridStart = startOfCalendarWeek(startOfCalendarMonth(anchor));

  return Array.from({ length: 42 }, (_, index) => addCalendarDays(gridStart, index));
}

export function formatDayLabel(date: Date, offsetFromToday?: number) {
  if (offsetFromToday === 0) return 'Today';
  if (offsetFromToday === 1) return 'Tomorrow';

  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

export function formatChatTimestamp(date: Date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
