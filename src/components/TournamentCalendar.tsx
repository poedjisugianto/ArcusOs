
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Trophy, Clock, Plus, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArcheryEvent } from '../types';
import { generateGoogleCalendarLink, generateICalFile } from '../lib/calendarUtils';

interface Props {
  events: ArcheryEvent[];
  onViewInfo: (id: string) => void;
}

export default function TournamentCalendar({ events, onViewInfo }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const numDays = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  const getEventsForDay = (day: number) => {
    return events.filter(event => {
      const eventDate = new Date(event.settings.eventDate || '');
      return eventDate.getFullYear() === year && 
             eventDate.getMonth() === month && 
             eventDate.getDate() === day;
    });
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black font-oswald uppercase italic tracking-tighter text-slate-900 leading-none">Jadwal Turnamen</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{monthNames[month]} {year}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
          <button onClick={prevMonth} className="p-2 hover:bg-white hover:text-arcus-red rounded-lg transition-all text-slate-400">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="px-4 text-[11px] font-black uppercase tracking-widest text-slate-900 min-w-[120px] text-center">
            {monthNames[month]} {year}
          </div>
          <button onClick={nextMonth} className="p-2 hover:bg-white hover:text-arcus-red rounded-lg transition-all text-slate-400">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-50">
        {days.map(day => (
          <div key={day} className="py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 bg-slate-50/30">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square border-r border-b border-slate-50/50" />
        ))}
        {Array.from({ length: numDays }).map((_, i) => {
          const day = i + 1;
          const dayEvents = getEventsForDay(day);
          const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

          return (
            <div key={day} className={`aspect-square border-r border-b border-slate-50 relative group p-1 sm:p-2 bg-white hover:bg-slate-50/50 transition-colors`}>
              <div className={`text-[10px] font-black ${isToday ? 'bg-arcus-red text-white w-6 h-6 flex items-center justify-center rounded-lg shadow-md shadow-red-200' : 'text-slate-900 opacity-30'} mb-1`}>
                {day}
              </div>
              
              <div className="space-y-1 overflow-hidden">
                {dayEvents.map(event => (
                  <div 
                    key={event.id}
                    onClick={() => onViewInfo(event.id)}
                    className="text-[7px] md:text-[8px] font-black uppercase tracking-tight bg-slate-900 text-white p-1 rounded border-l-2 border-arcus-red truncate cursor-pointer hover:bg-arcus-red transition-all"
                  >
                    {event.settings.tournamentName}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* legend & quick list */}
      <div className="p-8 bg-slate-50/50">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 boder-l-2 border-arcus-red pl-3">Turnamen Bulan Ini</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.filter(e => {
            const d = new Date(e.settings.eventDate || '');
            return d.getMonth() === month && d.getFullYear() === year;
          }).length > 0 ? (
            events.filter(e => {
                const d = new Date(e.settings.eventDate || '');
                return d.getMonth() === month && d.getFullYear() === year;
            }).map(event => (
              <div key={event.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4 hover:border-arcus-red transition-all group">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white group-hover:bg-arcus-red transition-colors shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-black font-oswald uppercase italic tracking-tight text-slate-900 group-hover:text-arcus-red transition-colors truncate">
                    {event.settings.tournamentName}
                  </h5>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                       <Clock className="w-3 h-3" />
                       {event.settings.eventDate}
                    </div>
                    <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase tracking-widest truncate">
                       <MapPin className="w-3 h-3" />
                       {event.settings.location}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-4">
                    <button 
                      onClick={() => onViewInfo(event.id)}
                      className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-arcus-red transition-all"
                    >
                      Detail
                    </button>
                    <a 
                      href={generateGoogleCalendarLink({
                        title: event.settings.tournamentName,
                        description: event.settings.description || '',
                        location: event.settings.location || '',
                        startDate: event.settings.eventDate || ''
                      })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-1.5 bg-white border border-slate-100 text-slate-400 rounded-lg text-[8px] font-black uppercase tracking-widest hover:border-arcus-red hover:text-arcus-red transition-all flex items-center gap-1"
                    >
                      Google Calendar
                    </a>
                    <button 
                      onClick={() => generateICalFile({
                        title: event.settings.tournamentName,
                        description: event.settings.description || '',
                        location: event.settings.location || '',
                        startDate: event.settings.eventDate || ''
                      })}
                      className="px-4 py-1.5 bg-white border border-slate-100 text-slate-400 rounded-lg text-[8px] font-black uppercase tracking-widest hover:border-arcus-red hover:text-arcus-red transition-all flex items-center gap-1"
                    >
                      iCal
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 py-10 bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center px-4">
                <CalendarIcon className="w-12 h-12 text-slate-200 mb-4" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tidak Ada Turnamen di Bulan Ini</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
