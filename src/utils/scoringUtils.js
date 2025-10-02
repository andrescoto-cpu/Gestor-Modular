// ===============================
// SCORING UTILS (utils/scoringUtils.js)
// ===============================

import { SCORING_CONFIG } from './constants';

export const ScoringUtils = {
  calculateIntelligentScore: (item, config = SCORING_CONFIG) => {
    if (!item) return 0;
    
    let score = 0;
    
    // Business Priority Score (40%)
    const businessScore = config.businessValues[item['Valoración prioridad Negocio']] || 0;
    score += businessScore * config.weights.business;
    
    // Technology Priority Score (25%)
    const techScore = config.technologyValues[item['Valoración Prioridad Tecnología']] || 0;
    score += techScore * config.weights.technology;
    
    // Sizing Score (20%)
    const sizingScore = config.sizingValues[item.Sizing] || 0;
    score += sizingScore * config.weights.sizing;
    
    // State Score (15%)
    const stateScore = config.stateValues[item.Estado] || 0;
    score += stateScore * config.weights.state;
    
    return Math.round(score);
  },

  filterProjectsByCategory: (data) => {
    const ESTADOS_PROHIBIDOS = [
      'DEV', 'UAT', 'ANALISIS', 'Pase Produccion', 'DONE', 'Completado', 
      'Finalizada', 'Completada', 'En curso', 'En pausa', 'En planificacion-analisis', 
      'En implementación', 'En Planificación', 'Cancelada', 'Analizada - Descartada', 'Duplicada'
    ];
    
    return data.filter(item => 
      item && item.state && !ESTADOS_PROHIBIDOS.includes(item.state)
    );
  },

  getScoreBreakdown: (item, config = SCORING_CONFIG) => {
    if (!item) return null;
    
    const businessScore = config.businessValues[item['Valoración prioridad Negocio']] || 0;
    const techScore = config.technologyValues[item['Valoración Prioridad Tecnología']] || 0;
    const sizingScore = config.sizingValues[item.Sizing] || 0;
    const stateScore = config.stateValues[item.Estado] || 0;
    
    return {
      business: {
        raw: businessScore,
        weighted: businessScore * config.weights.business,
        percentage: config.weights.business * 100
      },
      technology: {
        raw: techScore,
        weighted: techScore * config.weights.technology,
        percentage: config.weights.technology * 100
      },
      sizing: {
        raw: sizingScore,
        weighted: sizingScore * config.weights.sizing,
        percentage: config.weights.sizing * 100
      },
      state: {
        raw: stateScore,
        weighted: stateScore * config.weights.state,
        percentage: config.weights.state * 100
      },
      total: Math.round(
        businessScore * config.weights.business +
        techScore * config.weights.technology +
        sizingScore * config.weights.sizing +
        stateScore * config.weights.state
      )
    };
  },

  validateScoringData: (item) => {
    const warnings = [];
    const errors = [];
    
    if (!item['Valoración prioridad Negocio']) {
      warnings.push('Valoración de prioridad de negocio faltante');
    }
    
    if (!item['Valoración Prioridad Tecnología']) {
      warnings.push('Valoración de prioridad tecnológica faltante');
    }
    
    if (!item.Sizing) {
      warnings.push('Sizing faltante');
    }
    
    if (!item.Estado) {
      errors.push('Estado requerido para scoring');
    }
    
    return { warnings, errors, isValid: errors.length === 0 };
  }
};