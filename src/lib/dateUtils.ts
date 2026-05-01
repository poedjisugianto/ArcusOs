
export function isValidDate(date: any): boolean {
  const d = new Date(date);
  return !isNaN(d.getTime());
}

export function safeFormatDate(
  date: string | number | Date | undefined, 
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' },
  locale: string = 'id-ID'
): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  try {
    return d.toLocaleDateString(locale, options);
  } catch (e) {
    return String(date);
  }
}

export function safeFormatTime(
  date: string | number | Date | undefined, 
  options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' },
  locale: string = 'id-ID'
): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  try {
    return d.toLocaleTimeString(locale, options);
  } catch (e) {
    return '';
  }
}

export function safeFormatDateTime(
  date: string | number | Date | undefined, 
  options: Intl.DateTimeFormatOptions = { dateStyle: 'long', timeStyle: 'short' },
  locale: string = 'id-ID'
): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  try {
    return d.toLocaleString(locale, options);
  } catch (e) {
    return String(date);
  }
}
