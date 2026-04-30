
export const generateGoogleCalendarLink = (event: { title: string; description: string; location: string; startDate: string; endDate?: string }) => {
  const baseUrl = 'https://www.google.com/calendar/render?action=TEMPLATE';
  
  // Format dates: YYYYMMDDTHHMMSSZ
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().replace(/-|:|\.\d\d\d/g, '');
  };

  const start = formatDate(event.startDate);
  const end = event.endDate ? formatDate(event.endDate) : formatDate(new Date(new Date(event.startDate).getTime() + 8 * 60 * 60 * 1000).toISOString()); // Default 8 hours

  const params = new URLSearchParams({
    text: event.title,
    details: event.description,
    location: event.location,
    dates: `${start}/${end}`,
  });

  return `${baseUrl}&${params.toString()}`;
};

export const generateICalFile = (event: { title: string; description: string; location: string; startDate: string; endDate?: string }) => {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().replace(/-|:|\.\d\d\d/g, '');
  };

  const start = formatDate(event.startDate);
  const end = event.endDate ? formatDate(event.endDate) : formatDate(new Date(new Date(event.startDate).getTime() + 8 * 60 * 60 * 1000).toISOString());

  const iCalContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PROID:-//Arcus Digital//Archery Tournament OS//EN',
    'BEGIN:VEVENT',
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}`,
    `LOCATION:${event.location || ''}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([iCalContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${(event.title || 'event').replace(/\s+/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
