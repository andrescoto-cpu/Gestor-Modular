# MULTIMONEY - Sistema de Business Intelligence

Sistema integral de análisis de proyectos multinacionales con capacidades avanzadas de BI y reporting ejecutivo.

## 🎯 Características Principales

### Sistema de Carga
- **Drag & Drop** para archivos CSV
- **Enlace directo a Google Drive** con archivos de ejemplo
- **Pantalla de carga animada** con progreso paso a paso
- **Validación automática** de archivos

### 4 Módulos Completos
1. **Dashboard** - Matriz regional + 6 KPIs + gráficos interactivos
2. **Épicas** - Análisis de salud con drill-down clickeable en cada categoría
3. **Timeline** - Vista cronológica con escala temporal de 9 meses
4. **Finalizados** - Análisis detallado de proyectos completados
5. **Riesgos** - Identificación de factores de riesgo (excluye finalizados)

### Sistema de Filtros Avanzado
- **Filtros globales**: País/Región, Épica, Finalizados desde
- **Filtros contextuales**: Timeline desde (solo en vista Timeline)
- **Botones de limpieza (✕)** para cada filtro de fecha
- **Contadores dinámicos** de elementos filtrados

### Funcionalidades Técnicas
- **Procesamiento CSV robusto** con Papa Parse
- **Parsing inteligente de fechas** múltiples formatos
- **Categorización automática** de estados del proyecto
- **Exportación de reportes CSV** filtrados
- **Navegación drill-down** en análisis de épicas
- **Cálculos en tiempo real** de métricas y KPIs

### UI/UX Profesional
- **Diseño responsivo** con Tailwind CSS
- **Animaciones suaves** y hover effects
- **Gráficos interactivos** con Recharts (Pie + Bar charts)
- **Estados de carga** y manejo de errores
- **Gradientes y sombras** profesionales

## 📋 Requisitos Previos

- Node.js 16+ 
- React 18+
- npm o yarn

## 🚀 Instalación

1. **Instalar dependencias principales:**
```bash
npm install react react-dom
```

2. **Instalar dependencias de procesamiento:**
```bash
npm install papaparse recharts
```

3. **Instalar Tailwind CSS:**
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

4. **Configurar Tailwind CSS** en `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

5. **Agregar Tailwind CSS** a `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Importar estilos custom */
@import './styles/multimoney.css';
```

## 📁 Estructura del Proyecto

```
src/
├── components/
│   ├── MultimoneySystem.jsx ✓
│   ├── common/
│   │   └── TicketViewer.jsx ✓
│   └── modules/
│       ├── DashboardModule.jsx ✓
│       ├── EpicasModule.jsx ✓
│       ├── TimelineModule.jsx ✓
│       ├── FinalizadosModule.jsx ✓
│       └── RiesgosModule.jsx ✓
├── utils/
│   ├── constants.js ✓
│   └── dataProcessing.js ✓
└── styles/
    └── multimoney.css ✓
```

## 🎮 Uso del Sistema

### 1. Integración en tu App Principal

```javascript
// src/App.js
import React from 'react';
import MultimoneySystem from './MultimoneySystem.jsx';
import './styles/multimoney.css';

function App() {
  return (
    <div className="App">
      <MultimoneySystem />
    </div>
  );
}

export default App;
```

### 2. Formato de Archivos CSV Esperado

El sistema espera archivos CSV con estas columnas (mínimas requeridas):
- `Resumen` - Título del proyecto/ticket
- `Estado` - Estado actual del proyecto
- `Épica` - Épica asociada
- `Creado` - Fecha de creación

**Columnas recomendadas adicionales:**
- `Actualizado` - Fecha de última actualización
- `Fecha de Inicio` - Fecha de inicio del proyecto
- `Fecha de Fin` - Fecha de finalización
- `Persona Asignada` - Responsable del proyecto
- `Responsable Dev` - Desarrollador responsable
- `Prioridad` - Prioridad del proyecto
- `Región` - Región geográfica
- `País` - País del proyecto

### 3. Configuración de Regiones

Edita `src/utils/constants.js` para añadir tus regiones específicas:

```javascript
export const REGIONS = [
  'Guatemala',
  'Costa Rica', 
  'El Salvador',
  'Mexico',
  'Akros',
  'PEX',
  // Añade tus regiones aquí
];
```

### 4. Configuración de GitHub (Opcional)

Para habilitar carga desde GitHub, actualiza en `constants.js`:

```javascript
export const GITHUB_EXAMPLES = {
  baseUrl: 'https://raw.githubusercontent.com/tu-repo/multimoney-data/main/',
  files: [
    {
      name: 'jira_export_guatemala.csv',
      description: 'Datos de ejemplo de Guatemala',
      url: 'jira_export_guatemala.csv'
    },
    // Añade más archivos aquí
  ]
};
```

## 📊 Módulos del Sistema

### Dashboard
- **9 KPIs principales** calculados automáticamente
- **Matriz regional** con distribución de proyectos
- **Gráficos interactivos** de estado y progreso
- **Vista general** del portafolio de proyectos

### Épicas
- **Score de salud** calculado con fórmula: 60% completados + 30% en progreso + 10% otros
- **Drill-down clickeable** para ver detalles por épica
- **Categorización automática** de épicas por tipo
- **Vista de distribución** y análisis comparativo

### Timeline
- **Vista cronológica** de creación de proyectos
- **Escala temporal configurable** (mensual/trimestral)
- **Métricas de velocidad** y tendencias
- **Análisis de períodos** productivos

### Finalizados
- **Análisis de tiempo de ciclo** con percentiles
- **Distribución temporal** de finalizaciones
- **Métricas de rendimiento** por épica
- **Identificación de patrones** de finalización

### Riesgos
- **Exclusión automática** de proyectos finalizados
- **Identificación de factores** de riesgo múltiples
- **Categorización por severidad**
- **Score de riesgo** calculado dinámicamente

## 🎨 Personalización de Estilos

### Colores del Sistema
```css
:root {
  --color-primary: #3b82f6;
  --color-secondary: #22c55e;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
}
```

### Gradientes Personalizados
```css
.bg-gradient-custom {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

## 🔧 Algoritmos y Cálculos

### Health Scoring (Épicas)
```
Health Score = (Completados × 0.6) + (En Progreso × 0.3) + (Otros × 0.1)
```

### Scoring Inteligente (Futuro)
```
Score = (Prioridad Negocio × 0.4) + (Prioridad Técnica × 0.25) + 
        (Tamaño × 0.2) + (Estado × 0.15)
```

### Detección de Riesgos
- **Bloqueados**: Estado = "Bloqueado"
- **Atrasados**: Fecha fin < Hoy AND Estado ≠ "Completado"
- **Sin Asignar**: No hay "Persona Asignada" NI "Responsable Dev"
- **Inactivos**: Última actualización > 30 días

## 🐛 Solución de Problemas

### Error: "isValidEpic is not defined"
✅ **Solucionado** - La función está incluida en `dataProcessing.js`

### Archivos CSV no se procesan
1. Verificar formato UTF-8
2. Revisar que las columnas requeridas existan
3. Comprobar que no haya caracteres especiales en headers

### Gráficos no se muestran
1. Verificar que Recharts esté instalado: `npm install recharts`
2. Comprobar que los datos tengan el formato correcto

### Filtros no funcionan
1. Verificar que las fechas estén parseadas correctamente
2. Revisar que los campos de filtro existan en los datos

## 📈 Roadmap Futuro

- [ ] **Módulo de Recursos** - Gestión dual de asignaciones
- [ ] **Módulo de Resultados por Mes** - Evolución mensual detallada
- [ ] **Scoring Inteligente completo** - Algoritmo multi-factor
- [ ] **Exportación PDF** con html2canvas y jsPDF
- [ ] **Integración directa con Jira** API
- [ ] **Dashboard ejecutivo** con métricas C-level
- [ ] **Alertas automáticas** de riesgos críticos
- [ ] **Predicciones con ML** de tiempos de finalización

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Distribuido bajo la Licencia MIT. Ver `LICENSE` para más información.

## 👥 Contacto

- **Proyecto**: MULTIMONEY BI System
- **Versión**: 1.0.0
- **Stack**: React + Tailwind CSS + Recharts + Papa Parse

---

**¡Sistema listo para producción!** 🚀

Todas las funcionalidades están implementadas y probadas. El error de `isValidEpic` ha sido corregido y el sistema incluye todos los módulos solicitados con UI/UX profesional.