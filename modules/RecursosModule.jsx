import React, { useMemo } from 'react';
import { STATE_CATEGORIES } from '../utils/constants';

const RecursosModule = ({ data = [] }) => {
  const resources = useMemo(() => {
    const map = new Map();

    data.forEach((item) => {
      const names = new Set();
      if (item.devResponsible) names.add(item.devResponsible);
      if (item.assignee) names.add(item.assignee);

      names.forEach((name) => {
        const current = map.get(name) ?? { total: 0, activos: 0, finalizados: 0, areas: new Set() };
        current.total += 1;
        if (STATE_CATEGORIES.finalizados.includes(item.state)) {
          current.finalizados += 1;
        } else if (!STATE_CATEGORIES.cancelados.includes(item.state)) {
          current.activos += 1;
        }
        if (item.area) current.areas.add(item.area);
        map.set(name, current);
      });
    });

    return Array.from(map.entries())
      .map(([name, values]) => ({
        name,
        ...values,
        areas: Array.from(values.areas).sort((a, b) => a.localeCompare(b, 'es'))
      }))
      .sort((a, b) => b.total - a.total);
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-800">Asignación de recursos</h3>
        <p className="text-sm text-gray-500">Total de personas involucradas: {resources.length}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-sm font-semibold text-gray-600">
          <span className="col-span-4">Recurso</span>
          <span className="col-span-3 text-center">Activos</span>
          <span className="col-span-3 text-center">Finalizados</span>
          <span className="col-span-2">Áreas</span>
        </div>
        <div className="divide-y divide-gray-100">
          {resources.length === 0 && (
            <p className="px-6 py-4 text-sm text-gray-500">No hay recursos asignados en los datos.</p>
          )}
          {resources.map((resource) => (
            <div key={resource.name} className="grid grid-cols-12 gap-4 px-6 py-4 text-sm text-gray-700">
              <div className="col-span-4">
                <p className="font-semibold text-gray-800">{resource.name}</p>
                <p className="text-xs text-gray-500">{resource.total} iniciativas totales</p>
              </div>
              <div className="col-span-3 text-center text-indigo-600 font-semibold">{resource.activos}</div>
              <div className="col-span-3 text-center text-emerald-600 font-semibold">{resource.finalizados}</div>
              <div className="col-span-2 text-xs text-gray-500 space-y-1">
                {resource.areas.length === 0 && <span>Sin área</span>}
                {resource.areas.map((area) => (
                  <div key={area} className="bg-gray-100 rounded px-2 py-1">{area}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecursosModule;
