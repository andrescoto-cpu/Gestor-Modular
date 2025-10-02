import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Upload, FileText, Filter, X, Download, ArrowLeft, AlertTriangle, CheckCircle, Clock, Users, TrendingUp, Calendar, Target, BarChart3, RefreshCw, Activity, UserCheck, Zap, Info, Settings, Brain, AlertCircle, Lightbulb } from 'lucide-react';
import Papa from 'papaparse';

// ===============================
// CONSTANTES DEL SISTEMA
// ===============================

const STATE_CATEGORIES = {
  'finalizados': ['DONE', 'Pase Produccion', 'Completado', 'Finalizada', 'Completada'],
  'enProceso': ['ANALISIS', 'DEV', 'UAT', 'En curso', 'En pausa', 'En planificacion-analisis', 'En implementación', 'En Planificación'], 
  'enAprobacion': ['Aprobacion Diseño Negocio', 'APROBACION DISEÑO TECNICO'],
  'enDiseno': ['SOLUTIONS'],
  'aPriorizar': ['PRIORIZAR', 'Prioridad 1', 'Planificación', 'Planning-Interno', 'backlog', 'Por Analizar'],
  'bocaBacklog': ['Highest', 'Por analizar', 'Priorizado', 'Analizada - Por implementar'],
  'cancelados': ['Cancelada', 'Analizada - Descartada', 'Duplicada']
};

const VALID_COUNTRIES = ['GT', 'RG', 'CR', 'SV', 'MX', 'AK', 'PX'];

const CSV_URL = 'https://raw.githubusercontent.com/andrescoto-cpu/metadata/main/scripts/METADATA%20BM.csv';

const stateColors = {
  'DONE': '#10B981',
  'Pase Produccion': '#059669',
  'Completado': '#34D399',
  'ANALISIS': '#3B82F6',
  'DEV': '#1D4ED8',
  'UAT': '#60A5FA',
  'SOLUTIONS': '#8B5CF6',
  'PRIORIZAR': '#F59E0B',
  'Highest': '#EF4444',
  'default': '#6B7280'
};

const countryNames = {
  'GT': 'Guatemala',
  'RG': 'Regional',
  'CR': 'Costa Rica', 
  'SV': 'El Salvador',
  'MX': 'México',
  'AK': 'Akros',
  'PX': 'PEX'
};

// CONFIGURACIÓN DE SCORING
const SCORING_CONFIG = {
  weights: {
    business: 0.40,
    technology: 0.25, 
    sizing: 0.20,
    state: 0.15
  },
  businessValues: {
    '1. Riesgo/Regulatorio': 100,
    '2. Aumento de ingresos': 80,
    '3. Mejora de servicio (percibido por cliente)': 60,
    '4. Reducción de gasto': 40,
    '5. Mejora tecnológica': 20
  },
  technologyValues: {
    '1. Regulatorio': 100,
    '4. Ciberseguridad': 90,
    '2. Nuevo Feature': 60,
    '5. Soporte Nivel 2 (Escalación de soporte a Desarrollo)': 40,
    '3. Refactor': 20
  },
  sizingValues: {
    'XS': 100,
    'S': 80,   
    'M': 60,   
    'L': 30,   
    'XL': 10   
  },
  stateValues: {
    'PRIORIZAR': 100,
    'ANALISIS': 90,
    'APROBACION DISEÑO TECNICO': 70,
    'SOLUTIONS': 60,
    'DEV': 50,
    'UAT': 40,
    'Pase Produccion': 20
  }
};

const SCORING_STATE_CATEGORIES = {
  target: {
    process: ['DEV', 'UAT', 'Pase Produccion'],
    approval: ['APROBACION DISEÑO TECNICO', 'Aprobacion Diseño Negocio'],
    priority: ['PRIORIZAR', 'Highest', 'Prioridad 1']
  },
  excluded: {
    backlog: ['ANALISIS', 'Planificación', 'Planning-Interno', 'Ingreso'],
    design: ['SOLUTIONS'],
    finalized: ['DONE', 'Completado']
  }
};

// UTILIDADES DE SCORING
const ScoringUtils = {
  calculateIntelligentScore: (item, config = SCORING_CONFIG) => {
    if (!item) return 0;
    
    let score = 0;
    
    const businessScore = config.businessValues[item['Valoración prioridad Negocio']] || 0;
    score += businessScore * config.weights.business;
    
    const techScore = config.technologyValues[item['Valoración Prioridad Tecnología']] || 0;
    score += techScore * config.weights.technology;
    
    const sizingScore = config.sizingValues[item.Sizing] || 0;
    score += sizingScore * config.weights.sizing;
    
    const stateScore = config.stateValues[item.Estado] || 0;
    score += stateScore * config.weights.state;
    
    return Math.round(score);
  },

  filterProjectsByCategory: (data, categories = SCORING_STATE_CATEGORIES) => {
    const targetStates = [
      ...categories.target.process,
      ...categories.target.approval, 
      ...categories.target.priority
    ];
    
    return data.filter(item => 
      item && item.state && targetStates.includes(item.state)
    );
  },

  getProjectStats: (data, categories = SCORING_STATE_CATEGORIES) => {
    const total = data.length;
    const targetStates = [
      ...categories.target.process,
      ...categories.target.approval,
      ...categories.target.priority
    ];
    
    const processApprovalCount = data.filter(item => 
      item && item.state && targetStates.includes(item.state)
    ).length;
    
    const backlogDesignCount = data.filter(item => 
      item && item.state && [
        ...categories.excluded.backlog,
        ...categories.excluded.design
      ].includes(item.state)
    ).length;
    
    const finalizedCount = data.filter(item => 
      item && item.state && categories.excluded.finalized.includes(item.state)
    ).length;
    
    return {
      total,
      processApproval: processApprovalCount,
      backlogDesign: backlogDesignCount,
      finalized: finalizedCount
    };
  }
};

// ===============================
// UTILIDADES
// ===============================

const parseDate = (dateStr) => {
  if (!dateStr || dateStr === 'null' || dateStr === '#N/A' || dateStr === '') return null;
  
  const cleanStr = String(dateStr).trim();
  if (!cleanStr) return null;
  
  const ddmmyyyy = cleanStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (date.getFullYear() >= 2020 && date.getFullYear() <= 2030) {
      return date;
    }
  }
  
  const standardDate = new Date(cleanStr);
  if (!isNaN(standardDate.getTime()) && standardDate.getFullYear() >= 2020) {
    return standardDate;
  }
  
  return null;
};

const isValidEpic = (epic) => {
  if (!epic || epic === 'Sin épica' || epic === '#N/A' || epic === 'N/A' || epic === 'null') return false;
  if (typeof epic !== 'string') return false;
  if (epic.length < 3) return false;
  if (/^\d+$/.test(epic)) return false;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(epic)) return false;
  return true;
};

const identifyRealAreas = (areas) => {
  return areas.filter(area => {
    if (!area || typeof area !== 'string') return false;
    if (area === '#N/A') return false;
    return true;
  });
};

const formatDateForInput = (date) => {
  if (!date) return '';
  return date.toISOString().split('T')[0];
};

// ===============================
// COMPONENTES
// ===============================

// Componente de carga con progreso
const LoadingProgress = ({ progress, message }) => {
  const stages = [
    { percent: 5, message: "Conectando con el servidor..." },
    { percent: 15, message: "Descargando datos..." },
    { percent: 35, message: "Analizando estructura..." },
    { percent: 55, message: "Procesando registros..." },
    { percent: 80, message: "Calculando métricas..." },
    { percent: 95, message: "Finalizando dashboard..." },
    { percent: 100, message: "Completado!" }
  ];
  
  const currentStage = stages.find(s => s.percent >= progress) || stages[stages.length - 1];
  const displayMessage = message || currentStage.message;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="#E5E7EB"
                strokeWidth="6"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="#3B82F6"
                strokeWidth="6"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-gray-800">{Math.round(progress)}%</span>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Cargando datos</h3>
          <p className="text-gray-600">{displayMessage}</p>
        </div>
      </div>
    </div>
  );
};

// Componente para enlace a Jira
const JiraLink = ({ ticketKey, className = "", children }) => {
  if (!ticketKey) {
    return <span className={className}>{children || 'Sin clave'}</span>;
  }
  
  return (
    <a 
      href={`https://akros.atlassian.net/browse/${ticketKey}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-blue-600 hover:text-blue-800 hover:underline transition-colors ${className}`}
      title={`Abrir ${ticketKey} en Jira`}
    >
      {children || ticketKey}
    </a>
  );
};

// Componente para visualizar tickets
const TicketViewer = ({ 
  tickets, 
  title, 
  showDateField, 
  dateFieldLabel = 'Fecha', 
  emptyMessage = 'No hay elementos para mostrar',
  borderColor = 'border-gray-500',
  bgColor = 'bg-gray-50'
}) => {
  if (!tickets || tickets.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
      {tickets.map((item, index) => (
        <div key={index} className={`${bgColor} rounded-lg p-3 border-l-4 ${borderColor}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <p className="text-xs font-medium text-gray-600">Clave</p>
              <JiraLink ticketKey={item.key} className="font-semibold text-sm" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600">Estado</p>
              <p className="font-semibold text-sm" style={{color: stateColors[item.state] || stateColors.default}}>
                {item.state}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600">País</p>
              <p className="font-semibold text-sm">{countryNames[item.country] || item.country}</p>
            </div>
            {showDateField && item[showDateField] && (
              <div>
                <p className="text-xs font-medium text-gray-600">{dateFieldLabel}</p>
                <p className="font-semibold text-green-600 text-sm">
                  {item[showDateField].toLocaleDateString('es-ES')}
                </p>
              </div>
            )}
            {item.assignee && (
              <div>
                <p className="text-xs font-medium text-gray-600">Asignado</p>
                <p className="font-semibold text-sm text-blue-600">{item.assignee}</p>
              </div>
            )}
            {item.priority && ['Highest', 'High'].includes(item.priority) && (
              <div>
                <p className="text-xs font-medium text-gray-600">Prioridad</p>
                <p className="font-semibold text-sm text-red-600">{item.priority}</p>
              </div>
            )}
            <div className="md:col-span-3">
              <p className="text-xs font-medium text-gray-600">Resumen</p>
              <p className="text-gray-800 text-xs leading-relaxed">{item.summary || 'Sin resumen disponible'}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Módulo Dashboard
const DashboardModule = ({ data }) => {
  const metrics = useMemo(() => {
    const total = data.length;
    const completados = data.filter(item => STATE_CATEGORIES.finalizados.includes(item.state)).length;
    const enProceso = data.filter(item => STATE_CATEGORIES.enProceso.includes(item.state)).length;
    const enAprobacion = data.filter(item => STATE_CATEGORIES.enAprobacion.includes(item.state)).length;
    const enDiseno = data.filter(item => STATE_CATEGORIES.enDiseno.includes(item.state)).length;
    const aPriorizar = data.filter(item => STATE_CATEGORIES.aPriorizar.includes(item.state)).length;
    const bocaBacklog = data.filter(item => STATE_CATEGORIES.bocaBacklog.includes(item.state)).length;
    const cancelados = data.filter(item => STATE_CATEGORIES.cancelados.includes(item.state)).length;
    
    const allCategorizedStates = Object.values(STATE_CATEGORIES).flat();
    const sinCategorizar = data.filter(item => !allCategorizedStates.includes(item.state));
    const otros = sinCategorizar.length;

    return { 
      total, 
      completados, 
      enProceso, 
      enAprobacion, 
      enDiseno,
      aPriorizar,
      bocaBacklog,
      cancelados,
      otros
    };
  }, [data]);

  const regionalMatrix = useMemo(() => {
    const allCategorizedStates = Object.values(STATE_CATEGORIES).flat();
    
    return VALID_COUNTRIES.map(country => {
      const countryData = data.filter(item => item.country === country);
      const total = countryData.length;
      const completados = countryData.filter(item => STATE_CATEGORIES.finalizados.includes(item.state)).length;
      const enProceso = countryData.filter(item => STATE_CATEGORIES.enProceso.includes(item.state)).length;
      const enAprobacion = countryData.filter(item => STATE_CATEGORIES.enAprobacion.includes(item.state)).length;
      const enDiseno = countryData.filter(item => STATE_CATEGORIES.enDiseno.includes(item.state)).length;
      const aPriorizar = countryData.filter(item => STATE_CATEGORIES.aPriorizar.includes(item.state)).length;
      const bocaBacklog = countryData.filter(item => STATE_CATEGORIES.bocaBacklog.includes(item.state)).length;
      const cancelados = countryData.filter(item => STATE_CATEGORIES.cancelados.includes(item.state)).length;
      const otros = countryData.filter(item => !allCategorizedStates.includes(item.state)).length;
      const porcentaje = total > 0 ? Math.round((completados / total) * 100) : 0;

      return {
        country,
        name: countryNames[country],
        total,
        completados,
        enProceso,
        enAprobacion,
        enDiseno,
        aPriorizar,
        bocaBacklog,
        cancelados,
        otros,
        porcentaje
      };
    });
  }, [data]);

  const statesChart = useMemo(() => {
    const groupCount = {
      'Finalizados': 0,
      'En Proceso': 0,
      'Aprobación': 0,
      'Diseño': 0,
      'A Priorizar': 0,
      'Boca Backlog': 0,
      'Cancelados': 0,
      'Otros': 0
    };

    const groupColors = {
      'Finalizados': '#10B981',
      'En Proceso': '#3B82F6', 
      'Aprobación': '#8B5CF6',
      'Diseño': '#EC4899',
      'A Priorizar': '#F59E0B',
      'Boca Backlog': '#F97316',
      'Cancelados': '#EF4444',
      'Otros': '#6B7280'
    };

    data.forEach(item => {
      if (STATE_CATEGORIES.finalizados.includes(item.state)) {
        groupCount['Finalizados']++;
      } else if (STATE_CATEGORIES.enProceso.includes(item.state)) {
        groupCount['En Proceso']++;
      } else if (STATE_CATEGORIES.enAprobacion.includes(item.state)) {
        groupCount['Aprobación']++;
      } else if (STATE_CATEGORIES.enDiseno.includes(item.state)) {
        groupCount['Diseño']++;
      } else if (STATE_CATEGORIES.aPriorizar.includes(item.state)) {
        groupCount['A Priorizar']++;
      } else if (STATE_CATEGORIES.bocaBacklog.includes(item.state)) {
        groupCount['Boca Backlog']++;
      } else if (STATE_CATEGORIES.cancelados.includes(item.state)) {
        groupCount['Cancelados']++;
      } else {
        groupCount['Otros']++;
      }
    });

    return Object.entries(groupCount)
      .filter(([, count]) => count > 0)
      .map(([group, count]) => ({
        name: group,
        value: count,
        color: groupColors[group]
      }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const epicsChart = useMemo(() => {
    const epicCount = {};
    data.forEach(item => {
      if (isValidEpic(item.epic)) {
        if (!epicCount[item.epic]) {
          epicCount[item.epic] = {
            name: item.epic,
            total: 0,
            finalizados: 0,
            enProceso: 0,
            otros: 0,
            completionRate: 0
          };
        }
        
        epicCount[item.epic].total++;
        
        if (STATE_CATEGORIES.finalizados.includes(item.state)) {
          epicCount[item.epic].finalizados++;
        } else if (STATE_CATEGORIES.enProceso.includes(item.state)) {
          epicCount[item.epic].enProceso++;
        } else {
          epicCount[item.epic].otros++;
        }
      }
    });

    Object.values(epicCount).forEach(epic => {
      epic.completionRate = epic.total > 0 ? Math.round((epic.finalizados / epic.total) * 100) : 0;
    });

    return Object.values(epicCount)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [data]);

  return (
    <div className="space-y-6">
      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-600">Total</p>
              <p className="text-xl font-bold text-blue-800">{metrics.total}</p>
            </div>
            <BarChart3 className="h-6 w-6 text-blue-500" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-green-600">Completados</p>
              <p className="text-xl font-bold text-green-800">{metrics.completados}</p>
            </div>
            <CheckCircle className="h-6 w-6 text-green-500" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-3 border-l-4 border-indigo-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-indigo-600">En Proceso</p>
              <p className="text-xl font-bold text-indigo-800">{metrics.enProceso}</p>
            </div>
            <Clock className="h-6 w-6 text-indigo-500" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-purple-600">Aprobación</p>
              <p className="text-xl font-bold text-purple-800">{metrics.enAprobacion}</p>
            </div>
            <Users className="h-6 w-6 text-purple-500" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg p-3 border-l-4 border-pink-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-pink-600">Diseño</p>
              <p className="text-xl font-bold text-pink-800">{metrics.enDiseno}</p>
            </div>
            <Target className="h-6 w-6 text-pink-500" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-3 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-yellow-600">A Priorizar</p>
              <p className="text-xl font-bold text-yellow-800">{metrics.aPriorizar}</p>
            </div>
            <TrendingUp className="h-6 w-6 text-yellow-500" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-orange-600">Boca Backlog</p>
              <p className="text-xl font-bold text-orange-800">{metrics.bocaBacklog}</p>
            </div>
            <AlertTriangle className="h-6 w-6 text-orange-500" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 border-l-4 border-gray-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Otros</p>
              <p className="text-xl font-bold text-gray-800">{metrics.otros}</p>
            </div>
            <FileText className="h-6 w-6 text-gray-500" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-3 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-red-600">Cancelados</p>
              <p className="text-xl font-bold text-red-800">{metrics.cancelados}</p>
            </div>
            <X className="h-6 w-6 text-red-500" />
          </div>
        </div>
      </div>

      {/* Matriz Regional */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Matriz Regional</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">País</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Total</th>
                <th className="text-center py-3 px-4 font-semibold text-green-700">Finalizados</th>
                <th className="text-center py-3 px-4 font-semibold text-blue-700">En Proceso</th>
                <th className="text-center py-3 px-4 font-semibold text-purple-700">Aprobación</th>
                <th className="text-center py-3 px-4 font-semibold text-pink-700">Diseño</th>
                <th className="text-center py-3 px-4 font-semibold text-yellow-700">A Priorizar</th>
                <th className="text-center py-3 px-4 font-semibold text-orange-700">Boca Backlog</th>
                <th className="text-center py-3 px-4 font-semibold text-red-700">Cancelados</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Otros</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">% Completado</th>
              </tr>
            </thead>
            <tbody>
              {regionalMatrix.map(row => (
                <tr key={row.country} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-800">{row.name}</td>
                  <td className="text-center py-3 px-4 font-semibold text-gray-800">{row.total}</td>
                  <td className="text-center py-3 px-4 text-green-600 font-semibold">{row.completados}</td>
                  <td className="text-center py-3 px-4 text-blue-600 font-semibold">{row.enProceso}</td>
                  <td className="text-center py-3 px-4 text-purple-600 font-semibold">{row.enAprobacion}</td>
                  <td className="text-center py-3 px-4 text-pink-600 font-semibold">{row.enDiseno}</td>
                  <td className="text-center py-3 px-4 text-yellow-600 font-semibold">{row.aPriorizar}</td>
                  <td className="text-center py-3 px-4 text-orange-600 font-semibold">{row.bocaBacklog}</td>
                  <td className="text-center py-3 px-4 text-red-600 font-semibold">{row.cancelados}</td>
                  <td className="text-center py-3 px-4 text-gray-600 font-semibold">{row.otros}</td>
                  <td className="text-center py-3 px-4">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full">
                        <div 
                          className="h-2 bg-green-500 rounded-full transition-all duration-300"
                          style={{ width: `${row.porcentaje}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold">{row.porcentaje}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Distribución por Estados</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statesChart}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
              >
                {statesChart.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top 10 Épicas - Análisis Detallado</h3>
          <div className="space-y-4">
            {epicsChart.map((epic, index) => (
              <div key={epic.name} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800 text-sm truncate" title={epic.name}>
                      #{index + 1}. {epic.name}
                    </h4>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                      <span>{epic.total} tickets total</span>
                      <span className="text-green-600">{epic.finalizados} finalizados</span>
                      <span className="text-blue-600">{epic.enProceso} en proceso</span>
                      {epic.otros > 0 && <span className="text-gray-500">{epic.otros} otros</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-800">{epic.completionRate}%</div>
                    <div className="text-xs text-gray-500">completado</div>
                  </div>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-6 relative overflow-hidden">
                  <div 
                    className="absolute left-0 top-0 h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${(epic.finalizados / epic.total) * 100}%` }}
                  ></div>
                  <div 
                    className="absolute top-0 h-full bg-blue-500 transition-all duration-300"
                    style={{ 
                      left: `${(epic.finalizados / epic.total) * 100}%`,
                      width: `${(epic.enProceso / epic.total) * 100}%`
                    }}
                  ></div>
                  {epic.otros > 0 && (
                    <div 
                      className="absolute top-0 h-full bg-gray-400 transition-all duration-300"
                      style={{ 
                        left: `${((epic.finalizados + epic.enProceso) / epic.total) * 100}%`,
                        width: `${(epic.otros / epic.total) * 100}%`
                      }}
                    ></div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white text-sm font-semibold drop-shadow-lg">
                      {epic.finalizados}/{epic.total}
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-center gap-6 mt-2 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>Finalizados</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>En Proceso</span>
                  </div>
                  {epic.otros > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-gray-400 rounded"></div>
                      <span>Otros</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Módulo de Épicas
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
          epic: item.epic,
          total: 0,
          finalizados: 0,
          enProceso: 0,
          enAprobacion: 0,
          enDiseno: 0,
          aPriorizar: 0,
          bocaBacklog: 0,
          cancelados: 0,
          otros: 0,
          healthScore: 0,
          items: []
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
    
    Object.values(epicStats).forEach(stats => {
      if (stats.total === 0) {
        stats.healthScore = 0;
        return;
      }
      
      const completadosPct = stats.finalizados / stats.total;
      const enProcesoPct = stats.enProceso / stats.total;
      const enAprobacionPct = stats.enAprobacion / stats.total;
      
      let healthScore = completadosPct * 60 + enProcesoPct * 25 + enAprobacionPct * 15;
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
      key: item.key,
      summary: item.summary,
      state: item.state,
      country: item.country,
      assignee: item.assignee,
      endDate: item.endDate
    }));

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">{selectedEpic.epic}</h2>
              <p className="text-sm text-gray-600">{drilldownCategory} ({categoryItems.length} elementos)</p>
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
            title={`${selectedEpic.epic} - ${drilldownCategory}`}
            emptyMessage={`No hay elementos en la categoría ${drilldownCategory}`}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-lg p-4">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Análisis por Épicas</h2>
        
        <div className="space-y-3 max-h-[70vh] overflow-y-auto">
          {epicsAnalysis.map((epic, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-800">{epic.epic}</h3>
                  <div className="flex items-center space-x-4 text-xs text-gray-600">
                    <span>{epic.total} proyectos</span>
                    <span>{epic.finalizados} completados ({Math.round((epic.finalizados/epic.total)*100)}%)</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 px-3 py-1 rounded-lg border-2 bg-blue-100 border-blue-300">
                  <span className="font-bold text-blue-800 text-sm">Progreso: {epic.healthScore}%</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
                <div 
                  className="bg-green-50 border border-green-200 rounded-lg p-2 text-center cursor-pointer hover:bg-green-100 transition-colors"
                  onClick={() => handleCategoryClick(epic, 'finalizados')}
                >
                  <div className="text-xs font-bold text-green-600">{epic.finalizados}</div>
                  <div className="text-xs font-medium text-green-700">Finalizados</div>
                </div>
                
                <div 
                  className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={() => handleCategoryClick(epic, 'enProceso')}
                >
                  <div className="text-xs font-bold text-blue-600">{epic.enProceso}</div>
                  <div className="text-xs font-medium text-blue-700">En Proceso</div>
                </div>
                
                <div 
                  className="bg-purple-50 border border-purple-200 rounded-lg p-2 text-center cursor-pointer hover:bg-purple-100 transition-colors"
                  onClick={() => handleCategoryClick(epic, 'enAprobacion')}
                >
                  <div className="text-xs font-bold text-purple-600">{epic.enAprobacion}</div>
                  <div className="text-xs font-medium text-purple-700">Aprobación</div>
                </div>
                
                <div 
                  className="bg-pink-50 border border-pink-200 rounded-lg p-2 text-center cursor-pointer hover:bg-pink-100 transition-colors"
                  onClick={() => handleCategoryClick(epic, 'enDiseno')}
                >
                  <div className="text-xs font-bold text-pink-600">{epic.enDiseno}</div>
                  <div className="text-xs font-medium text-pink-700">Diseño</div>
                </div>
                
                <div 
                  className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-center cursor-pointer hover:bg-yellow-100 transition-colors"
                  onClick={() => handleCategoryClick(epic, 'aPriorizar')}
                >
                  <div className="text-xs font-bold text-yellow-600">{epic.aPriorizar}</div>
                  <div className="text-xs font-medium text-yellow-700">A Priorizar</div>
                </div>
                
                <div 
                  className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-center cursor-pointer hover:bg-orange-100 transition-colors"
                  onClick={() => handleCategoryClick(epic, 'bocaBacklog')}
                >
                  <div className="text-xs font-bold text-orange-600">{epic.bocaBacklog}</div>
                  <div className="text-xs font-medium text-orange-700">Boca Backlog</div>
                </div>
                
                <div 
                  className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-center cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleCategoryClick(epic, 'otros')}
                >
                  <div className="text-xs font-bold text-gray-600">{epic.otros}</div>
                  <div className="text-xs font-medium text-gray-700">Otros</div>
                </div>
                
                <div 
                  className="bg-red-50 border border-red-200 rounded-lg p-2 text-center cursor-pointer hover:bg-red-100 transition-colors"
                  onClick={() => handleCategoryClick(epic, 'cancelados')}
                >
                  <div className="text-xs font-bold text-red-600">{epic.cancelados}</div>
                  <div className="text-xs font-medium text-red-700">Cancelados</div>
                </div>
              </div>
              
              <div className="mt-2 text-xs text-gray-500 text-right">
                Total verificado: {epic.finalizados + epic.enProceso + epic.enAprobacion + epic.enDiseno + epic.aPriorizar + epic.bocaBacklog + epic.cancelados + epic.otros} = {epic.total}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Módulo Timeline
const TimelineModule = ({ data, timelineFilter }) => {
  const [expandedEpics, setExpandedEpics] = useState(new Set());

  const dateRange = useMemo(() => {
    const today = new Date();
    
    if (timelineFilter) {
      const start = new Date(timelineFilter);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 9);
      return { start, end };
    } else {
      const start = new Date(today);
      const end = new Date(today);
      start.setMonth(start.getMonth() - 6);
      end.setMonth(end.getMonth() + 3);
      return { start, end };
    }
  }, [timelineFilter]);

  const epicTimeline = useMemo(() => {
    const epicData = {};
    
    data.forEach(item => {
      if (!isValidEpic(item.epic)) return;
      
      const itemDates = [
        item.startDate, 
        item.endDate, 
        item.uatStart, 
        item.uatEnd, 
        item.prodDate, 
        item.regulatoryDate
      ].filter(Boolean);
      
      if (itemDates.length === 0) return;
      
      if (!epicData[item.epic]) {
        epicData[item.epic] = {
          epic: item.epic,
          items: [],
          startDate: null,
          endDate: null,
          totalItems: 0,
          completedItems: 0
        };
      }
      
      epicData[item.epic].items.push(item);
      epicData[item.epic].totalItems++;
      
      if (STATE_CATEGORIES.finalizados.includes(item.state)) {
        epicData[item.epic].completedItems++;
      }
      
      const minItemDate = new Date(Math.min(...itemDates));
      const maxItemDate = new Date(Math.max(...itemDates));
      
      if (!epicData[item.epic].startDate || minItemDate < epicData[item.epic].startDate) {
        epicData[item.epic].startDate = minItemDate;
      }
      if (!epicData[item.epic].endDate || maxItemDate > epicData[item.epic].endDate) {
        epicData[item.epic].endDate = maxItemDate;
      }
    });
    
    return Object.values(epicData)
      .filter(epic => epic.startDate && epic.endDate)
      .sort((a, b) => a.startDate - b.startDate);
  }, [data, dateRange]);

  const monthsHeader = useMemo(() => {
    const months = [];
    const current = new Date(dateRange.start);
    
    while (current <= dateRange.end) {
      months.push({
        month: current.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
        date: new Date(current)
      });
      current.setMonth(current.getMonth() + 1);
    }
    
    return months;
  }, [dateRange]);

  const calculateBarPosition = (startDate, endDate) => {
    const totalDuration = dateRange.end - dateRange.start;
    const itemStart = startDate - dateRange.start;
    const itemDuration = endDate - startDate;
    
    const left = (itemStart / totalDuration) * 100;
    const width = (itemDuration / totalDuration) * 100;
    
    return { left: Math.max(0, left), width: Math.min(100 - left, Math.max(1, width)) };
  };

  const toggleEpic = (epicName) => {
    const newExpanded = new Set(expandedEpics);
    if (newExpanded.has(epicName)) {
      newExpanded.delete(epicName);
    } else {
      newExpanded.add(epicName);
    }
    setExpandedEpics(newExpanded);
  };

  const getPhaseColor = (phase) => {
    const colors = {
      'DEV': 'from-blue-400 to-blue-600',
      'UAT': 'from-purple-400 to-purple-600',
      'PROD': 'from-green-400 to-green-600',
      'REG': 'from-orange-400 to-orange-600'
    };
    return colors[phase] || 'from-gray-400 to-gray-600';
  };

  const renderTicketPhases = (ticket) => {
    const phases = [];
    
    if (ticket.startDate && ticket.endDate) {
      phases.push({
        name: 'DEV',
        start: ticket.startDate,
        end: ticket.endDate,
        color: 'DEV'
      });
    }
    
    if (ticket.uatStart && ticket.uatEnd) {
      phases.push({
        name: 'UAT',
        start: ticket.uatStart,
        end: ticket.uatEnd,
        color: 'UAT'
      });
    }
    
    if (ticket.prodDate) {
      phases.push({
        name: 'PROD',
        start: ticket.prodDate,
        end: ticket.prodDate,
        color: 'PROD'
      });
    }
    
    if (ticket.regulatoryDate) {
      phases.push({
        name: 'REG',
        start: ticket.regulatoryDate,
        end: ticket.regulatoryDate,
        color: 'REG'
      });
    }
    
    return phases;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Timeline - Épicas y Tickets</h2>
            <p className="text-sm text-gray-600 mt-1">
              Vista cronológica detallada con fases de desarrollo
            </p>
          </div>
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-2 bg-gradient-to-r from-blue-400 to-blue-600 rounded"></div>
              <span>DEV</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-2 bg-gradient-to-r from-purple-400 to-purple-600 rounded"></div>
              <span>UAT</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-2 bg-gradient-to-r from-green-400 to-green-600 rounded"></div>
              <span>PROD</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-2 bg-gradient-to-r from-orange-400 to-orange-600 rounded"></div>
              <span>REG</span>
            </div>
          </div>
        </div>

        <div className="mb-4 relative h-12 border-b border-gray-200">
          <div className="absolute left-80 right-0 top-0 h-full flex">
            {monthsHeader.map((month, index) => (
              <div
                key={index}
                className="flex-1 text-center text-sm font-semibold text-gray-700 border-r border-gray-100 py-2"
              >
                {month.month}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1 max-h-[70vh] overflow-y-auto">
          {epicTimeline.map((epic, epicIndex) => {
            const isExpanded = expandedEpics.has(epic.epic);
            const { left, width } = calculateBarPosition(epic.startDate, epic.endDate);
            
            return (
              <div key={epicIndex} className="border border-gray-200 rounded-lg">
                <div 
                  className="relative h-12 hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleEpic(epic.epic)}
                >
                  <div className="absolute left-0 top-0 h-full w-80 flex items-center px-4 text-sm font-medium text-gray-800 border-r border-gray-200 bg-white">
                    <div className="flex items-center space-x-2 w-full">
                      <span className="transform transition-transform duration-200" style={{transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'}}>
                        ▶
                      </span>
                      <div className="flex-1 truncate" title={epic.epic}>
                        <span className="font-semibold">{epic.epic}</span>
                        <span className="ml-2 text-xs text-gray-500">({epic.totalItems} tickets)</span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute left-80 top-0 h-full right-0">
                    <div 
                      className="relative h-8 mt-2 rounded-lg bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all duration-200"
                      style={{ left: `${left}%`, width: `${width}%` }}
                    >
                      <div className="absolute inset-0 flex items-center justify-between px-2 text-white text-xs font-semibold">
                        <span className="truncate">{epic.completedItems}/{epic.totalItems}</span>
                        <span>{Math.round((epic.completedItems / epic.totalItems) * 100)}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    {epic.items.map((ticket, ticketIndex) => {
                      const phases = renderTicketPhases(ticket);
                      if (phases.length === 0) return null;
                      
                      return (
                        <div key={ticketIndex} className="relative min-h-16 border-b border-gray-100 last:border-b-0 py-2">
                          <div className="absolute left-0 top-0 h-full w-80 flex flex-col justify-center px-8 text-xs text-gray-700 border-r border-gray-200">
                            <div className="flex items-center space-x-2 mb-1">
                              <JiraLink 
                                ticketKey={ticket.key} 
                                className="font-medium hover:text-blue-600"
                              >
                                {ticket.key}
                              </JiraLink>
                              <span className="text-xs px-2 py-1 rounded text-white" style={{backgroundColor: stateColors[ticket.state] || stateColors.default}}>
                                {ticket.state}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 leading-tight">
                              {ticket.summary || 'Sin resumen disponible'}
                            </div>
                          </div>
                          <div className="absolute left-80 top-0 h-full right-0">
                            {phases.map((phase, phaseIndex) => {
                              const { left: phaseLeft, width: phaseWidth } = calculateBarPosition(phase.start, phase.end);
                              const isPoint = phase.start.getTime() === phase.end.getTime();
                              
                              return (
                                <div 
                                  key={phaseIndex}
                                  className={`absolute h-6 mt-2 rounded transition-all duration-200 ${
                                    isPoint ? 'w-2' : ''
                                  } bg-gradient-to-r ${getPhaseColor(phase.color)}`}
                                  style={{ 
                                    left: `${phaseLeft}%`, 
                                    width: isPoint ? '8px' : `${phaseWidth}%`
                                  }}
                                  title={`${phase.name}: ${phase.start.toLocaleDateString('es-ES')} - ${phase.end.toLocaleDateString('es-ES')}`}
                                >
                                  <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium">
                                    {!isPoint && phaseWidth > 5 && phase.name}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 text-sm text-gray-600 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span>
              <span className="font-semibold">{epicTimeline.length}</span> épicas en el período
            </span>
            <span className="text-xs text-gray-500">
              Haz clic en una épica para ver sus tickets y fases detalladas
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Módulo de Finalizados
const FinalizadosModule = ({ data }) => {
  const finalizadosData = useMemo(() => {
    const finalizados = data.filter(item => STATE_CATEGORIES.finalizados.includes(item.state));
    
    const finalizadosConFecha = finalizados.map(item => {
      let finalDate = null;
      if (item.prodDate) finalDate = item.prodDate;
      else if (item.uatEnd) finalDate = item.uatEnd;
      else if (item.endDate) finalDate = item.endDate;
      else finalDate = new Date();
      
      return { 
        key: item.key,
        summary: item.summary,
        state: item.state,
        country: item.country,
        assignee: item.assignee,
        epic: item.epic,
        finalDate 
      };
    });
    
    const finalizadosOrdenados = finalizadosConFecha.sort((a, b) => {
      return new Date(b.finalDate) - new Date(a.finalDate);
    });
    
    return {
      finalizados: finalizadosOrdenados,
      totalCompletados: finalizadosConFecha.length
    };
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="bg-green-50 rounded-lg p-3 border-l-4 border-green-500">
        <div className="text-lg font-bold text-green-800">{finalizadosData.totalCompletados}</div>
        <div className="text-xs text-green-600">Total Completados</div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-4">
        <h3 className="text-base font-semibold text-gray-800 mb-3">Lista de Completados</h3>
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
    </div>
  );
};

// Módulo de Riesgos (SIN finalizados)
const RiesgosModule = ({ data }) => {
  const riskAnalysis = useMemo(() => {
    const today = new Date();
    // EXCLUIR EXPLÍCITAMENTE LOS ELEMENTOS FINALIZADOS
    const activeItems = data.filter(item => !STATE_CATEGORIES.finalizados.includes(item.state));
    
    const atrasados = activeItems.filter(item => item.endDate && item.endDate < today);
    const sinAsignar = activeItems.filter(item => !item.assignee || item.assignee.trim() === '');
    const altaPrioridad = activeItems.filter(item => ['Highest', 'High'].includes(item.priority));
    const sinFechaVencimiento = activeItems.filter(item => !item.endDate);
    
    // Elementos que vencen en los próximos 7 días
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
        key: item.key,
        summary: item.summary,
        state: item.state,
        country: item.country,
        assignee: item.assignee,
        endDate: item.endDate
      })),
      porVencerDetalle: porVencer.map(item => ({
        key: item.key,
        summary: item.summary,
        state: item.state,
        country: item.country,
        assignee: item.assignee,
        endDate: item.endDate
      })),
      sinAsignarDetalle: sinAsignar.map(item => ({
        key: item.key,
        summary: item.summary,
        state: item.state,
        country: item.country,
        assignee: item.assignee,
        endDate: item.endDate
      })),
      altaPrioridadDetalle: altaPrioridad.map(item => ({
        key: item.key,
        summary: item.summary,
        state: item.state,
        country: item.country,
        assignee: item.assignee,
        priority: item.priority,
        endDate: item.endDate
      }))
    };
  }, [data]);

  const [selectedRiskCategory, setSelectedRiskCategory] = useState(null);

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
    let categoryData;
    let categoryTitle;
    let categoryDescription;
    let borderColor;
    let bgColor;

    switch(selectedRiskCategory) {
      case 'atrasados':
        categoryData = riskAnalysis.atrasadosDetalle;
        categoryTitle = 'Elementos Atrasados';
        categoryDescription = 'Proyectos que han superado su fecha de vencimiento';
        borderColor = 'border-red-500';
        bgColor = 'bg-red-50';
        break;
      case 'porVencer':
        categoryData = riskAnalysis.porVencerDetalle;
        categoryTitle = 'Por Vencer (Próximos 7 días)';
        categoryDescription = 'Proyectos que vencen en la próxima semana';
        borderColor = 'border-orange-500';
        bgColor = 'bg-orange-50';
        break;
      case 'sinAsignar':
        categoryData = riskAnalysis.sinAsignarDetalle;
        categoryTitle = 'Sin Asignar';
        categoryDescription = 'Proyectos que no tienen persona asignada';
        borderColor = 'border-yellow-500';
        bgColor = 'bg-yellow-50';
        break;
      case 'altaPrioridad':
        categoryData = riskAnalysis.altaPrioridadDetalle;
        categoryTitle = 'Alta Prioridad';
        categoryDescription = 'Proyectos marcados como alta prioridad';
        borderColor = 'border-purple-500';
        bgColor = 'bg-purple-50';
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

        {/* Matriz de riesgo */}
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

// ===============================
// COMPONENTE PRINCIPAL
// ===============================

const MultimoneySystem = () => {
  const [processedData, setProcessedData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [activeModule, setActiveModule] = useState('dashboard');
  const [hasData, setHasData] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    country: '',
    epic: '',
    area: '',
    soloFinalizados: '',
    finalizadosDesde: null,
    timelineDesde: null
  });

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

  const counts = useMemo(() => {
    const riesgos = filteredData.filter(item => {
      if (STATE_CATEGORIES.finalizados.includes(item.state)) return false;
      const today = new Date();
      return (item.endDate && item.endDate < today) ||
             (['Highest', 'High'].includes(item.priority));
    });
    
    const finalizados = filteredData.filter(item => STATE_CATEGORIES.finalizados.includes(item.state));
    
    return {
      dashboard: filteredData.length,
      riesgos: riesgos.length,
      finalizados: finalizados.length
    };
  }, [filteredData]);

  const processCSVData = useCallback((csvData) => {
    return csvData
      .filter(row => row['Clave'] && row['Clave'] !== '#N/A' && row['Clave'].trim() !== '')
      .map(row => ({
        key: row['Clave'] || '',
        summary: row['Resumen'] || '',
        state: row['Estado'] || '',
        country: row['PAIS_BM'] || '',
        epic: row['Epica'] || '',
        assignee: row['Persona asignada'] || '',
        devResponsible: row['Responsable Dev'] || '',
        startDate: parseDate(row['Start date']),
        endDate: parseDate(row['Fecha de vencimiento']),
        uatStart: parseDate(row['Inicio UAT']),
        uatEnd: parseDate(row['Fin UAT']),
        prodDate: parseDate(row['Fecha Pase a prod']),
        regulatoryDate: parseDate(row['Fecha de cumplimiento regulatorio']),
        priority: row['Prioridad'] || '',
        area: row['Area responsable'] || '',
        businessPriority: row['Valoración prioridad Negocio'] || '',
        technologyPriority: row['Valoración Prioridad Tecnología'] || '',
        sizing: row['Sizing'] || ''
      }));
  }, []);

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
    setError(null);
    
    try {
      setLoadingProgress(10);
      
      const response = await fetch(CSV_URL);
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      setLoadingProgress(30);
      
      const csvText = await response.text();
      
      await simulateLoading();
      
      Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          const processed = processCSVData(results.data);
          
          console.log("Total de registros procesados:", processed.length);
          console.log("Estados únicos:", [...new Set(processed.map(item => item.state))].filter(Boolean));
          
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
      console.error('Error loading data:', error);
      setError(`Error al cargar los datos: ${error.message}`);
      setIsLoading(false);
    }
  }, [processCSVData, simulateLoading]);

  // Cargar datos automáticamente al montar el componente
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
          
          console.log("Total de registros procesados:", processed.length);
          
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
  }, [processCSVData, simulateLoading]);

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
      'Clave': item.key,
      'Resumen': item.summary,
      'Estado': item.state,
      'PAIS_BM': item.country,
      'Epica': item.epic,
      'Persona asignada': item.assignee,
      'Responsable Dev': item.devResponsible,
      'Prioridad': item.priority,
      'Area responsable': item.area
    })));
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `multimoney-filtrado-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }, [filteredData]);

  const clearFilters = () => {
    setFilters({
      country: '',
      epic: '',
      area: '',
      soloFinalizados: '',
      finalizadosDesde: null,
      timelineDesde: null
    });
  };

  const sidebarItems = [
    { id: 'dashboard', icon: BarChart3, label: 'Dashboard', count: counts.dashboard },
    { id: 'epicas', icon: Target, label: 'Épicas', count: null },
    { id: 'timeline', icon: Calendar, label: 'Timeline', count: null },
    { id: 'riesgos', icon: AlertTriangle, label: 'Riesgos', count: counts.riesgos },
    { id: 'finalizados', icon: CheckCircle, label: 'Finalizados', count: counts.finalizados }
  ];

  if (isLoading) {
    return <LoadingProgress progress={loadingProgress} />;
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
            <p className="text-xl text-gray-600">Dashboard de gestión de proyectos con análisis avanzado</p>
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
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Google Drive Integration</h3>
                <p className="text-gray-600 mb-4">Enlace directo con archivos de ejemplo</p>
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
      {/* Botón recargar datos */}
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

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="bg-white shadow-sm border-b border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 capitalize">{activeModule}</h2>
              <p className="text-gray-600">{filteredData.length} elementos filtrados</p>
            </div>
            
            {/* Filtros principales */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={filters.country}
                onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-[140px] bg-white"
              >
                <option value="">Todos los países</option>
                {filterOptions.countries.map(country => (
                  <option key={country} value={country}>{countryNames[country]}</option>
                ))}
              </select>

              <select
                value={filters.area}
                onChange={(e) => setFilters(prev => ({ ...prev, area: e.target.value, epic: '' }))}
                className={`px-3 py-2 border-2 rounded-lg text-sm min-w-[140px] font-medium transition-all ${
                  filters.area 
                    ? 'border-orange-400 bg-orange-50 text-orange-700' 
                    : 'border-gray-300 bg-white text-gray-700 hover:border-orange-300'
                }`}
              >
                <option value="">Todas las áreas</option>
                {filterOptions.areas.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>

              <select
                value={filters.epic}
                onChange={(e) => setFilters(prev => ({ ...prev, epic: e.target.value }))}
                className={`px-3 py-2 border-2 rounded-lg text-sm min-w-[140px] font-medium transition-all ${
                  filters.epic 
                    ? 'border-purple-400 bg-purple-50 text-purple-700' 
                    : 'border-gray-300 bg-white text-gray-700 hover:border-purple-300'
                }`}
              >
                <option value="">Todas las épicas</option>
                {filterOptions.epics.map(epic => (
                  <option key={epic} value={epic}>{epic.length > 25 ? epic.substring(0, 25) + '...' : epic}</option>
                ))}
              </select>

              <select
                value={filters.soloFinalizados}
                onChange={(e) => setFilters(prev => ({ ...prev, soloFinalizados: e.target.value }))}
                className={`px-4 py-2 border-2 rounded-lg text-sm min-w-[160px] font-medium transition-all ${
                  filters.soloFinalizados 
                    ? 'border-green-400 bg-green-50 text-green-700' 
                    : 'border-gray-300 bg-white text-gray-700 hover:border-green-300'
                }`}
              >
                <option value="">Todos los estados</option>
                <option value="finalizados">Solo Finalizados</option>
                <option value="activos">Solo Activos</option>
              </select>

              <button
                onClick={exportCSV}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
              >
                <Download className="h-4 w-4" />
                <span>Exportar</span>
              </button>

              {(filters.country || filters.epic || filters.area || filters.soloFinalizados || filters.finalizadosDesde || filters.timelineDesde) && (
                <button
                  onClick={clearFilters}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
                >
                  <Filter className="h-4 w-4" />
                  <span>Limpiar</span>
                </button>
              )}
            </div>
          </div>

          {/* Filtros contextuales por módulo */}
          {activeModule === 'finalizados' && (
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-600" />
                <label className="text-sm font-medium text-gray-700">Finalizados desde:</label>
                <input
                  type="date"
                  value={filters.finalizadosDesde ? formatDateForInput(filters.finalizadosDesde) : ''}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    finalizadosDesde: e.target.value ? new Date(e.target.value) : null 
                  }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                {filters.finalizadosDesde && (
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, finalizadosDesde: null }))}
                    className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                    title="Limpiar filtro de fecha"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {activeModule === 'timeline' && (
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <label className="text-sm font-medium text-blue-700">Timeline desde:</label>
                <input
                  type="date"
                  value={filters.timelineDesde ? formatDateForInput(filters.timelineDesde) : ''}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    timelineDesde: e.target.value ? new Date(e.target.value) : null 
                  }))}
                  className="px-3 py-2 border-2 border-blue-300 bg-blue-50 text-blue-700 rounded-lg text-sm"
                />
                {filters.timelineDesde && (
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, timelineDesde: null }))}
                    className="p-1 text-blue-500 hover:text-red-600 transition-colors"
                    title="Limpiar filtro de timeline"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Tags de filtros activos */}
          {(filters.country || filters.epic || filters.area || filters.soloFinalizados || filters.finalizadosDesde || filters.timelineDesde) && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
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

              {filters.area && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  Área: {filters.area}
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, area: '', epic: '' }))}
                    className="ml-1 text-orange-600 hover:text-orange-800"
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

              {filters.finalizadosDesde && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Desde: {filters.finalizadosDesde.toLocaleDateString('es-ES')}
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, finalizadosDesde: null }))}
                    className="ml-1 text-gray-600 hover:text-gray-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              {filters.timelineDesde && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Timeline desde: {filters.timelineDesde.toLocaleDateString('es-ES')}
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, timelineDesde: null }))}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeModule === 'dashboard' && <DashboardModule data={filteredData} />}
          {activeModule === 'epicas' && <EpicasModule data={filteredData} />}
          {activeModule === 'timeline' && <TimelineModule data={filteredData} timelineFilter={filters.timelineDesde} />}
          {activeModule === 'riesgos' && <RiesgosModule data={filteredData} />}
          {activeModule === 'finalizados' && <FinalizadosModule data={filteredData} />}
        </div>
      </div>
    </div>
  );
};

export default MultimoneySystem;