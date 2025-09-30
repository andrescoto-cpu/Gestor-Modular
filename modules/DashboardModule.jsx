import React, { useMemo } from 'react';
import { STATE_CATEGORIES } from '../utils/constants';

const DashboardModule = ({ data = [] }) => {
  const stats = useMemo(() => {
    const total = data.length;
    const finalizados = data.filter((item) =>
      STATE_CATEGORIES.finalizados.includes(item.state)
    ).length;
    const cancelados = data.filter((item) =>
      STATE_CATEGORIES.cancelados.includes(item.state)
    ).length;
    const activos = data.filter((item) =>
      !STATE_CATEGORIES.finalizados.includes(item.state) &&
      !STATE_CATEGORIES.cancelados.includes(item.state)
    ).length;

    const proximosVencimientos = data.filter((item) => {
      if (!item.endDate || STATE_CATEGORIES.finalizados.includes(item.state)) return false;
      const diff = (item.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 14;
    }).length;

    return { total, finalizados, cancelados, activos, proximosVencimientos };
  }, [data]);

  const areaBreakdown = useMemo(() => {
    const grouped = new Map();
    data.forEach((item) => {
      if (!item.area) return;
      const current = grouped.get(item.area) ?? { total: 0, finalizados: 0 };
      current.total += 1;
      if (STATE_CATEGORIES.finalizados.includes(item.state)) {
        current.finalizados += 1;
      }
      grouped.set(item.area, current);
    });

    return Array.from(grouped.entries())
      .map(([area, values]) => ({
        area,
        ...values,
        porcentajeFinalizados:
          values.total === 0 ? 0 : Math.round((values.finalizados / values.total) * 100)
      }))
      .sort((a, b) => b.total - a.total);
  }, [data]);

  const countryBreakdown = useMemo(() => {
    const grouped = new Map();
    data.forEach((item) => {
      if (!item.country) return;
      const count = grouped.get(item.country) ?? 0;
      grouped.set(item.country, count + 1);
    });
    return Array.from(grouped.entries())
      .map(([country, total]) => ({ country, total }))
      .sort((a, b) => b.total - a.total);
  }, [data]);

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Resumen general</h3>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
          <DashboardCard label="Registros totales" value={stats.total} accent="bg-blue-500" />
          <DashboardCard label="Activos" value={stats.activos} accent="bg-indigo-500" />
          <DashboardCard label="Finalizados" value={stats.finalizados} accent="bg-emerald-500" />
          <DashboardCard label="Cancelados" value={stats.cancelados} accent="bg-rose-500" />
          <DashboardCard label="Próximos a vencer (14d)" value={stats.proximosVencimientos} accent="bg-amber-500" />
        </div>
      </div>

      <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Progreso por área</h4>
          <div className="space-y-4">
            {areaBreakdown.length === 0 && (
              <p className="text-sm text-gray-500">No hay áreas registradas en los datos.</p>
            )}
            {areaBreakdown.map((area) => (
              <div key={area.area} className="space-y-2">
                <div className="flex items-center justify-between text-sm text-gray-700">
                  <span className="font-medium">{area.area}</span>
                  <span>{area.finalizados}/{area.total} finalizados</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${area.porcentajeFinalizados}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Distribución por país</h4>
          <div className="space-y-3">
            {countryBreakdown.length === 0 && (
              <p className="text-sm text-gray-500">No hay países registrados en los datos.</p>
            )}
            {countryBreakdown.map((country) => (
              <div key={country.country} className="flex items-center justify-between text-sm text-gray-700">
                <span>{country.country}</span>
                <span className="font-semibold">{country.total}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardCard = ({ label, value, accent }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col">
    <span className="text-sm text-gray-500 mb-2">{label}</span>
    <span className="text-3xl font-bold text-gray-900">{value}</span>
    <span className={`mt-4 inline-flex h-1.5 w-16 rounded-full ${accent}`} aria-hidden="true" />
  </div>
);

export default DashboardModule;
