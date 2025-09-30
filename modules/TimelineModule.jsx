import React, { useMemo } from 'react';
import { STATE_CATEGORIES } from '../utils/constants';

const TimelineModule = ({ data = [], timelineFilter = null }) => {
  const events = useMemo(() => {
    const filtered = data.filter((item) => {
      if (!timelineFilter) return true;
      const dates = [item.startDate, item.createdDate, item.prodDate, item.endDate].filter(Boolean);
      if (dates.length === 0) return false;
      return dates.some((date) => date >= timelineFilter);
    });

    return filtered
      .map((item) => {
        const start = item.startDate ?? item.createdDate ?? item.prodDate ?? item.endDate;
        const end = item.endDate ?? item.prodDate;
        const isFinalizado = STATE_CATEGORIES.finalizados.includes(item.state);
        return {
          ...item,
          start,
          end,
          isFinalizado
        };
      })
      .sort((a, b) => {
        if (!a.start && !b.start) return 0;
        if (!a.start) return 1;
        if (!b.start) return -1;
        return a.start - b.start;
      });
  }, [data, timelineFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-800">Línea de tiempo de proyectos</h3>
        <p className="text-sm text-gray-500">Mostrando {events.length} iniciativas</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="divide-y divide-gray-100">
          {events.length === 0 && (
            <p className="px-6 py-4 text-sm text-gray-500">No hay eventos para el período seleccionado.</p>
          )}
          {events.map((event) => (
            <div key={event.id} className="px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">{event.summary}</p>
                <p className="text-xs text-gray-500">{event.key} • {event.epic || 'Sin épica'} • {event.area || 'Sin área'}</p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <DateBadge label="Inicio" date={event.start} />
                <DateBadge label="Fin" date={event.end} />
                <StatusBadge status={event.state} finalizado={event.isFinalizado} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DateBadge = ({ label, date }) => (
  <div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-xs font-medium">
    {label}: {date ? date.toISOString().split('T')[0] : 'Sin fecha'}
  </div>
);

const StatusBadge = ({ status, finalizado }) => (
  <span
    className={`text-xs font-semibold px-3 py-1 rounded-full ${
      finalizado ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
    }`}
  >
    {status || 'Sin estado'}
  </span>
);

export default TimelineModule;
