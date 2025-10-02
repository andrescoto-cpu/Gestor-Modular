import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Upload, Download, X, RefreshCw, AlertTriangle, BarChart3, Brain, Zap, Target, Calendar, Users, TrendingUp, CheckCircle } from 'lucide-react';
import Papa from 'papaparse';

// Import modules
import DashboardModule from './modules/DashboardModule';
import EpicasModule from './modules/EpicasModule';
import TimelineModule from './modules/TimelineModule';
import RecursosModule from './modules/RecursosModule';
import RiesgosModule from './modules/RiesgosModule';
import FinalizadosModule from './modules/FinalizadosModule';
import ResultadosPorMesModule from './modules/ResultadosPorMesModule';
import ScoringModule from './modules/ScoringModule';
import MLInsightsModule from './modules/MLInsightsModule';

// Import utilities
import { VALID_COUNTRIES, countryNames, STATE_CATEGORIES, CSV_URL } from './utils/constants';
import { processCSVData, isValidEpic, identifyRealAreas } from './utils/dataProcessing';
import { ScoringUtils } from './utils/scoringUtils';

// Import common components
import LoadingProgress from './common/LoadingProgress';

const MultimoneySystem = () => {
  const [processedData, setProcessedData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [activeModule, setActiveModule] = useState('dashboard');
  const [hasData, setHasData] = useState(false);
  const [error, setError] = useState(null);
  
  const [filters, setFilters] = useState({
    country: '', epic: '', area: '', soloFinalizados: '',
    finalizadosDesde: null, timelineDesde: null
  });

  // Filtered data based on current filters
  const filteredData = useMemo(() => {
    let filtered = [...processedData];
    
    if (filters.country) {
      filtered = filtered.filter(item => item.country === filters.country);
    }
    
    if (filters.epic) {
      filtered = filtered.filter(item => item.epic === filters.epic);
    }
    
    if (filters.area) {
      filtered = filtered.filter(item => item.area === filters.area);
    }
    
    if (filters.soloFinalizados) {
      switch (filters.soloFinalizados) {
        case 'finalizados':
          filtered = filtered.filter(item => STATE_CATEGORIES.finalizados.includes(item.state));
          break;
        case 'activos':
          filtered = filtered.filter(item => 
            STATE_CATEGORIES.enProceso.includes(item.state) ||
            STATE_CATEGORIES.enAprobacion.includes(item.state) ||
            STATE_CATEGORIES.enDiseno.includes(item.state) ||
            STATE_CATEGORIES.aPriorizar.includes(item.state) ||
            STATE_CATEGORIES.bocaBacklog.includes(item.state)
          );
          break;
      }
    }
    
    if (filters.finalizadosDesde) {
      filtered = filtered.filter(item => {
        if (!STATE_CATEGORIES.finalizados.includes(item.state)) return true;
        const finalDate = item.prodDate || item.uatEnd;
        return finalDate && finalDate >= filters.finalizadosDesde;
      });
    }
    
    return filtered;
  }, [processedData, filters]);

  // Filter options for dropdowns
  const filterOptions = useMemo(() => {
    const countries = [...new Set(processedData.map(item => item.country).filter(c => VALID_COUNTRIES.includes(c)))];
    const areas = identifyRealAreas([...new Set(processedData.map(item => item.area).filter(Boolean))]);
    
    let epicsData = processedData;
    if (filters.area) {
      epicsData = processedData.filter(item => item.area === filters.area);
    }
    const epics = [...new Set(epicsData.map(item => item.epic).filter(isValidEpic))];
    
    return { countries, epics, areas };
  }, [processedData, filters.area]);

  // Calculate counts for each module
  const counts = useMemo(() => {
    const riesgos = filteredData.filter(item => {
      if (STATE_CATEGORIES.finalizados.includes(item.state)) return false;
      const today = new Date();
      return (item.endDate && item.endDate < today) ||
             (['Highest', 'High'].includes(item.priority));
    });
    
    const finalizados = filteredData.filter(item => STATE_CATEGORIES.finalizados.includes(item.state));
    
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const resultadosUltimoMes = filteredData.filter(item => {
      if (!STATE_CATEGORIES.finalizados.includes(item.state)) return false;
      const finalDate = item.prodDate || item.uatEnd || item.endDate;
      return finalDate && 
             finalDate.getFullYear() === lastMonth.getFullYear() && 
             finalDate.getMonth() === lastMonth.getMonth();
    });
    
    const uniqueResources = new Set();
    filteredData.forEach(item => {
      if (item.devResponsible && item.devResponsible.trim() !== '' && item.devResponsible !== '#N/A') {
        uniqueResources.add(item.devResponsible.trim());
      } else if (item.assignee && item.assignee.trim() !== '' && item.assignee !== '#N/A') {
        uniqueResources.add(item.assignee.trim());
      }
    });
    
    const scoringEligible = ScoringUtils.filterProjectsByCategory(filteredData);
    
    return {
      dashboard: filteredData.length,
      riesgos: riesgos.length,
      finalizados: finalizados.length,
      resultadosmes: resultadosUltimoMes.length,
      recursos: uniqueResources.size,
      scoring: scoringEligible.length
    };
  }, [filteredData]);

  const simulateLoading = useCallback(async () => {
    const stages = [5, 15, 35, 55, 80, 95, 100];
    
    for (const percent of stages) {
      setLoadingProgress(percent);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }, []);

  const loadDataFromURL = useCallback(async () => {
    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingMessage('Conectando con el servidor...');
    setError(null);
    
    try {
      setLoadingProgress(10);
      setLoadingMessage('Descargando datos...');
      
      const response = await fetch(CSV_URL);
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      setLoadingProgress(30);
      setLoadingMessage('Procesando archivo CSV...');
      
      const csvText = await response.text();
      
      await simulateLoading();
      
      Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          const processed = processCSVData(results.data);
          
          setProcessedData(processed);
          setHasData(true);
          setIsLoading(false);
          setLoadingMessage('');
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          setError('Error al procesar el archivo CSV');
          setIsLoading(false);
          setLoadingMessage('');
        }
      });
    } catch (error) {
      console.error('Error loading data:', error);
      setError(`Error al cargar los datos: ${error.message}`);
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [simulateLoading]);

  useEffect(() => {
    loadDataFromURL();
  }, [loadDataFromURL]);

  const handleFileUpload = useCallback(async (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.csv')) {
      alert('Por favor selecciona un archivo CSV válido');
      return;
    }
    
    setIsLoading(true);
    setLoadingProgress(0);
    setError(null);
    
    try {
      await simulateLoading();
      
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          const processed = processCSVData(results.data);
          
          setProcessedData(processed);
          setHasData(true);
          setIsLoading(false);
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          setError('Error al procesar el archivo CSV');
          setIsLoading(false);
        }
      });
    } catch (error) {
      console.error('Error:', error);
      setError('Error al procesar el archivo');
      setIsLoading(false);
    }
  }, [simulateLoading]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const exportCSV = useCallback(() => {
    if (filteredData.length === 0) return;
    
    const csvContent = Papa.unparse(filteredData.map(item => ({
      'Clave': item.key, 'Resumen': item.summary, 'Estado': item.state,
      'PAIS_BM': item.country, 'Epica': item.epic, 'Persona asignada': item.assignee,
      'Responsable Dev': item.devResponsible, 'Prioridad': item.priority, 'Area responsable': item.area
    })));
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `multimoney-filtrado-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }, [filteredData]);

  // Sidebar navigation items
  const sidebarItems = [
    { id: 'dashboard', icon: BarChart3, label: 'Dashboard', count: counts.dashboard },
    { id: 'ml-insights', icon: Brain, label: 'ML Insights', count: null },
    { id: 'scoring', icon: Zap, label: 'Scoring Inteligente', count: counts.scoring },
    { id: 'epicas', icon: Target, label: 'Épicas', count: null },
    { id: 'timeline', icon: Calendar, label: 'Timeline', count: null },
    { id: 'recursos', icon: Users, label: 'Recursos', count: counts.recursos },
    { id: 'resultadosmes', icon: TrendingUp, label: 'Resultados por Mes', count: counts.resultadosmes },
    { id: 'riesgos', icon: AlertTriangle, label: 'Riesgos', count: counts.riesgos },
    { id: 'finalizados', icon: CheckCircle, label: 'Finalizados', count: counts.finalizados }
  ];

  if (isLoading) {
    return <LoadingProgress progress={loadingProgress} message={loadingMessage} />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Sistema MULTIMONEY</h1>
            <div className="bg-white rounded-lg shadow-lg p-8">
              <AlertTriangle className="mx-auto h-16 w-16 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-red-800 mb-2">Error al cargar los datos</h3>
              <p className="text-red-600 mb-6">{error}</p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={loadDataFromURL}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Reintentar</span>
                </button>
                <div className="text-center">
                  <p className="text-gray-600 mb-4">O carga un archivo CSV manualmente:</p>
                  <div
                    className="bg-gray-50 border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-lg p-6 transition-colors"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                  >
                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                      className="hidden"
                      id="file-input-error"
                    />
                    <label
                      htmlFor="file-input-error"
                      className="inline-block bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors"
                    >
                      Seleccionar archivo
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Sistema MULTIMONEY</h1>
            <p className="text-xl text-gray-600">Dashboard de gestión de proyectos con análisis avanzado + Scoring Inteligente</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div
              className="bg-white rounded-lg shadow-lg p-8 border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <div className="text-center">
                <Upload className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Cargar archivo CSV</h3>
                <p className="text-gray-600 mb-4">Arrastra tu archivo aquí o haz clic para seleccionar</p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  className="hidden"
                  id="file-input"
                />
                <label
                  htmlFor="file-input"
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg cursor-pointer transition-colors"
                >
                  Seleccionar archivo
                </label>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="text-center">
                <Zap className="mx-auto h-16 w-16 text-indigo-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Scoring Inteligente</h3>
                <p className="text-gray-600 mb-4">Algoritmo de priorización multifactor incluido</p>
                <button
                  onClick={loadDataFromURL}
                  className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  Cargar Datos Automáticamente
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Refresh button */}
      <div className="fixed top-6 right-6 z-50">
        <button
          onClick={loadDataFromURL}
          className="group flex items-center space-x-2 px-4 py-2 bg-white hover:bg-blue-50 text-blue-600 hover:text-blue-700 rounded-lg shadow-lg border border-blue-200 hover:border-blue-300 transition-all duration-200 font-medium"
          title="Recargar datos automáticamente desde GitHub"
        >
          <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
          <span>Recargar</span>
        </button>
      </div>

      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg border-r border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800">MULTIMONEY</h1>
          <p className="text-sm text-gray-600">Sistema de Gestión + IA</p>
        </div>
        
        <nav className="p-4">
          <ul className="space-y-2">
            {sidebarItems.map(item => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveModule(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-all ${
                    activeModule === item.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {item.count !== null && (
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      activeModule === item.id ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {item.count}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 capitalize">
                {activeModule === 'scoring' ? 'Scoring Inteligente' : activeModule === 'ml-insights' ? 'ML Insights' : activeModule}
              </h2>
              <p className="text-gray-600">
                {activeModule === 'scoring' ? 
                  `${counts.scoring} proyectos elegibles para scoring` :
                  activeModule === 'ml-insights' ?
                  `Análisis predictivo de ${filteredData.length} elementos` :
                  `${filteredData.length} elementos`}
              </p>
            </div>
            
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
              <select
                value={filters.country}
                onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-[140px]"
              >
                <option value="">Todos los países</option>
                {filterOptions.countries.map(country => (
                  <option key={country} value={country}>{countryNames[country]}</option>
                ))}
              </select>

              <select
                value={filters.soloFinalizados}
                onChange={(e) => setFilters(prev => ({ ...prev, soloFinalizados: e.target.value }))}
                className={`px-4 py-2 border-2 rounded-lg text-sm min-w-[180px] font-medium transition-all ${
                  filters.soloFinalizados 
                    ? 'border-blue-400 bg-blue-50 text-blue-700' 
                    : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                }`}
              >
                <option value="">Todos los estados</option>
                <option value="finalizados">Solo Finalizados</option>
                <option value="activos">Solo Activos (En Proceso, Aprobación, Diseño, Priorizar, Backlog)</option>
              </select>

              <select
                value={filters.epic}
                onChange={(e) => setFilters(prev => ({ ...prev, epic: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-[120px]"
              >
                <option value="">Todas las épicas</option>
                {filterOptions.epics.map(epic => (
                  <option key={epic} value={epic}>{epic}</option>
                ))}
              </select>

              <select
                value={filters.area}
                onChange={(e) => setFilters(prev => ({ ...prev, area: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-[120px]"
              >
                <option value="">Todas las áreas</option>
                {filterOptions.areas.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>

              <button
                onClick={exportCSV}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Exportar</span>
              </button>
            </div>
          </div>

          {/* Active filters display */}
          {(filters.country || filters.epic || filters.area || filters.soloFinalizados || filters.finalizadosDesde) && (
            <div className="flex flex-wrap gap-2 mt-4">
              {filters.country && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  País: {countryNames[filters.country]}
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, country: '' }))}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.epic && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Épica: {filters.epic.substring(0, 20)}...
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, epic: '' }))}
                    className="ml-1 text-purple-600 hover:text-purple-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.area && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  Área: {filters.area}
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, area: '' }))}
                    className="ml-1 text-orange-600 hover:text-orange-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.soloFinalizados && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Estado: {
                    filters.soloFinalizados === 'finalizados' ? 'Solo Finalizados' :
                    filters.soloFinalizados === 'activos' ? 'Solo Activos' :
                    filters.soloFinalizados
                  }
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, soloFinalizados: '' }))}
                    className="ml-1 text-green-600 hover:text-green-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Module content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeModule === 'dashboard' && <DashboardModule data={filteredData} />}
          {activeModule === 'ml-insights' && <MLInsightsModule data={filteredData} />}
          {activeModule === 'scoring' && <ScoringModule data={filteredData} />}
          {activeModule === 'epicas' && <EpicasModule data={filteredData} />}
          {activeModule === 'timeline' && <TimelineModule data={filteredData} timelineFilter={filters.timelineDesde} />}
          {activeModule === 'recursos' && <RecursosModule data={filteredData} />}
          {activeModule === 'resultadosmes' && <ResultadosPorMesModule data={filteredData} />}
          {activeModule === 'riesgos' && <RiesgosModule data={filteredData} />}
          {activeModule === 'finalizados' && <FinalizadosModule data={filteredData} />}
        </div>
      </div>
    </div>
  );
};

export default MultimoneySystem;
