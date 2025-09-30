import React, { useMemo } from 'react';
import { STATE_CATEGORIES } from '../utils/constants';

const monthFormatter = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });

const ResultadosPorMesModule = ({ data = [] }) => {
  const resultados = useMemo(() => {
    const map = new Map();

    data
      .filter((item) => STATE_CATEGORIES.finalizados.includes(item.state))
      .forEach((item) => {
        const cierre = item.prodDate ?? item.uatEnd ?? item.endDate;
        if (!cierre) return;
        const key = `${cierre.getFullYear()}-${String(cierre.getMonth() + 1).padStart(2, '0')}`;
        const current = map.get(key) ?? { count: 0, items: [] };
        current.count += 1;
        current.items.push({ ...item, cierre });
        map.set(key, current);
      });

    return Array.from(map.entries())
      .map(([monthKey, value]) => {
        const [year, month] = monthKey.split('-');
        const displayDate = new Date(Number(year), Number(month) - 1, 1);
        return {
          monthKey,
          label: monthFormatter.format(displayDate),
          count: value.count,
          items: value.items.sort((a, b) => b.cierre - a.cierre)
        };
      })
      .sort((a, b) => (a.monthKey < b.monthKey ? 1 : -1));
  }, [data]);

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-800">Resultados por mes</h3>
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {resultados.length === 0 && (
          <p className="text-sm text-gray-500">No hay resultados finalizados con fecha de cierre para mostrar.</p>
        )}
        {resultados.map((mes) => (
          <div key={mes.monthKey} className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4">
            <div>
              <p className="text-sm text-gray-500">Mes</p>
              <p className="text-lg font-semibold text-gray-800 capitalize">{mes.label}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Proyectos finalizados</p>
              <p className="text-3xl font-bold text-emerald-600">{mes.count}</p>
            </div>
            <div className="space-y-2">
              {mes.items.slice(0, 5).map((item) => (
                <div key={item.id} className="text-xs text-gray-600">
                  <p className="font-medium text-gray-800">{item.summary}</p>
                  <p>{item.key} • {item.area || 'Sin área'}</p>
                </div>
              ))}
              {mes.items.length > 5 && (
                <p className="text-xs text-gray-400">+{mes.items.length - 5} proyectos adicionales</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResultadosPorMesModule;
