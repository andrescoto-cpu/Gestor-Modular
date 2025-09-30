import React, { useMemo } from 'react';
import { STATE_CATEGORIES } from '../utils/constants';

const PRIORITY_WEIGHT = {
  Highest: 30,
  High: 20,
  Alta: 20,
  Medium: 10,
  Baja: 5,
  Low: 5,
  Critical: 40
};

const ScoringModule = ({ data = [] }) => {
  const scoring = useMemo(() => {
    const today = new Date();

    return data
      .filter((item) =>
        !STATE_CATEGORIES.finalizados.includes(item.state) &&
        !STATE_CATEGORIES.cancelados.includes(item.state)
      )
      .map((item) => {
        const priorityWeight = PRIORITY_WEIGHT[item.priority] ?? 10;
        const endDate = item.endDate ?? item.prodDate ?? item.uatEnd;
        let urgency = 0;
        if (endDate) {
          const diffDays = Math.round((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays <= 0) urgency = 30;
          else if (diffDays <= 7) urgency = 20;
          else if (diffDays <= 14) urgency = 10;
        } else {
          urgency = 5;
        }

        const startWeight = item.startDate ? 5 : 15;
        const score = priorityWeight + urgency + startWeight;

        return {
          ...item,
          score,
          endDate
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-800">Scoring y priorización</h3>
        <p className="text-sm text-gray-500">Mostrando {scoring.length} proyectos activos</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-sm font-semibold text-gray-600">
          <span className="col-span-4">Proyecto</span>
          <span className="col-span-2 text-center">Puntaje</span>
          <span className="col-span-2 text-center">Prioridad</span>
          <span className="col-span-2 text-center">Fecha objetivo</span>
          <span className="col-span-2 text-center">Área</span>
        </div>
        <div className="divide-y divide-gray-100">
          {scoring.length === 0 && (
            <p className="px-6 py-4 text-sm text-gray-500">No hay proyectos activos para priorizar.</p>
          )}
          {scoring.map((item) => (
            <div key={item.id} className="grid grid-cols-12 gap-4 px-6 py-4 text-sm text-gray-700">
              <div className="col-span-4">
                <p className="font-semibold text-gray-800">{item.summary}</p>
                <p className="text-xs text-gray-500">{item.key} • {item.epic || 'Sin épica'}</p>
              </div>
              <div className="col-span-2 text-center font-bold text-indigo-600">{item.score}</div>
              <div className="col-span-2 text-center">
                <span className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
                  {item.priority || 'Sin prioridad'}
                </span>
              </div>
              <div className="col-span-2 text-center">
                {item.endDate ? item.endDate.toISOString().split('T')[0] : 'Sin fecha'}
              </div>
              <div className="col-span-2 text-center">{item.area || 'Sin área'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ScoringModule;
