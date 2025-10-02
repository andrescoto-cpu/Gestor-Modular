import React, { useState, useMemo } from 'react';
import { Target, ArrowLeft } from 'lucide-react';
import { STATE_CATEGORIES } from '../utils/constants';
import { isValidEpic } from '../utils/dataProcessing';
import TicketViewer from '../common/TicketViewer';

const EpicasModule = ({ data = [] }) => {
  const [selectedEpic, setSelectedEpic] = useState(null);
  const [drilldownCategory, setDrilldownCategory] = useState(null);

  const epicsAnalysis = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) return [];

    const epicStats = {};
    
    data.forEach(item => {
      if (!item || !isValidEpic(item.epic)) return;
      
      if (!epicStats[item.epic]) {
        epicStats[item.epic] = {
          epic: item.epic, total: 0, finalizados: 0, enProceso: 0, enAprobacion: 0,
          enDiseno: 0, aPriorizar: 0, bocaBacklog: 0, cancelados: 0, otros: 0,
          healthScore: 0, items: []
        };
      }
      
      const stats = epicStats[item.epic];
      stats.total++;
      stats.items.push(item);
      
      if (STATE_CATEGORIES.finalizados.includes(item.state)) {
        stats.finalizados++;
      } else if (STATE_CATEGORIES.enProceso.includes(item.state)) {
        stats.enProceso++;
      } else if (STATE_CATEGORIES.enAprobacion.includes(item.state)) {
        stats.enAprobacion++;
      } else if (STATE_CATEGORIES.enDiseno.includes(item.state)) {
        stats.enDiseno++;
      } else if (STATE_CATEGORIES.aPriorizar.includes(item.state)) {
        stats.aPriorizar++;
      } else if (STATE_CATEGORIES.bocaBacklog.includes(item.state)) {
        stats.bocaBacklog++;
      } else if (STATE_CATEGORIES.cancelados.includes(item.state)) {
        stats.cancelados++;
      } else {
        stats.otros++;
      }
    });
    
    // Calculate health score: 60% completados + 30% en proceso + 15% aprobación
    Object.values(epicStats).forEach(stats => {
      if (stats.total === 0) {
        stats.healthScore = 0;
        return;
      }
      
      const completadosPct = stats.finalizados / stats.total;
      const enProcesoPct = stats.enProceso / stats.total;
      const enAprobacionPct = stats.enAprobacion / stats.total;
      
      let healthScore = completadosPct * 60 + enProcesoPct * 30 + enAprobacionPct * 15;
      stats.healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));
    });
    
    return Object.values(epicStats)
      .filter(epic => epic.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [data]);

  const handleCategoryClick = (epic, category) => {
    setSelectedEpic(epic);
    setDrilldownCategory(category);
  };

  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Target className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600">No hay datos disponibles</h3>
        </div>
      </div>
    );
  }

  // Drill-down view
  if (selectedEpic && drilldownCategory) {
    const categoryItems = selectedEpic.items.filter(item => {
      switch(drilldownCategory) {
        case 'finalizados': return STATE_CATEGORIES.finalizados.includes(item.state);
        case 'enProceso': return STATE_CATEGORIES.enProceso.includes(item.state);
        case 'enAprobacion': return STATE_CATEGORIES.enAprobacion.includes(item.state);
        case 'enDiseno': return STATE_CATEGORIES.enDiseno.includes(item.state);
        case 'aPriorizar': return STATE_CATEGORIES.aPriorizar.includes(item.state);
        case 'bocaBacklog': return STATE_CATEGORIES.bocaBacklog.includes(item.state);
        case 'cancelados': return STATE_CATEGORIES.cancelados.includes(item.state);
        case 'otros': {
          const allCategorizedStates = Object.values(STATE_CATEGORIES).flat();
          return !allCategorizedStates.includes(item.state);
        }
        default: return false;
      }
    }).map(item => ({
      key: item.key, summary: item.summary, state: item.state,
      country: item.country, assignee: item.assignee, endDate: item.endDate
    }));

    const categoryColors = {
      'finalizados': { border: 'border-green-500', bg: 'bg-green-50', title: 'Finalizados' },
      'enProceso': { border: 'border-blue-500', bg: 'bg-blue-50', title: 'En Proceso' },
      'enAprobacion': { border: 'border-purple-500', bg: 'bg-purple-50', title: 'En Aprobación' },
      'enDiseno': { border: 'border-pink-500', bg: 'bg-pink-50', title: 'En Diseño' },
      'aPriorizar': { border: 'border-yellow-500', bg: 'bg-yellow-50', title: 'A Priorizar' },
      'bocaBacklog': { border: 'border-orange-500', bg: 'bg-orange-50', title: 'Boca Backlog' },
      'cancelados': { border: 'border-red-500', bg: 'bg-red-50', title: 'Cancelados' },
      'otros': { border: 'border-gray-500', bg: 'bg-gray-50', title: 'Otros' }
    };

    const categoryStyle = categoryColors[drilldownCategory] || categoryColors.otros;

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">{selectedEpic.epic}</h2>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>{categoryStyle.title} ({categoryItems.length} elementos)</span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Health Score: {selectedEpic.healthScore}%
                </span>
              </div>
            </div>
            <button
              onClick={() => {setSelectedEpic(null); setDrilldownCategory(null);}}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Volver</span>
            </button>
          </div>

          <TicketViewer
            tickets={categoryItems}
            title={`${selectedEpic.epic} - ${categoryStyle.title}`}
            emptyMessage={`No hay elementos en la categoría ${categoryStyle.title}`}
            borderColor={categoryStyle.border}
            bgColor={categoryStyle.bg}
          />
        </div>
      </div>
    );
  }

  // Main épicas view
  return (
    <div className="space-y-4">
      {/* Health Score Explanation */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200 p-4">
        <div className="flex items-start space-x-3">
          <Target className="h-6 w-6 text-indigo-600 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-indigo-800 mb-2">Metodología de Health Score</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white/70 rounded-lg p-3 border border-indigo-100">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">60%</div>
                  <span className="font-semibold text-green-700">Finalizados</span>
                </div>
                <p className="text-gray-700 text-xs">Peso principal del score por proyectos completados</p>
              </div>
              <div className="bg-white/70 rounded-lg p-3 border border-indigo-100">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">30%</div>
                  <span className="font-semibold text-blue-700">En Proceso</span>
                </div>
                <p className="text-gray-700 text-xs">Contribución por trabajo activo en progreso</p>
              </div>
              <div className="bg-white/70 rounded-lg p-3 border border-indigo-100">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">15%</div>
                  <span className="font-semibold text-purple-700">Aprobación</span>
                </div>
                <p className="text-gray-700 text-xs">Contribución menor por elementos en revisión</p>
              </div>
            </div>
            <div className="mt-3 p-2 bg-white/50 border border-indigo-200 rounded text-xs">
              <strong>Fórmula:</strong> Health Score = (Finalizados × 0.6) + (En Proceso × 0.3) + (Aprobación × 0.15)
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-4">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Análisis por Épicas</h2>
        
        <div className="space-y-3 max-h-[70vh] overflow-y-auto">
          {epicsAnalysis.map((epic, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-800 truncate" title={epic.epic}>
                    {epic.epic}
                  </h3>
                  <div className="flex items-center space-x-4 text-xs text-gray-600">
                    <span>{epic.total} proyectos</span>
                    <span>{epic.finalizados} completados ({Math.round((epic.finalizados/epic.total)*100)}%)</span>
                  </div>
                </div>
                
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg border-2 ${
                  epic.healthScore >= 80 ? 'bg-green-100 border-green-300 text-green-800' :
                  epic.healthScore >= 60 ? 'bg-yellow-100 border-yellow-300 text-yellow-800' :
                  epic.healthScore >= 40 ? 'bg-orange-100 border-orange-300 text-orange-800' :
                  'bg-red-100 border-red-300 text-red-800'
                }`}>
                  <span className="font-bold text-sm">Health: {epic.healthScore}%</span>
                </div>
              </div>
              
              {/* Clickable categories grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
                <div 
                  className="bg-green-50 border border-green-200 rounded-lg p-2 text-center cursor-pointer hover:bg-green-100 transition-colors"
                  onClick={() => handleCategoryClick(epic, 'finalizados')}
                  title="Ver proyectos finalizados"
                >
                  <div className="text-xs font-bold text-green-600">{epic.finalizados}</div>
                  <div className="text-xs font-medium text-green-700">Finalizados</div>
                </div>
                
                <div 
                  className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={() => handleCategoryClick(epic, 'enProceso')}
                  title="Ver proyectos en proceso"
                >
                  <div className="text-xs font-bold text-blue-600">{epic.enProceso}</div>
                  <div className="text-xs font-medium text-blue-700">En Proceso</div>
                </div>
                
                <div 
                  className="bg-purple-50 border border-purple-200 rounded-lg p-2 text-center cursor-pointer hover:bg-purple-100 transition-colors"
                  onClick={() => handleCategoryClick(epic, 'enAprobacion')}
                  title="Ver proyectos en aprobación"
                >
                  <div className="text-xs font-bold text-purple-600">{epic.enAprobacion}</div>
                  <div className="text-xs font-medium text-purple-700">Aprobación</div>
                </div>
                
                <div 
                  className="bg-pink-50 border border-pink-200 rounded-lg p-2 text-center cursor-pointer hover:bg-pink-100 transition-colors"
                  onClick={() => handleCategoryClick(epic, 'enDiseno')}
                  title="Ver proyectos en diseño"
                >
                  <div className="text-xs font-bold text-pink-600">{epic.enDiseno}</div>
                  <div className="text-xs font-medium text-pink-700">Diseño</div>
                </div>
                
                <div 
                  className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-center cursor-pointer hover:bg-yellow-100 transition-colors"
                  onClick={() => handleCategoryClick(epic, 'aPriorizar')}
                  title="Ver proyectos a priorizar"
                >
                  <div className="text-xs font-bold text-yellow-600">{epic.aPriorizar}</div>
                  <div className="text-xs font-medium text-yellow-700">A Priorizar</div>
                </div>
                
                <div 
                  className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-center cursor-pointer hover:bg-orange-100 transition-colors"
                  onClick={() => handleCategoryClick(epic, 'bocaBacklog')}
                  title="Ver proyectos en boca backlog"
                >
                  <div className="text-xs font-bold text-orange-600">{epic.bocaBacklog}</div>
                  <div className="text-xs font-medium text-orange-700">Boca Backlog</div>
                </div>
                
                <div 
                  className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-center cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleCategoryClick(epic, 'otros')}
                  title="Ver otros proyectos"
                >
                  <div className="text-xs font-bold text-gray-600">{epic.otros}</div>
                  <div className="text-xs font-medium text-gray-700">Otros</div>
                </div>
                
                <div 
                  className="bg-red-50 border border-red-200 rounded-lg p-2 text-center cursor-pointer hover:bg-red-100 transition-colors"
                  onClick={() => handleCategoryClick(epic, 'cancelados')}
                  title="Ver proyectos cancelados"
                >
                  <div className="text-xs font-bold text-red-600">{epic.cancelados}</div>
                  <div className="text-xs font-medium text-red-700">Cancelados</div>
                </div>
              </div>
              
              {/* Verification row */}
              <div className="mt-2 text-xs text-gray-500 text-right">
                Total verificado: {epic.finalizados + epic.enProceso + epic.enAprobacion + epic.enDiseno + epic.aPriorizar + epic.bocaBacklog + epic.cancelados + epic.otros} = {epic.total}
              </div>
            </div>
          ))}
        </div>

        {epicsAnalysis.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Target className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p>No se encontraron épicas válidas</p>
            <p className="text-sm mt-1">Asegúrate de que los datos contengan épicas válidas</p>
          </div>
        )}

        <div className="mt-4 text-xs text-gray-600 text-center">
          Haz clic en cualquier categoría para ver el detalle de los tickets
        </div>
      </div>
    </div>
  );
};

export default EpicasModule;
