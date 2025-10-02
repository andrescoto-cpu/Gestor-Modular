import React, { useMemo } from 'react';
import { CheckCircle } from 'lucide-react';
import { STATE_CATEGORIES } from '../utils/constants';
import TicketViewer from '../common/TicketViewer';

const FinalizadosModule = ({ data }) => {
  const finalizadosData = useMemo(() => {
    // Filter only completed items
    const finalizados = data.filter(item => STATE_CATEGORIES.finalizados.includes(item.state));
    
    // Process completed items with final date calculation
    const finalizadosConFecha = finalizados.map(item => {
      let finalDate = null;
      
      // Priority order: Production Date > UAT End > End Date > Current Date (fallback)
      if (item.prodDate) {
        finalDate = item.prodDate;
      } else if (item.uatEnd) {
        finalDate = item.uatEnd;
      } else if (item.endDate) {
        finalDate = item.endDate;
      } else {
        finalDate = new Date(); // Fallback to current date
      }
      
      return { 
        key: item.key, 
        summary: item.summary, 
        state: item.state,
        country: item.country, 
        assignee: item.assignee || item.devResponsible, 
        epic: item.epic, 
        finalDate,
        // Additional completion details
        prodDate: item.prodDate,
        uatEnd: item.uatEnd,
        endDate: item.endDate,
        priority: item.priority,
        area: item.area
      };
    });
    
    // Sort by completion date (most recent first)
    const finalizadosOrdenados = finalizadosConFecha.sort((a, b) => {
      return new Date(b.finalDate) - new Date(a.finalDate);
    });
    
    // Calculate completion statistics
    const completionStats = {
      totalCompletados: finalizadosConFecha.length,
      completadosUltimos30Dias: 0,
      completadosUltimos7Dias: 0,
      porPais: {},
      porEpica: {},
      porMes: {}
    };

    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    const sevenDaysAgo = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));

    finalizadosConFecha.forEach(item => {
      // Recent completions
      if (item.finalDate >= thirtyDaysAgo) {
        completionStats.completadosUltimos30Dias++;
      }
      if (item.finalDate >= sevenDaysAgo) {
        completionStats.completadosUltimos7Dias++;
      }

      // By country
      if (!completionStats.porPais[item.country]) {
        completionStats.porPais[item.country] = 0;
      }
      completionStats.porPais[item.country]++;

      // By epic
      if (item.epic && item.epic !== 'Sin épica') {
        if (!completionStats.porEpica[item.epic]) {
          completionStats.porEpica[item.epic] = 0;
        }
        completionStats.porEpica[item.epic]++;
      }

      // By month
      const monthKey = `${item.finalDate.getFullYear()}-${String(item.finalDate.getMonth() + 1).padStart(2, '0')}`;
      if (!completionStats.porMes[monthKey]) {
        completionStats.porMes[monthKey] = 0;
      }
      completionStats.porMes[monthKey]++;
    });
    
    return {
      finalizados: finalizadosOrdenados,
      stats: completionStats
    };
  }, [data]);

  if (finalizadosData.stats.totalCompletados === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600">No hay proyectos completados</h3>
          <p className="text-gray-500 mt-2">Los proyectos completados aparecerán aquí</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Completion metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-800">{finalizadosData.stats.totalCompletados}</div>
              <div className="text-sm text-green-600">Total Completados</div>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
          <div className="text-lg font-bold text-blue-800">{finalizadosData.stats.completadosUltimos30Dias}</div>
          <div className="text-sm text-blue-600">Últimos 30 días</div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500">
          <div className="text-lg font-bold text-purple-800">{finalizadosData.stats.completadosUltimos7Dias}</div>
          <div className="text-sm text-purple-600">Últimos 7 días</div>
        </div>

        <div className="bg-indigo-50 rounded-lg p-4 border-l-4 border-indigo-500">
          <div className="text-lg font-bold text-indigo-800">
            {finalizadosData.stats.completadosUltimos30Dias > 0 
              ? Math.round(finalizadosData.stats.completadosUltimos30Días / 4.3) 
              : 0}
          </div>
          <div className="text-sm text-indigo-600">Promedio/Semana</div>
        </div>
      </div>

      {/* Completion breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By country */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Completados por País</h3>
          <div className="space-y-3">
            {Object.entries(finalizadosData.stats.porPais)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
              .map(([country, count]) => (
                <div key={country} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{country}</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 h-2 bg-gray-200 rounded-full">
                      <div 
                        className="h-2 bg-green-500 rounded-full"
                        style={{ width: `${(count / finalizadosData.stats.totalCompletados) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold text-green-600">{count}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Top épicas */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Épicas Completadas</h3>
          <div className="space-y-3">
            {Object.entries(finalizadosData.stats.porEpica)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
              .map(([epic, count]) => (
                <div key={epic} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 truncate flex-1 pr-3" title={epic}>
                    {epic.length > 30 ? `${epic.substring(0, 30)}...` : epic}
                  </span>
                  <div className="flex items-center space-x-3">
                    <div className="w-16 h-2 bg-gray-200 rounded-full">
                      <div 
                        className="h-2 bg-blue-500 rounded-full"
                        style={{ width: `${(count / Math.max(...Object.values(finalizadosData.stats.porEpica))) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold text-blue-600">{count}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Monthly completion trend */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Tendencia de Completación (Últimos 6 meses)</h3>
        <div className="space-y-2">
          {Object.entries(finalizadosData.stats.porMes)
            .sort(([a], [b]) => b.localeCompare(a))
            .slice(0, 6)
            .reverse()
            .map(([month, count]) => {
              const [year, monthNum] = month.split('-');
              const monthName = new Date(year, monthNum - 1).toLocaleDateString('es-ES', { 
                month: 'long', 
                year: 'numeric' 
              });
              const maxCount = Math.max(...Object.values(finalizadosData.stats.porMes));
              
              return (
                <div key={month} className="flex items-center space-x-4">
                  <div className="w-24 text-sm font-medium text-gray-700 capitalize">
                    {monthName.substring(0, 8)}
                  </div>
                  <div className="flex-1 flex items-center space-x-3">
                    <div className="flex-1 h-6 bg-gray-200 rounded-full relative">
                      <div 
                        className="h-6 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center transition-all duration-300"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      >
                        <span className="text-white text-xs font-semibold">{count}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Detailed list */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Lista de Proyectos Completados</h3>
        <TicketViewer
          tickets={finalizadosData.finalizados}
          title="Proyectos Completados"
          showDateField="finalDate"
          dateFieldLabel="Fecha Completado"
          emptyMessage="No hay proyectos completados"
          borderColor="border-green-500"
          bgColor="bg-green-50"
        />
      </div>

      {/* Completion insights */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 p-6">
        <h3 className="font-semibold text-green-800 mb-3">Insights de Completación</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-white/70 rounded-lg p-3">
            <div className="font-semibold text-green-700 mb-1">Ritmo de Completación</div>
            <p className="text-gray-700">
              {finalizadosData.stats.completadosUltimos30Dias > 0 ? (
                <>Completando aproximadamente {Math.round(finalizadosData.stats.completadosUltimos30Dias / 4.3)} proyectos por semana</>
              ) : (
                <>Sin completaciones recientes en los últimos 30 días</>
              )}
            </p>
          </div>
          <div className="bg-white/70 rounded-lg p-3">
            <div className="font-semibold text-green-700 mb-1">Distribución Geográfica</div>
            <p className="text-gray-700">
              {Object.keys(finalizadosData.stats.porPais).length} países con proyectos completados, 
              liderado por {Object.entries(finalizadosData.stats.porPais).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinalizadosModule;
