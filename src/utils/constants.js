// ===============================
// CONSTANTS (utils/constants.js)
// ===============================

export const STATE_CATEGORIES = {
  'finalizados': ['DONE', 'Pase Produccion', 'Completado', 'Finalizada', 'Completada', 'Cerrado', 'Resuelto'],
  'enProceso': ['ANALISIS', 'DEV', 'UAT', 'En curso', 'En pausa', 'En planificacion-analisis', 'En implementación', 'En Planificación', 'Esperando por ayuda', 'Esperando por el cliente'],
  'enAprobacion': ['Aprobacion Diseño Negocio', 'APROBACION DISEÑO TECNICO'],
  'enDiseno': ['SOLUTIONS'],
  'aPriorizar': ['PRIORIZAR', 'Prioridad 1', 'Planificación', 'Planning-Interno', 'backlog', 'Por Analizar', 'Abierto', 'Pendiente'],
  'bocaBacklog': ['Highest', 'Por analizar', 'Priorizado', 'Analizada - Por implementar', 'Escalado'],
  'cancelados': ['Cancelada', 'Analizada - Descartada', 'Duplicada', 'Cancelado']
};

export const VALID_COUNTRIES = ['GT', 'RG', 'CR', 'SV', 'MX', 'AK', 'PX'];

export const CSV_URL = 'https://raw.githubusercontent.com/andrescoto-cpu/metadata/main/scripts/METADATA%20BM.csv';

export const stateColors = {
  'DONE': '#10B981', 'Pase Produccion': '#059669', 'Completado': '#34D399',
  'ANALISIS': '#3B82F6', 'DEV': '#1D4ED8', 'UAT': '#60A5FA',
  'SOLUTIONS': '#8B5CF6', 'PRIORIZAR': '#F59E0B', 'Highest': '#EF4444',
  'default': '#6B7280'
};

export const countryNames = {
  'GT': 'Guatemala', 'RG': 'Regional', 'CR': 'Costa Rica', 
  'SV': 'El Salvador', 'MX': 'México', 'AK': 'Akros', 'PX': 'PEX'
};

export const SCORING_CONFIG = {
  weights: { business: 0.40, technology: 0.25, sizing: 0.20, state: 0.15 },
  businessValues: {
    '1. Riesgo/Regulatorio': 100, '2. Aumento de ingresos': 80,
    '3. Mejora de servicio (percibido por cliente)': 60,
    '4. Reducción de gasto': 40, '5. Mejora tecnológica': 20
  },
  technologyValues: {
    '1. Regulatorio': 100, '4. Ciberseguridad': 90, '2. Nuevo Feature': 60,
    '5. Soporte Nivel 2 (Escalación de soporte a Desarrollo)': 40, '3. Refactor': 20
  },
  sizingValues: { 'XS': 100, 'S': 80, 'M': 60, 'L': 30, 'XL': 10 },
  stateValues: {
    'PRIORIZAR': 100, 'ANALISIS': 90, 'APROBACION DISEÑO TECNICO': 70,
    'SOLUTIONS': 60, 'DEV': 50, 'UAT': 40, 'Pase Produccion': 20
  }
};

export const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16'];