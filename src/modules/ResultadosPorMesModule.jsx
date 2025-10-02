import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, ArrowLeft, Download } from 'lucide-react';
import { STATE_CATEGORIES } from '../utils/constants';
import TicketViewer from '../common/TicketViewer';

const ResultadosPorMesModule = ({ data }) => {
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedView, setSelectedView] = useState('finalizados');

  const monthlyResults = useMemo(() => {
    const monthlyData = {};
    const today = new Date();
    
    // Initialize last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      
      monthlyData[monthKey] = {
        month: monthName, 
        date: date, 
        finalizados: [], 
        enProceso: [],
        totalFinalizados: 0, 
        totalEnProceso: 0
      };
    }

    // Process completed items
    data.forEach(item => {
      if (STATE_CATEGORIES.finalizados.includes(item.state)) {
        let finalDate = null;
        if (item.prodDate) finalDate = item.prodDate;
        else if (item.uatEnd) finalDate = item.uatEnd;
        else if (item.endDate) finalDate = item.endDate;
        
        if (finalDate && finalDate.getFullYear() > 1900) {
          const monthKey = `${finalDate.getFullYear()}-${String(finalDate.getMonth() + 1).padStart(2, '0')}`;
          if (monthlyData[monthKey]) {
            monthlyData[monthKey].finalizados.push({...item, finalDate});
            monthlyData[monthKey].totalFinalizados++;
          }
        }
      }

      // Process items that were "in process" during each month
      if (!STATE_CATEGORIES.finalizados.includes(item.state)) {
        Object.entries(monthlyData).forEach(([monthKey, monthInfo]) => {
          const monthStart = new Date(monthInfo.date);
          const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
          
          let wasInProcess = false;
          
          // Check if item was active during this month period
          if (item.startDate && item.endDate) {
            if (item.startDate <= monthEnd && item.endDate >= monthStart) {
              wasInProcess = true;
            }
          }
          
          if (!wasInProcess && item.uatStart && item.uatEnd) {
            if (item.uatStart <= monthEnd && item.uatEnd >= monthStart) {
              wasInProcess = true;
            }
          }
          
          if (!wasInProcess && item.prodDate) {
            if (item.prodDate >= monthStart && item.prodDate <= monthEnd) {
              wasInProcess = true;
            }
          }
          
          if (wasInProcess) {
            // Avoid duplicates
            const alreadyAdded = monthInfo.enProceso.some(existing => existing.key === item.key);
            if (!alreadyAdded) {
              monthInfo.enProceso.push(item);
              monthInfo.totalEnProceso++;
            }
          }
        });
      }
    });

    return Object.entries(monthlyData)
      .map(([key, data]) => ({ key, ...data }))
      .sort((a, b) => b.date - a.date);
  }, [data]);

  const chartData = useMemo(() => {
    return monthlyResults.map(month => ({
      name: month.month.substring(0, 7),
      finalizados: month.totalFinalizados,
      enProceso: month.totalEnProceso,
      fullName: month.month
    })).reverse();
  }, [monthlyResults]);

  const totals = useMemo(() => {
    return monthlyResults.reduce((acc, month) => ({
      finalizados: acc.finalizados + month.totalFinalizados,
      enProceso: acc.enProceso + month.totalEnProceso
    }), { finalizados: 0, enProceso: 0 });
  }, [monthlyResults]);

  // Export to PDF functionality
  const exportToPDF = async () => {
    // This would require html2canvas and jsPDF libraries
    // For now, export as CSV
    const csvData = monthlyResults.map(month => ({
      Mes: month.month,
      Finalizados: month.totalFinalizados,
      'En Proceso': month.totalEnProceso,
      'Total Actividad': month.totalFinalizados + month.totalEnProceso
    }));
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Mes,Finalizados,En Proceso,Total Actividad\n"
      + csvData.map(row => `${row.Mes},${row.Finalizados},${row['En Proceso']},${row['Total Actividad']}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `resultados-mensuales-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Individual month detailed view
  if (selectedMonth) {
    const items = selectedView === 'finalizados' ? selectedMonth.finalizados : selectedMonth.enProceso;
    const viewColors = selectedView === 'finalizados' 
      ? { border: 'border-green-500', bg: 'bg-green-50' }
      : { border: 'border-blue-500', bg: 'bg-blue-50' };
    
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{selectedMonth.month}</h2>
              <p className="text-gray-600">
                {selectedView === 'finalizados' ? 'Proyectos Finalizados' : 'Proyectos en Proceso'} 
                ({items.length} elementos)
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* View switcher */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setSelectedView('finalizados')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedView === 'finalizados'
                      ? 'bg-white text-green-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Finalizados ({selectedMonth.totalFinalizados})
                </button>
                <button
                  onClick={() => setSelectedView('enProceso')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedView === 'enProceso'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  En Proceso ({selectedMonth.totalEnProceso})
                </button>
              </div>
              
              <button
                onClick={() => setSelectedMonth(null)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Volver</span>
              </button>
            </div>
          </div>

          <TicketViewer
            tickets={items}
            title={`${selectedView === 'finalizados' ? 'Proyectos Finalizados' : 'Proyectos en Proceso'} - ${selectedMonth.month}`}
            showDateField={selectedView === 'finalizados' ? 'finalDate' : null}
            dateFieldLabel={selectedView === 'finalizados' ? 'Fecha Finalización' : 'Fecha'}
            emptyMessage={`No hay proyectos ${selectedView === 'finalizados' ? 'finalizados' : 'en proceso'} en este mes`}
            borderColor={viewColors.border}
            bgColor={viewColors.bg}
          />
        </div>
      </div>
    );
  }

  // Main monthly results view
  return (
    <div className="space-y-6">
      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-800">{totals.finalizados}</div>
              <div className="text-sm text-green-600">Total Finalizados (12 meses)</div>
            </div>
            <TrendingUp className="h-6 w-6 text-green-500" />
          </div>
        </div>
        
        <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
          <div className="text-2xl font-bold text-blue-800">{Math.round(totals.enProceso / monthlyResults.length)}</div>
          <div className="text-sm text-blue-600">Promedio En Proceso/Mes</div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500">
          <div className="text-2xl font-bold text-purple-800">
            {monthlyResults.length > 0 ? Math.round(totals.finalizados / monthlyResults.length) : 0}
          </div>
          <div className="text-sm text-purple-600">Promedio Finalización/Mes</div>
        </div>
        
        <div className="bg-orange-50 rounded-lg p-4 border-l-4 border-orange-500">
          <div className="text-2xl font-bold text-orange-800">
            {totals.finalizados > 0 ? Math.round((totals.finalizados / (totals.finalizados + totals.enProceso)) * 100) : 0}%
          </div>
          <div className="text-sm text-orange-600">Tasa de Finalización</div>
        </div>
      </div>

      {/* Evolution chart */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Evolución Mensual</h3>
          <button
            onClick={exportToPDF}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
          >
            <Download className="h-4 w-4" />
            <span>Exportar</span>
          </button>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip 
              labelFormatter={(label, payload) => {
                const item = chartData.find(d => d.name === label);
                return item ? item.fullName : label;
              }}
            />
            <Area 
              type="monotone" 
              dataKey="finalizados" 
              stackId="1"
              stroke="#10B981" 
              fill="#10B981" 
              fillOpacity={0.6} 
              name="Finalizados"
            />
            <Area 
              type="monotone" 
              dataKey="enProceso" 
              stackId="1"
              stroke="#3B82F6" 
              fill="#3B82F6" 
              fillOpacity={0.6} 
              name="En Proceso"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly results table */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Resultados Mensuales Detallados</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Mes</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Finalizados</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">En Proceso</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Total Actividad</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Tasa Finalización</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {monthlyResults.map((month, index) => {
                const totalActivity = month.totalFinalizados + month.totalEnProceso;
                const completionRate = totalActivity > 0 ? Math.round((month.totalFinalizados / totalActivity) * 100) : 0;
                
                return (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-800 capitalize">
                      {month.month}
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-semibold">
                        {month.totalFinalizados}
                      </span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-semibold">
                        {month.totalEnProceso}
                      </span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-sm font-semibold">
                        {totalActivity}
                      </span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-12 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-green-500 rounded-full transition-all duration-300"
                            style={{ width: `${completionRate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold">{completionRate}%</span>
                      </div>
                    </td>
                    <td className="text-center py-3 px-4">
                      <button
                        onClick={() => setSelectedMonth(month)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
                        disabled={totalActivity === 0}
                      >
                        Ver detalles
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200 p-6">
        <h3 className="font-semibold text-indigo-800 mb-3">Insights Ejecutivos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-white/70 rounded-lg p-3">
            <div className="font-semibold text-indigo-700 mb-1">Tendencia de Productividad</div>
            <p className="text-gray-700">
              {monthlyResults.length >= 3 ? (
                (() => {
                  const recent3 = monthlyResults.slice(0, 3).reduce((acc, m) => acc + m.totalFinalizados, 0) / 3;
                  const previous3 = monthlyResults.slice(3, 6).reduce((acc, m) => acc + m.totalFinalizados, 0) / 3;
                  const trend = recent3 > previous3 ? 'creciente' : recent3 < previous3 ? 'decreciente' : 'estable';
                  return `Tendencia ${trend} en los últimos 3 meses (${Math.round(recent3)} vs ${Math.round(previous3)})`;
                })()
              ) : (
                'Necesitas más datos para análisis de tendencias'
              )}
            </p>
          </div>
          <div className="bg-white/70 rounded-lg p-3">
            <div className="font-semibold text-indigo-700 mb-1">Mes Más Productivo</div>
            <p className="text-gray-700">
              {monthlyResults.length > 0 ? (
                (() => {
                  const bestMonth = monthlyResults.reduce((best, month) => 
                    month.totalFinalizados > best.totalFinalizados ? month : best
                  );
                  return `${bestMonth.month} con ${bestMonth.totalFinalizados} finalizaciones`;
                })()
              ) : (
                'Sin datos disponibles'
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultadosPorMesModule;
