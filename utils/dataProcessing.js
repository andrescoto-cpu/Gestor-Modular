const FIELD_MAPPING = {
  key: 'key',
  clave: 'key',
  id: 'key',
  resumen: 'summary',
  summary: 'summary',
  descripcion: 'description',
  description: 'description',
  estado: 'state',
  status: 'state',
  state: 'state',
  pais: 'country',
  país: 'country',
  country: 'country',
  area: 'area',
  área: 'area',
  squad: 'area',
  tribu: 'area',
  epic: 'epic',
  épica: 'epic',
  'epic link': 'epic',
  responsable: 'assignee',
  assignee: 'assignee',
  owner: 'assignee',
  'responsable dev': 'devResponsible',
  'dev responsible': 'devResponsible',
  'responsable desarrollo': 'devResponsible',
  prioridad: 'priority',
  priority: 'priority',
  'start date': 'startDate',
  'fecha inicio': 'startDate',
  inicio: 'startDate',
  'end date': 'endDate',
  'fecha fin': 'endDate',
  fin: 'endDate',
  'uat start': 'uatStart',
  'uat inicio': 'uatStart',
  'uat end': 'uatEnd',
  'uat fin': 'uatEnd',
  'prod date': 'prodDate',
  'fecha prod': 'prodDate',
  'production date': 'prodDate',
  created: 'createdDate',
  'created date': 'createdDate'
};

const INVALID_STRINGS = new Set(['', '#n/a', 'n/a', 'na', 'null', 'undefined', '-', 'sin dato', 'sin área', 'sin area']);

const camelCase = (value = '') => value
  .toLowerCase()
  .replace(/[^a-z0-9]+([a-z0-9])/g, (_, char) => char.toUpperCase());

const sanitiseString = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
};

const parseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value)) return value;

  const raw = sanitiseString(value);
  if (!raw) return null;

  const normalised = raw.replace(/\./g, '/');

  // ISO or timestamp
  const isoDate = Date.parse(normalised);
  if (!Number.isNaN(isoDate)) {
    const parsed = new Date(isoDate);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const ddmmyyyy = normalised.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    const yyyy = year.length === 2 ? `20${year}` : year.padStart(4, '0');
    const mm = month.padStart(2, '0');
    const dd = day.padStart(2, '0');
    const parsed = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
};

export const normalizeFieldNames = (rows = []) =>
  rows.map((row = {}) => {
    const normalisedRow = {};
    Object.entries(row).forEach(([key, value]) => {
      if (!key) return;
      const lowerKey = key.toString().trim().toLowerCase();
      const targetKey = FIELD_MAPPING[lowerKey] ?? camelCase(lowerKey);
      normalisedRow[targetKey] = value;
    });
    return normalisedRow;
  });

export const validateCSVData = (data) => {
  if (!Array.isArray(data) || data.length === 0) return false;
  const sample = data.find((row) => row && Object.keys(row).length > 0);
  if (!sample) return false;

  const normalisedKeys = new Set(
    Object.keys(sample).map((key) => key.toString().trim().toLowerCase())
  );

  const requiredGroups = [
    ['key', 'clave', 'id'],
    ['summary', 'resumen'],
    ['status', 'state', 'estado']
  ];

  return requiredGroups.every((group) => group.some((option) => normalisedKeys.has(option)));
};

export const processRawCSVData = (rows = []) =>
  rows.map((row, index) => {
    const clean = (value) => {
      const stringValue = sanitiseString(value);
      const lower = stringValue.toLowerCase();
      return INVALID_STRINGS.has(lower) ? '' : stringValue;
    };

    const toDate = (value) => parseDate(value);

    const key = clean(row.key) || `ITEM-${index + 1}`;
    const summary = clean(row.summary) || 'Sin resumen';
    const description = clean(row.description);
    const state = clean(row.state) || 'Sin estado';
    const country = clean(row.country);
    const area = clean(row.area);
    const epic = clean(row.epic);
    const assignee = clean(row.assignee);
    const devResponsible = clean(row.devResponsible);
    const priority = clean(row.priority);

    return {
      id: key,
      key,
      summary,
      description,
      state,
      country,
      area,
      epic,
      assignee,
      devResponsible,
      priority,
      startDate: toDate(row.startDate),
      endDate: toDate(row.endDate),
      uatStart: toDate(row.uatStart),
      uatEnd: toDate(row.uatEnd),
      prodDate: toDate(row.prodDate),
      createdDate: toDate(row.createdDate)
    };
  });

export const identifyRealAreas = (areas = []) => {
  const unique = new Set();
  areas.forEach((area) => {
    const cleanArea = sanitiseString(area);
    if (!cleanArea) return;
    if (INVALID_STRINGS.has(cleanArea.toLowerCase())) return;
    unique.add(cleanArea);
  });
  return Array.from(unique).sort((a, b) => a.localeCompare(b, 'es'));
};

export const isValidEpic = (epic) => {
  const value = sanitiseString(epic);
  if (!value) return false;
  return !INVALID_STRINGS.has(value.toLowerCase());
};
