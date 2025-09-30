import React, { useMemo } from 'react';
import { STATE_CATEGORIES } from '../utils/constants';
import { isValidEpic } from '../utils/dataProcessing';

const EpicasModule = ({ data = [] }) => {
  const groupedEpics = useMemo(() => {
    const groups = new Map();

    data.forEach((item) => {
      const epicKey = isValidEpic(item.epic) ? item.epic : 'Sin épica definida';
      const current = groups.get(epicKey) ?? { total: 0, finalizados: 0, activos: 0, priority: new Map() };

      current.total += 1;
      if (STATE_CATEGORIES.finalizados.includes(item.state)) {
        current.finalizados += 1;
      } else if (!STATE_CATEGORIES.cancelados.includes(item.state)) {
        current.activos += 1;
      }

      if (item.priority) {
        const priorityKey = item.priority;
        current.priority.set(priorityKey, (current.priority.get(priorityKey) ?? 0) + 1);
      }

      groups.set(epicKey, current);
    });

    return Array.from(groups.entries())
      .map(([epic, values]) => ({
        epic,
        ...values,
        priority: Array.from(values.priority.entries()).sort((a, b) => b[1] - a[1])
      }))
      .sort((a, b) => b.total - a.total);
  }, [data]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Resumen por épica</h3>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-sm font-semibold text-gray-600">
            <span className="col-span-4">Épica</span>
            <span className="col-span-2 text-center">Total</span>
            <span className="col-span-2 text-center">Activos</span>
            <span className="col-span-2 text-center">Finalizados</span>
            <span className="col-span-2">Prioridades</span>
          </div>
          <div className="divide-y divide-gray-100">
            {groupedEpics.length === 0 && (
              <p className="px-6 py-4 text-sm text-gray-500">No hay datos suficientes para mostrar épicas.</p>
            )}
            {groupedEpics.map((epic) => (
              <div key={epic.epic} className="grid grid-cols-12 gap-4 px-6 py-4 text-sm text-gray-700">
                <div className="col-span-4">
                  <p className="font-medium text-gray-800">{epic.epic}</p>
                  <p className="text-xs text-gray-500">{epic.activos} activos • {epic.finalizados} finalizados</p>
                </div>
                <div className="col-span-2 text-center font-semibold">{epic.total}</div>
                <div className="col-span-2 text-center text-indigo-600 font-semibold">{epic.activos}</div>
                <div className="col-span-2 text-center text-emerald-600 font-semibold">{epic.finalizados}</div>
                <div className="col-span-2 space-y-1">
                  {epic.priority.length === 0 && (
                    <span className="text-xs text-gray-400">Sin prioridad</span>
                  )}
                  {epic.priority.map(([priority, count]) => (
                    <div key={priority} className="flex items-center justify-between text-xs bg-gray-100 rounded px-2 py-1">
                      <span>{priority}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EpicasModule;
