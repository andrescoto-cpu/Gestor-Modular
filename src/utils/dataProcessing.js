// ===============================
// DATA PROCESSING (utils/dataProcessing.js)
// ===============================

export const parseDate = (dateStr) => {
  if (!dateStr || dateStr === 'null' || dateStr === '#N/A' || dateStr === '') return null;
  
  const cleanStr = String(dateStr).trim();
  if (!cleanStr) return null;
  
  // Try DD/MM/YYYY format first
  const ddmmyyyy = cleanStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (date.getFullYear() >= 2020 && date.getFullYear() <= 2030) return date;
  }
  
  // Try standard date formats
  const standardDate = new Date(cleanStr);
  if (!isNaN(standardDate.getTime()) && standardDate.getFullYear() >= 2020) return standardDate;
  return null;
};

export const isValidEpic = (epic) => {
  if (!epic || epic === 'Sin épica' || epic === '#N/A' || epic === 'N/A' || epic === 'null') return false;
  if (typeof epic !== 'string') return false;
  if (epic.length < 3) return false;
  if (/^\d+$/.test(epic)) return false;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(epic)) return false;
  return true;
};

export const identifyRealAreas = (areas) => {
  return areas.filter(area => {
    if (!area || typeof area !== 'string') return false;
    if (area === '#N/A') return false;
    return true;
  });
};

export const processCSVData = (csvData) => {
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
};

export const categorizeState = (state) => {
  if (!state) return 'Unknown';
  
  const STATE_CATEGORIES = {
    'Completed': ['Done', 'Completado', 'Finalizado', 'Cerrado', 'Closed'],
    'In Progress': ['In Progress', 'En Progreso', 'Desarrollo', 'Dev', 'DEV'],
    'Review': ['Review', 'Revisión', 'UAT', 'Testing', 'QA'],
    'Blocked': ['Blocked', 'Bloqueado', 'Impedido', 'Hold'],
    'To Do': ['To Do', 'Por Hacer', 'Backlog', 'New', 'Open'],
    'Approved': ['Approved', 'Aprobado', 'Ready', 'Listo']
  };
  
  for (const [category, states] of Object.entries(STATE_CATEGORIES)) {
    if (states.some(s => state.toLowerCase().includes(s.toLowerCase()))) {
      return category;
    }
  }
  return 'Other';
};