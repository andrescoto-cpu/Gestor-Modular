import React, { useState, useMemo, useCallback } from 'react';
import { Upload, FileText, X, Download, RefreshCw, AlertTriangle, CheckCircle, Users, TrendingUp, Calendar, Target, BarChart3, Zap, Brain, ExternalLink, Filter } from 'lucide-react';
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

// Import utilities
import { STATE_CATEGORIES, COUNTRIES, CSV_SAMPLE_URL } from './utils/constants';
import { processRawCSVData, validateCSVData, normalizeFieldNames, identifyRealAreas, isValidEpic } from './utils/dataProcessing';

// Loading Progress Component
const LoadingProgress = ({ progress, message }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Procesando datos</h3>
        <p className="text-gray-600 mb-4">{message}</p>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-gray-500">{progress}%</p>
      </div>
    </div>
  </div>
);

// File Upload Zone Component
const FileUploadZone = ({ onFileUpload, onLoadSample, isLoading }) => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
    <div className="max-w-2xl w-full">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">MULTIMONEY</h1>
        <p className="text-xl text-gray-600">Sistema de Gestión de Proyectos + BI</p>
      </div>
      
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
          Cargar Datos del Sistema
        </h2>
        
        {/* Drag & Drop Zone */}
        <div 
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 mb-6"
          onDrop={(e) => {
            e.preventDefault();
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) onFileUpload(files[0]);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragEnter={(e) => e.preventDefault()}
        >
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg text-gray-600 mb-2">
            Arrastra y suelta tu archivo CSV aquí
          </p>
          <p className="text-sm text-gray-500 mb-4">
            o haz clic para seleccionar un archivo
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => e.target.files[0] && onFileUpload(e.target.files[0])}
            className="hidden"
            id="csv-upload"
            disabled={isLoading}
          />
          <label
            htmlFor="csv-upload"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors disabled:opacity-50"
          >
            <FileText className="h-5 w-5 mr-2" />
            Seleccionar archivo CSV
          </label>
        </div>
        
        {/* Google Drive Sample */}
        <div className="text-center">
          <p className="text-gray-600 mb-4">¿No tienes un archivo CSV?</p>
          <button
            onClick={onLoadSample}
            disabled={isLoading}
            className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <ExternalLink className="h-5 w-5 mr-2" />
            Cargar datos de ejemplo desde Google Drive
          </button>
        </div>
      </div>
    </div>
  </div>
);

const MultimoneySystem = () => {
  // Estados principales
  const [processedData, setProcessedData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [activeModule, setActiveModule] = useState('dashboard');
  const [hasData, setHasData] = useState(false);
  const [error, setError] = useState(null);

  // Estados de filtros
  const [filters, setFilters] = useState({
    country: '',
    epic: '',
    area: '',
    soloFinalizados: '', // 'finalizados', 'activos', ''
    finalizadosDesde: null,
    timelineDesde: null
  });

  // Opciones de filtros
  const filterOptions = useMemo(() => {
    const countries = [...new Set(processedData.map(item => item.country).filter(c => COUNTRIES.includes(c)))];
    const areas = identifyRealAreas([...new Set(processedData.map(item => item.area).filter(Boolean))]);

    let epicsData = processedData;
    if (filters.area) epicsData = processedData.filter(item => item.area === filters.area);
    const epics = [...new Set(epicsData.map(item => item.epic).filter(isValidEpic))];

    return { countries, epics, areas };
  }, [processedData, filters.area]);

  // Datos filtrados
  const filteredData = useMemo(() => {
    let filtered = [...processedData];

    if (filters.country) filtered = filtered.filter(item => item.country === filters.country);
    if (filters.epic) filtered = filtered.filter(item => item.epic === filters.epic);
    if (filters.area) filtered = filtered.filter(item => item.area === filters.area);

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
        const finalDate = item.prodDate || item.uatEnd || item.endDate;
        return finalDate && finalDate >= filters.finalizadosDesde;
      });
    }

    if (filters.timelineDesde && activeModule === 'timeline') {
      filtered = filtered.filter(item => {
        const dates = [item.startDate, item.endDate, item.uatStart, item.uatEnd, item.prodDate, item.createdDate];
        return dates.some(date => date && date >= filters.timelineDesde);
      });
    }

    return filtered;
  }, [processedData, filters, activeModule]);

  // Conteos para sidebar
  const counts = useMemo(() => {
    const riesgos = filteredData.filter(item => {
      // IMPORTANTE: Excluir proyectos finalizados del análisis de riesgos
      if (STATE_CATEGORIES.finalizados.includes(item.state)) return false;
      
      const today = new Date();
      const hasDateRisk = item.endDate && item.endDate < today;
      const hasPriorityRisk = ['Highest', 'High'].includes(item.priority);
      
      return hasDateRisk || hasPriorityRisk;
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

    // Proyectos elegibles para scoring (activos)
    const scoringEligible = filteredData.filter(item => 
      !STATE_CATEGORIES.finalizados.includes(item.state) && 
      !STATE_CATEGORIES.cancelados.includes(item.state)
    );

    return {
      dashboard: filteredData.length,
      riesgos: riesgos.length,
      finalizados: finalizados.length,
      resultadosmes: resultadosUltimoMes.length,
      recursos: uniqueResources.size,
      scoring: scoringEligible.length
    };
  }, [filteredData]);

  // Simulación de carga paso a paso
  const simulateLoading = useCallback(async () => {
    const stages = [
      { progress: 5, message: 'Iniciando procesamiento...' },
      { progress: 15, message: 'Validando estructura CSV...' },
      { progress: 35, message: 'Normalizando nombres de campos...' },
      { progress: 55, message: 'Procesando fechas...' },
      { progress: 75, message: 'Categorizando estados...' },
      { progress: 90, message: 'Aplicando validaciones...' },
      { progress: 100, message: 'Finalizando...' }
    ];

    for (const stage of stages) {
      setLoadingProgress(stage.progress);
      setLoadingMessage(stage.message);
      await new Promise(resolve => setTimeout(resolve, 400));
    }
  }, []);

  // Carga de datos de ejemplo desde Google Drive
  const loadSampleData = useCallback(async () => {
    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingMessage('Conectando con Google Drive...');
    setError(null);

    try {
      setLoadingProgress(10);
      setLoadingMessage('Descargando archivo de ejemplo...');
      
      const response = await fetch(CSV_SAMPLE_URL);
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

      const csvText = await response.text();
      await simulateLoading();

      Papa.parse(csvText, {
        header: true,
        dynamicTyping: false, // Mantener como strings para mejor control
        skipEmptyLines: true,
        complete: (results) => {
          try {
            if (!validateCSVData(results.data)) {
              throw new Error('Formato de CSV inválido');
            }

            const normalizedData = normalizeFieldNames(results.data);
            const processed = processRawCSVData(normalizedData);
            
            setProcessedData(processed);
            setHasData(true);
            setIsLoading(false);
            setLoadingMessage('');
          } catch (error) {
            console.error('Error processing CSV:', error);
            setError(`Error al procesar los datos: ${error.message}`);
            setIsLoading(false);
          }
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          setError('Error al analizar el archivo CSV');
          setIsLoading(false);
        }
      });
    } catch (error) {
      console.error('Error loading sample data:', error);
      setError(`Error al cargar datos de ejemplo: ${error.message}`);
      setIsLoading(false);
    }
  }, [simulateLoading]);

  // Subida manual de archivo CSV
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
        dynamicTyping: false,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            if (!validateCSVData(results.data)) {
              throw new Error('Formato de CSV inválido');
            }

            const normalizedData = normalizeFieldNames(results.data);
            const processed = processRawCSVData(normalizedData);
            
            setProcessedData(processed);
            setHasData(true);
            setIsLoading(false);
          } catch (error) {
            console.error('Error processing CSV:', error);
            setError(`Error al procesar el archivo: ${error.message}`);
            setIsLoading(false);
          }
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          setError('Error al analizar el archivo CSV');
          setIsLoading(false);
        }
      });
    } catch (error) {
      console.error('Error:', error);
      setError('Error al procesar el archivo');
      setIsLoading(false);
    }
  }, [simulateLoading]);

  // Exportar CSV filtrado
  const exportFilteredCSV = useCallback(() => {
    if (filteredData.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const exportData = filteredData.map(item => ({
      'Clave': item.key,
      'Resumen': item.summary,
      'Estado': item.state,
      'País': item.country,
      'Épica': item.epic,
      'Área': item.area,
      'Persona Asignada': item.assignee,
      'Responsable Dev': item.devResponsible,
      'Prioridad': item.priority,
      'Fecha Inicio': item.startDate ? item.startDate.toISOString().split('T')[0] : '',
      'Fecha Fin': item.endDate ? item.endDate.toISOString().split('T')[0] : '',
      'UAT Inicio': item.uatStart ? item.uatStart.toISOString().split('T')[0] : '',
      'UAT Fin': item.uatEnd ? item.uatEnd.toISOString().split('T')[0] : '',
      'Prod Date': item.prodDate ? item.prodDate.toISOString().split('T')[0] : ''
    }));

    const csvContent = Papa.unparse(exportData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `multimoney-filtrado-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }, [filteredData]);

  // Limpiar filtros
  const clearFilters = useCallback(() => {
    setFilters({
      country: '',
      epic: '',
      area: '',
      soloFinalizados: '',
      finalizadosDesde: null,
      timelineDesde: null
    });
  }, []);

  // Configuración del sidebar
  const sidebarItems = [
    { id: 'dashboard', icon: BarChart3, label: 'Dashboard', count: counts.dashboard },
    { id: 'scoring', icon: Zap, label: 'Scoring/Priorización', count: counts.scoring },
    { id: 'epicas', icon: Target, label: 'Épicas', count: null },
    { id: 'timeline', icon: Calendar, label: 'Timeline', count: null },
    { id: 'recursos', icon: Users, label: 'Recursos', count: counts.recursos },
    { id: 'resultadosmes', icon: TrendingUp, label: 'Resultados por Mes', count: counts.resultadosmes },
    { id: 'riesgos', icon: AlertTriangle, label: 'Riesgos', count: counts.riesgos },
    { id: 'finalizados', icon: CheckCircle, label: 'Finalizados', count: counts.finalizados }
  ];

  // Estados de carga y error
  if (isLoading) {
    return <LoadingProgress progress={loadingProgress} message={loadingMessage} />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4 p-6 bg-white rounded-lg shadow-lg">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Error</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setHasData(false);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <FileUploadZone
        onFileUpload={handleFileUpload}
        onLoadSample={loadSampleData}
        isLoading={isLoading}
      />
    );
  }

  // Interfaz principal
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg border-r border-gray-200 flex-shrink-0">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800">MULTIMONEY</h1>
          <p className="text-sm text-gray-600">Sistema de Gestión + BI</p>
          <div className="mt-3">
            <p className="text-xs text-gray-500">
              {processedData.length} registros totales
            </p>
            <p className="text-xs text-gray-500">
              {filteredData.length} registros filtrados
            </p>
          </div>
        </div>

        {/* Navegación */}
        <nav className="p-4">
          <ul className="space-y-2">
            {sidebarItems.map(item => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveModule(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-all ${
                    activeModule === item.id 
                      ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                  {item.count !== null && (
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      activeModule === item.id 
                        ? 'bg-blue-200 text-blue-800' 
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      {item.count}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Acciones rápidas */}
        <div className="p-4 border-t border-gray-200 mt-auto">
          <button
            onClick={exportFilteredCSV}
            className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header con filtros */}
        <div className="bg-white shadow-sm border-b border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800 capitalize">
              {sidebarItems.find(item => item.id === activeModule)?.label}
            </h2>
            
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-500" />
              <span className="text-sm text-gray-600">Filtros activos:</span>
              {Object.values(filters).some(f => f) && (
                <button
                  onClick={clearFilters}
                  className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full hover:bg-red-200 transition-colors"
                >
                  Limpiar todo ✕
                </button>
              )}
            </div>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* País */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">País/Región</label>
              <div className="relative">
                <select
                  value={filters.country}
                  onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todos los países</option>
                  {filterOptions.countries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
                {filters.country && (
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, country: '' }))}
                    className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Área */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Área</label>
              <div className="relative">
                <select
                  value={filters.area}
                  onChange={(e) => setFilters(prev => ({ ...prev, area: e.target.value, epic: '' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todas las áreas</option>
                  {filterOptions.areas.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
                {filters.area && (
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, area: '', epic: '' }))}
                    className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Épica */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Épica</label>
              <div className="relative">
                <select
                  value={filters.epic}
                  onChange={(e) => setFilters(prev => ({ ...prev, epic: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todas las épicas</option>
                  {filterOptions.epics.map(epic => (
                    <option key={epic} value={epic}>{epic}</option>
                  ))}
                </select>
                {filters.epic && (
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, epic: '' }))}
                    className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <div className="relative">
                <select
                  value={filters.soloFinalizados}
                  onChange={(e) => setFilters(prev => ({ ...prev, soloFinalizados: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todos los estados</option>
                  <option value="activos">Solo activos</option>
                  <option value="finalizados">Solo finalizados</option>
                </select>
                {filters.soloFinalizados && (
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, soloFinalizados: '' }))}
                    className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Finalizados desde */}
            {(activeModule === 'finalizados' || activeModule === 'resultadosmes') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Finalizados desde</label>
                <div className="relative">
                  <input
                    type="date"
                    value={filters.finalizadosDesde ? filters.finalizadosDesde.toISOString().split('T')[0] : ''}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      finalizadosDesde: e.target.value ? new Date(e.target.value) : null 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {filters.finalizadosDesde && (
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, finalizadosDesde: null }))}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Timeline desde */}
            {activeModule === 'timeline' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timeline desde</label>
                <div className="relative">
                  <input
                    type="date"
                    value={filters.timelineDesde ? filters.timelineDesde.toISOString().split('T')[0] : ''}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      timelineDesde: e.target.value ? new Date(e.target.value) : null 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {filters.timelineDesde && (
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, timelineDesde: null }))}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contenido del módulo */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeModule === 'dashboard' && <DashboardModule data={filteredData} />}
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
