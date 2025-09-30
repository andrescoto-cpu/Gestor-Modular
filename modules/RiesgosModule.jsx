import React, { useMemo } from 'react';
import { STATE_CATEGORIES } from '../utils/constants';

const RiesgosModule = ({ data = [] }) => {
  const riesgos = useMemo(() => {
    const today = new Date();

    return data
      .filter((item) => !STATE_CATEGORIES.finalizados.includes(item.state))
      .map((item) => {
        const issues = [];
        if (item.endDate && item.endDate < today) {
          issues.push('Fecha comprometida vencida');
        }
        if (['Highest', 'High', 'Alta', 'Critical'].includes((item.priority || '').trim())) {
          issues.push('Alta prioridad');
        }
        if (!item.assignee && !item.devResponsible) {
          issues.push('Sin responsable asignado');
        }
        if (!item.startDate) {
          issues.push('Sin fecha de inicio registrada');
        }
        return { ...item, issues };
      })
      .filter((item) => item.issues.length > 0)
      .sort((a, b) => b.issues.length - a.issues.length);
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-800">Panel de riesgos</h3>
        <p className="text-sm text-gray-500">{riesgos.length} iniciativas con riesgo detectado</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100">
          {riesgos.length === 0 && (
            <p className="px-6 py-4 text-sm text-gray-500">No se detectaron riesgos en los proyectos activos.</p>
          )}
          {riesgos.map((item) => (
            <div key={item.id} className="px-6 py-4 space-y-2">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{item.summary}</p>
                  <p className="text-xs text-gray-500">{item.key} • {item.epic || 'Sin épica'} • {item.area || 'Sin área'}</p>
                </div>
                <StatusBadge status={item.state} priority={item.priority} />
              </div>
              <div className="flex flex-wrap gap-2">
                {item.issues.map((issue) => (
                  <span
                    key={issue}
                    className="bg-rose-100 text-rose-700 text-xs font-medium px-3 py-1 rounded-full"
                  >
                    {issue}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status, priority }) => (
  <div className="flex items-center gap-2 text-xs text-gray-600">
    <span className="bg-amber-100 text-amber-700 font-semibold px-3 py-1 rounded-full">
      {status || 'Sin estado'}
    </span>
    {priority && (
      <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-medium">
        {priority}
      </span>
    )}
  </div>
);

export default RiesgosModule;
