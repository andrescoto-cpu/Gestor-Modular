import React, { useMemo } from 'react';
import { STATE_CATEGORIES } from '../utils/constants';

const FinalizadosModule = ({ data = [] }) => {
  const finalizados = useMemo(() => {
    return data
      .filter((item) => STATE_CATEGORIES.finalizados.includes(item.state))
      .map((item) => {
        const cierre = item.prodDate ?? item.uatEnd ?? item.endDate;
        return {
          ...item,
          cierre
        };
      })
      .sort((a, b) => {
        if (!a.cierre && !b.cierre) return 0;
        if (!a.cierre) return 1;
        if (!b.cierre) return -1;
        return b.cierre - a.cierre;
      });
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-800">Proyectos finalizados</h3>
        <p className="text-sm text-gray-500">Total: {finalizados.length}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-sm font-semibold text-gray-600">
          <span className="col-span-4">Proyecto</span>
          <span className="col-span-3">Épica</span>
          <span className="col-span-3">Área</span>
          <span className="col-span-2 text-center">Cierre</span>
        </div>
        <div className="divide-y divide-gray-100">
          {finalizados.length === 0 && (
            <p className="px-6 py-4 text-sm text-gray-500">No hay proyectos finalizados en el período seleccionado.</p>
          )}
          {finalizados.map((item) => (
            <div key={item.id} className="grid grid-cols-12 gap-4 px-6 py-4 text-sm text-gray-700">
              <div className="col-span-4">
                <p className="font-semibold text-gray-800">{item.summary}</p>
                <p className="text-xs text-gray-500">{item.key}</p>
              </div>
              <div className="col-span-3">{item.epic || 'Sin épica'}</div>
              <div className="col-span-3">{item.area || 'Sin área'}</div>
              <div className="col-span-2 text-center">
                {item.cierre ? item.cierre.toISOString().split('T')[0] : 'Sin fecha'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FinalizadosModule;
