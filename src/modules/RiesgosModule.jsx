import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react';
import { STATE_CATEGORIES } from '../utils/constants';
import TicketViewer from '../common/TicketViewer';

const RiesgosModule = ({ data }) => {
  const [selectedRiskCategory, setSelectedRiskCategory] = useState(null);

  const riskAnalysis = useMemo(() => {
    const today = new Date();
    // CRITICAL: Solo elementos activos (excluye finalizados)
    const activeItems = data.filter(item => !STATE_CATEGORIES.finalizados.includes(item.state));
    
    const atrasados = activeItems.filter(item => item.endDate && item.endDate < today);
    const sinAsignar = activeItems.filter(item => !item.assignee || item.assignee.trim() === '');
    const altaPrioridad = activeItems.filter(item => ['Highest', 'High'].includes(item.priority));
    const sinFechaVencimiento = activeItems.filter(item => !item.endDate);
    
    const proximos7Dias = new Date(today);
    proximos7Dias.setDate(today.getDate() + 7);
    const porVencer = activeItems.filter(item => 
      item.endDate && item.endDate > today && item.endDate <= proximos7Dias
    );

    return {
      elementosActivos: activeItems.length,
      atrasados: atrasados.length,
      sinAsignar: sinAsignar.length,
      altaPrioridad: altaPrioridad.length,
      sinFechaVencimiento: sinFechaVencimiento.length,
      porVencer: porVencer.length,
      atrasadosDetalle: atrasados.map(item => ({
        key: item.key, summary: item.summary, state: item.state,
        country: item.country, assignee: item.assignee, endDate: item.endDate
      })),
      porVencerDetalle: porVencer.map(item => ({
        key: item.key, summary: item.summary, state: item.state,
        country: item.country, assignee: item.assignee, endDate: item.endDate
      })),
      sinAsignarDetalle: sinAsignar.map(item => ({
        key: item.key, summary: item.summary, state: item.state,
        country: item.country, assignee: item.assignee, endDate: item.endDate
      })),
      altaPrioridadDetalle: altaPrioridad.map(item => ({
        key: item.key, summary: item.summary, state: item.state,
        country: item.country, assignee: item.assignee, priority: item.priority, endDate: item.endDate
      }))
    };
  }, [data]);

  if (riskAnalysis.elementosActivos === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h3 className="text-lg font-semibold text-green-700">Sin riesgos detectados</h3>
          <p className="text-gray-600 mt-2">Todos los elementos están finalizados o no presentan riesgos.</p>
        </div>
      </div>
    );
  }

  if (selectedRiskCategory) {
    let categoryData, categoryTitle, categoryDescription, borderColor, bgColor;

    switch(selectedRiskCategory) {
      case 'atrasados':
        categoryData = riskAnalysis.atrasadosDetalle;
        categoryTitle = 'Elementos Atrasados';
        categoryDescription = 'Proyectos que han superado su fecha de vencimiento';
        borderColor = 'border-red-500'; bgColor = 'bg-red-50';
        break;
      case 'porVencer':
        categoryData = riskAnalysis.porVencerDetalle;
        categoryTitle = 'Por Vencer (Próximos 7 días)';
        categoryDescription = 'Proyectos que vencen en la próxima semana';
        borderColor = 'border-orange-500'; bgColor = 'bg-orange-50';
        break;
      case 'sinAsignar':
        categoryData = riskAnalysis.sinAsignarDetalle;
        categoryTitle = 'Sin Asignar';
        categoryDescription = 'Proyectos que no tienen persona asignada';
        borderColor = 'border-yellow-500'; bgColor = 'bg-yellow-50';
        break;
      case 'altaPrioridad':
        categoryData = riskAnalysis.altaPrioridadDetalle;
        categoryTitle = 'Alta Prioridad';
        categoryDescription = 'Proyectos marcados como alta prioridad';
        borderColor = 'border-purple-500'; bgColor = 'bg-purple-50';
        break;
      default:
        categoryData = [];
    }

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">{categoryTitle}</h2>
              <p className="text-sm text-gray-600">{categoryDescription} ({categoryData.length} elementos)</p>
            </div>
            <button
              onClick={() => setSelectedRiskCategory(null)}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Volver</span>
            </button>
          </div>

          <TicketViewer
            tickets={categoryData}
            title={categoryTitle}
            showDateField="endDate"
            dateFieldLabel="Fecha Vencimiento"
            emptyMessage={`No hay elementos en la categoría ${categoryTitle.toLowerCase()}`}
            borderColor={borderColor}
            bgColor={bgColor}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Alert destacando que excluye finalizados */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-2">
          <AlertTriangle className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-blue-800">Análisis de Riesgos Activos</h3>
        </div>
        <p className="text-blue-700 text-sm">
          Este módulo analiza únicamente proyectos <strong>activos</strong> y excluye automáticamente 
          todos los elementos finalizados para enfocar la atención en riesgos accionables.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Análisis de Riesgos</h2>
            <p className="text-xs text-gray-600">Solo elementos activos (excluye finalizados)</p>
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-600">
            <AlertTriangle className="h-4 w-4" />
            <span>{riskAnalysis.elementosActivos} elementos activos analizados</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-500">
            <div className="text-lg font-bold text-blue-800">{riskAnalysis.elementosActivos}</div>
            <div className="text-xs text-blue-600">Elementos Activos</div>
          </div>
          
          <div 
            className="bg-red-50 rounded-lg p-3 border-l-4 border-red-500 cursor-pointer hover:bg-red-100 transition-colors"
            onClick={() => setSelectedRiskCategory('atrasados')}
          >
            <div className="text-lg font-bold text-red-800">{riskAnalysis.atrasados}</div>
            <div className="text-xs text-red-600">Atrasados</div>
          </div>
          
          <div 
            className="bg-orange-50 rounded-lg p-3 border-l-4 border-orange-500 cursor-pointer hover:bg-orange-100 transition-colors"
            onClick={() => setSelectedRiskCategory('porVencer')}
          >
            <div className="text-lg font-bold text-orange-800">{riskAnalysis.porVencer}</div>
            <div className="text-xs text-orange-600">Por Vencer (7 días)</div>
          </div>
          
          <div 
            className="bg-yellow-50 rounded-lg p-3 border-l-4 border-yellow-500 cursor-pointer hover:bg-yellow-100 transition-colors"
            onClick={() => setSelectedRiskCategory('sinAsignar')}
          >
            <div className="text-lg font-bold text-yellow-800">{riskAnalysis.sinAsignar}</div>
            <div className="text-xs text-yellow-600">Sin Asignar</div>
          </div>
          
          <div 
            className="bg-purple-50 rounded-lg p-3 border-l-4 border-purple-500 cursor-pointer hover:bg-purple-100 transition-colors"
            onClick={() => setSelectedRiskCategory('altaPrioridad')}
          >
            <div className="text-lg font-bold text-purple-800">{riskAnalysis.altaPrioridad}</div>
            <div className="text-xs text-purple-600">Alta Prioridad</div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-gray-500">
            <div className="text-lg font-bold text-gray-800">{riskAnalysis.sinFechaVencimiento}</div>
            <div className="text-xs text-gray-600">Sin Fecha</div>
          </div>
        </div>

        {/* Resumen de riesgos */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-base font-semibold text-gray-800 mb-3">Resumen de Riesgos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-red-700 mb-2 text-sm">Riesgos Críticos</h4>
              <ul className="space-y-1 text-xs">
                <li className="flex justify-between">
                  <span>Elementos atrasados:</span>
                  <span className="font-semibold text-red-600">{riskAnalysis.atrasados}</span>
                </li>
                <li className="flex justify-between">
                  <span>Por vencer (7 días):</span>
                  <span className="font-semibold text-orange-600">{riskAnalysis.porVencer}</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-yellow-700 mb-2 text-sm">Riesgos Operativos</h4>
              <ul className="space-y-1 text-xs">
                <li className="flex justify-between">
                  <span>Sin asignar:</span>
                  <span className="font-semibold text-yellow-600">{riskAnalysis.sinAsignar}</span>
                </li>
                <li className="flex justify-between">
                  <span>Sin fecha de vencimiento:</span>
                  <span className="font-semibold text-gray-600">{riskAnalysis.sinFechaVencimiento}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Nivel de riesgo global */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <h4 className="font-semibold text-blue-800 text-sm">Nivel de Riesgo Global</h4>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-300 ${
                      (riskAnalysis.atrasados + riskAnalysis.porVencer) / riskAnalysis.elementosActivos > 0.3 
                        ? 'bg-red-500' 
                        : (riskAnalysis.atrasados + riskAnalysis.porVencer) / riskAnalysis.elementosActivos > 0.15
                        ? 'bg-orange-500'
                        : 'bg-green-500'
                    }`}
                    style={{ 
                      width: `${Math.min(100, ((riskAnalysis.atrasados + riskAnalysis.porVencer) / riskAnalysis.elementosActivos) * 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
              <span className="text-xs font-semibold text-gray-700">
                {Math.round(((riskAnalysis.atrasados + riskAnalysis.porVencer) / riskAnalysis.elementosActivos) * 100)}% en riesgo
              </span>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-600 text-center">
          Haz clic en cualquier métrica para ver el detalle de los elementos
        </div>
      </div>
    </div>
  );
};

export default RiesgosModule;
