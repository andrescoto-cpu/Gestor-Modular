import React, { useMemo, useState } from 'react';
import { Zap, Info, Download, BarChart3 } from 'lucide-react';
import { SCORING_CONFIG } from '../utils/constants';
import { ScoringUtils } from '../utils/scoringUtils';
import { JiraLink } from '../common/TicketViewer';
import Papa from 'papaparse';

const ScoringModule = ({ data }) => {
  const [showFormulaExplanation, setShowFormulaExplanation] = useState(false);

  const processedData = useMemo(() => {
    return data.map((item, index) => {
      // Transform item to match scoring format
      const scoringItem = {
        'Valoración prioridad Negocio': item.businessPriority,
        'Valoración Prioridad Tecnología': item.technologyPriority,
        'Sizing': item.sizing,
        'Estado': item.state,
        'Clave': item.key,
        'Resumen': item.summary,
        'Responsable Dev': item.devResponsible,
        'PAIS_BM': item.country
      };
      
      return {
        ...item,
        intelligentScore: ScoringUtils.calculateIntelligentScore(scoringItem),
        originalIndex: index
      };
    });
  }, [data]);

  const filteredData = useMemo(() => {
    // Filter out completed and in-progress items (only items eligible for prioritization)
    const dataFiltrada = ScoringUtils.filterProjectsByCategory(processedData);
    
    return dataFiltrada
      .sort((a, b) => (b.intelligentScore || 0) - (a.intelligentScore || 0))
      .map((item, index) => ({
        ...item,
        rank: index + 1
      }));
  }, [processedData]);

  const stats = useMemo(() => {
    return {
      total: processedData.length,
      showing: filteredData.length,
      avgScore: filteredData.length > 0 
        ? Math.round(filteredData.reduce((sum, item) => sum + (item.intelligentScore || 0), 0) / filteredData.length)
        : 0,
      highPriority: filteredData.filter(item => (item.intelligentScore || 0) >= 80).length,
      mediumPriority: filteredData.filter(item => (item.intelligentScore || 0) >= 60 && (item.intelligentScore || 0) < 80).length,
      lowPriority: filteredData.filter(item => (item.intelligentScore || 0) < 60).length
    };
  }, [processedData, filteredData]);

  const getScoreClass = (score) => {
    if (score >= 80) return 'bg-red-100 text-red-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getScoreLevel = (score) => {
    if (score >= 80) return 'Crítico';
    if (score >= 60) return 'Alto';
    return 'Medio/Bajo';
  };

  const getStateClass = (estado) => {
    if (['PRIORIZAR', 'Highest', 'Prioridad 1'].includes(estado)) {
      return 'bg-red-100 text-red-800';
    }
    if (['APROBACION DISEÑO TECNICO', 'Aprobacion Diseño Negocio'].includes(estado)) {
      return 'bg-yellow-100 text-yellow-800';
    }
    return 'bg-blue-100 text-blue-800';
  };

  const exportResults = () => {
    const csvData = filteredData.map(item => ({
      Rank: item.rank,
      Score: item.intelligentScore,
      Nivel: getScoreLevel(item.intelligentScore || 0),
      Clave: item.key,
      Resumen: item.summary,
      Estado: item.state,
      Sizing: item.sizing,
      'Prioridad Negocio': item.businessPriority,
      'Prioridad Tecnología': item.technologyPriority,
      'Responsable Dev': item.devResponsible,
      País: item.country,
      Épica: item.epic
    }));
    
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `scoring-multimoney-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header with metrics */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Zap className="h-5 w-5 text-indigo-600" />
                Scoring Inteligente MultiMoney
              </h2>
              <p className="text-gray-600 mt-1">
                Algoritmo multifactor: Negocio (40%) + Tecnología (25%) + Sizing (20%) + Estado (15%)
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFormulaExplanation(!showFormulaExplanation)}
                className="bg-indigo-100 text-indigo-700 px-3 py-2 rounded-lg hover:bg-indigo-200 transition-colors flex items-center gap-2 text-sm"
              >
                <Info className="h-4 w-4" />
                {showFormulaExplanation ? 'Ocultar' : 'Ver'} Fórmula
              </button>
              
              <button
                onClick={exportResults}
                className="bg-green-100 text-green-700 px-3 py-2 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-2 text-sm"
              >
                <Download className="h-4 w-4" />
                Exportar
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-600">Total Proyectos</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                </div>
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="text-lg font-bold text-green-800">{stats.showing}</div>
              <div className="text-xs text-green-600">Elegibles para Scoring</div>
            </div>
            
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="text-lg font-bold text-red-800">{stats.highPriority}</div>
              <div className="text-xs text-red-600">Críticos (80+)</div>
            </div>
            
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="text-lg font-bold text-yellow-800">{stats.mediumPriority}</div>
              <div className="text-xs text-yellow-600">Altos (60-79)</div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="text-lg font-bold text-purple-800">{stats.avgScore}</div>
              <div className="text-xs text-purple-600">Score Promedio</div>
            </div>
          </div>
        </div>
      </div>

      {/* Formula explanation */}
      {showFormulaExplanation && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-6 bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
            <h3 className="text-xl font-bold text-indigo-900 mb-6">
              Fórmula de Scoring MultiMoney
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h4 className="font-bold text-indigo-800 mb-3">Negocio (40%)</h4>
                  <div className="space-y-2 text-sm">
                    {Object.entries(SCORING_CONFIG.businessValues).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span><strong>{key}</strong></span>
                        <span className="bg-indigo-100 px-2 py-1 rounded text-indigo-800 font-bold">{value} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h4 className="font-bold text-indigo-800 mb-3">Tecnología (25%)</h4>
                  <div className="space-y-2 text-sm">
                    {Object.entries(SCORING_CONFIG.technologyValues).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span><strong>{key}</strong></span>
                        <span className="bg-purple-100 px-2 py-1 rounded text-purple-800 font-bold">{value} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h4 className="font-bold text-indigo-800 mb-3">Sizing (20%)</h4>
                  <div className="space-y-2 text-sm">
                    {Object.entries(SCORING_CONFIG.sizingValues).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span><strong>{key}</strong></span>
                        <span className="bg-green-100 px-2 py-1 rounded text-green-800 font-bold">{value} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h4 className="font-bold text-indigo-800 mb-3">Estado (15%)</h4>
                  <div className="space-y-2 text-sm">
                    {Object.entries(SCORING_CONFIG.stateValues).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span><strong>{key}</strong></span>
                        <span className="bg-blue-100 px-2 py-1 rounded text-blue-800 font-bold">{value} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-white rounded-lg border-2 border-indigo-200">
              <h4 className="font-bold text-gray-900 mb-2">Fórmula Final:</h4>
              <p className="text-lg font-mono text-gray-800 bg-gray-50 p-2 rounded">
                Score = (Negocio × 0.4) + (Tecnología × 0.25) + (Sizing × 0.2) + (Estado × 0.15)
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Los proyectos con score más alto requieren priorización inmediata
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Ranking de Priorización</h3>
          <p className="text-sm text-gray-600">Proyectos ordenados por score de priorización (excluye finalizados y en progreso)</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nivel</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clave</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resumen</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sizing</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Responsable</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.slice(0, 50).map((item, index) => (
                <tr key={`${item.key || ''}-${index}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex items-center space-x-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        item.rank <= 5 ? 'bg-red-500' :
                        item.rank <= 15 ? 'bg-orange-500' :
                        'bg-gray-500'
                      }`}>
                        {item.rank}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreClass(item.intelligentScore || 0)}`}>
                      {item.intelligentScore || 0}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreClass(item.intelligentScore || 0)}`}>
                      {getScoreLevel(item.intelligentScore || 0)}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <JiraLink ticketKey={item.key} className="font-medium">
                      {item.key || 'N/A'}
                    </JiraLink>
                  </td>
                  
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                    <div className="truncate" title={item.summary || 'Sin descripción'}>
                      {item.summary || 'Sin descripción'}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStateClass(item.state || '')}`}>
                      {item.state || 'N/A'}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      ['XS', 'S'].includes(item.sizing) ? 'bg-green-100 text-green-800' :
                      item.sizing === 'M' ? 'bg-yellow-100 text-yellow-800' :
                      ['L', 'XL'].includes(item.sizing) ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.sizing || 'N/A'}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.devResponsible || item.assignee || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredData.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Zap className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p>No hay proyectos elegibles para scoring</p>
            <p className="text-sm mt-1">Los proyectos necesitan datos de priorización completos</p>
          </div>
        )}

        <div className="px-6 py-4 bg-gray-50 border-t">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              Mostrando {Math.min(50, filteredData.length)} de {filteredData.length} proyectos MultiMoney ordenados por score
            </div>
            <div className="text-xs text-gray-500">
              Solo elementos pendientes de priorización (excluye en progreso y finalizados)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScoringModule;
