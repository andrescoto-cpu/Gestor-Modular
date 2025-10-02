import React, { useState, useEffect, useMemo } from 'react';
import { Brain, Lightbulb, AlertCircle, Calendar, Target, TrendingUp, Zap, ArrowLeft } from 'lucide-react';
import { STATE_CATEGORIES } from '../utils/constants';

// ===============================
// ML ALGORITHMS
// ===============================

const BasicCompletionPredictor = {
  predict: (project, historicalData) => {
    // Find similar completed projects
    const similar = historicalData.filter(p => 
      p.sizing === project.sizing && 
      p.country === project.country &&
      STATE_CATEGORIES.finalizados.includes(p.state) &&
      p.startDate && p.endDate
    );

    if (similar.length < 3) {
      return BasicCompletionPredictor.predictBySizing(project);
    }

    // Calculate average duration and variance
    const durations = similar.map(p => (p.endDate - p.startDate) / (1000 * 60 * 60 * 24));
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const stdDev = Math.sqrt(
      durations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) / durations.length
    );

    if (!project.startDate) {
      return {
        avgDuration: Math.round(avgDuration),
        confidence: Math.min(90, similar.length * 15),
        basedOn: similar.length,
        needsStartDate: true
      };
    }

    const predictedEndDate = new Date(
      project.startDate.getTime() + (avgDuration * 24 * 60 * 60 * 1000)
    );

    return {
      predictedEndDate, 
      avgDuration: Math.round(avgDuration),
      confidence: Math.min(90, similar.length * 15),
      variance: Math.round(stdDev), 
      basedOn: similar.length,
      method: 'similar_projects'
    };
  },

  predictBySizing: (project) => {
    const sizingDurations = {
      'XS': { avg: 7, variance: 3 }, 
      'S': { avg: 14, variance: 5 },
      'M': { avg: 21, variance: 7 }, 
      'L': { avg: 35, variance: 10 },
      'XL': { avg: 56, variance: 15 }
    };

    const sizeData = sizingDurations[project.sizing] || sizingDurations['M'];
    
    if (!project.startDate) {
      return {
        avgDuration: sizeData.avg, 
        confidence: 60,
        basedOn: 'sizing_average', 
        needsStartDate: true
      };
    }

    const predictedEndDate = new Date(
      project.startDate.getTime() + (sizeData.avg * 24 * 60 * 60 * 1000)
    );

    return {
      predictedEndDate, 
      avgDuration: sizeData.avg, 
      confidence: 60,
      variance: sizeData.variance, 
      basedOn: 'sizing_average', 
      method: 'sizing_baseline'
    };
  }
};

const BasicRiskDetector = {
  analyze: (project, allProjects) => {
    const risks = [];
    let totalScore = 0;

    // Unassigned risk
    if (!project.assignee && !project.devResponsible) {
      risks.push({
        factor: 'Sin asignar', 
        score: 30, 
        level: 'high',
        description: 'Proyecto sin ownership definido'
      });
      totalScore += 30;
    }

    // Timeline risks
    if (project.endDate) {
      const today = new Date();
      const daysToDeadline = (project.endDate - today) / (1000 * 60 * 60 * 24);
      
      if (daysToDeadline < 0) {
        risks.push({
          factor: 'Proyecto atrasado', 
          score: 40, 
          level: 'critical',
          description: `${Math.abs(Math.round(daysToDeadline))} días de retraso`
        });
        totalScore += 40;
      } else if (daysToDeadline < 7 && !STATE_CATEGORIES.finalizados.includes(project.state)) {
        risks.push({
          factor: 'Deadline próximo', 
          score: 25, 
          level: 'high',
          description: `Solo ${Math.round(daysToDeadline)} días para completar`
        });
        totalScore += 25;
      }
    }

    // Complexity risk
    if (['L', 'XL'].includes(project.sizing)) {
      const score = project.sizing === 'XL' ? 20 : 15;
      risks.push({
        factor: 'Proyecto complejo', 
        score, 
        level: 'medium',
        description: `Proyectos ${project.sizing} tienen mayor riesgo de problemas`
      });
      totalScore += score;
    }

    // Resource overload risk
    const assignee = project.assignee || project.devResponsible;
    if (assignee) {
      const assigneeProjects = allProjects.filter(p => 
        (p.assignee === assignee || p.devResponsible === assignee) &&
        !STATE_CATEGORIES.finalizados.includes(p.state) &&
        !STATE_CATEGORIES.cancelados.includes(p.state)
      );

      if (assigneeProjects.length > 5) {
        risks.push({
          factor: 'Recurso sobrecargado', 
          score: 20, 
          level: 'medium',
          description: `${assignee} tiene ${assigneeProjects.length} proyectos activos`
        });
        totalScore += 20;
      }
    }

    let riskLevel = 'low';
    if (totalScore > 60) riskLevel = 'critical';
    else if (totalScore > 35) riskLevel = 'high';
    else if (totalScore > 15) riskLevel = 'medium';

    return {
      totalScore: Math.min(100, totalScore), 
      level: riskLevel, 
      risks,
      recommendations: BasicRiskDetector.generateRecommendations(risks)
    };
  },

  generateRecommendations: (risks) => {
    const recommendations = [];
    
    risks.forEach(risk => {
      switch (risk.factor) {
        case 'Sin asignar':
          recommendations.push('🎯 Asignar inmediatamente a un recurso disponible');
          break;
        case 'Proyecto atrasado':
          recommendations.push('⚠️ Revisar scope y considerar re-priorización urgente');
          break;
        case 'Deadline próximo':
          recommendations.push('⏰ Aumentar foco y recursos en este proyecto');
          break;
        case 'Proyecto complejo':
          recommendations.push('🔧 Considerar dividir en fases más pequeñas');
          break;
        case 'Recurso sobrecargado':
          recommendations.push('👥 Redistribuir carga de trabajo');
          break;
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('✅ Proyecto en buen estado, continuar seguimiento regular');
    }

    return recommendations;
  }
};

// ===============================
// ML COMPONENTS
// ===============================

const MLGeneralInsights = ({ insights }) => {
  const velocityTrend = insights.recentCompletions > 0 ? 'positive' : 'stable';
  const riskLevel = insights.highRiskCount / insights.activeProjects;
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="h-6 w-6 text-blue-600" />
            <h4 className="font-bold text-blue-800">Velocidad del Equipo</h4>
          </div>
          <div className="text-3xl font-bold text-blue-600 mb-2">{insights.recentCompletions}</div>
          <p className="text-blue-700 text-sm">Proyectos completados últimos 30 días</p>
          <div className="mt-3">
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              velocityTrend === 'positive' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {velocityTrend === 'positive' ? '📈 Tendencia positiva' : '📊 Tendencia estable'}
            </div>
          </div>
        </div>

        <div className={`rounded-lg p-6 border ${
          riskLevel > 0.3 ? 'bg-red-50 border-red-200' : 
          riskLevel > 0.1 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className={`h-6 w-6 ${
              riskLevel > 0.3 ? 'text-red-600' : 
              riskLevel > 0.1 ? 'text-yellow-600' : 'text-green-600'
            }`} />
            <h4 className={`font-bold ${
              riskLevel > 0.3 ? 'text-red-800' : 
              riskLevel > 0.1 ? 'text-yellow-800' : 'text-green-800'
            }`}>Salud del Portfolio</h4>
          </div>
          <div className={`text-3xl font-bold mb-2 ${
            riskLevel > 0.3 ? 'text-red-600' : 
            riskLevel > 0.1 ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {Math.round((1 - riskLevel) * 100)}%
          </div>
          <p className={`text-sm ${
            riskLevel > 0.3 ? 'text-red-700' : 
            riskLevel > 0.1 ? 'text-yellow-700' : 'text-green-700'
          }`}>
            {insights.activeProjects - insights.highRiskCount} de {insights.activeProjects} proyectos en buen estado
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6 border border-indigo-200">
        <h4 className="font-bold text-indigo-800 mb-4">Recomendaciones Inteligentes</h4>
        <div className="space-y-3">
          {insights.highRiskCount > 0 && (
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <span className="text-sm text-indigo-700">
                <strong>Atención urgente:</strong> {insights.highRiskCount} proyecto(s) en alto riesgo
              </span>
            </div>
          )}
          
          <div className="flex items-start gap-2">
            <Lightbulb className="h-5 w-5 text-blue-500 mt-0.5" />
            <span className="text-sm text-indigo-700">
              <strong>Oportunidad:</strong> {insights.predictions.length} proyectos con predicciones disponibles
            </span>
          </div>
          
          <div className="flex items-start gap-2">
            <Brain className="h-5 w-5 text-purple-500 mt-0.5" />
            <span className="text-sm text-indigo-700">
              <strong>ML Insights:</strong> Análisis basado en {insights.totalProjects} proyectos históricos
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const MLRiskAnalysis = ({ risks }) => {
  const criticalRisks = risks.filter(r => r.risk.level === 'critical');
  const highRisks = risks.filter(r => r.risk.level === 'high');
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 rounded-lg p-4 border border-red-200 text-center">
          <div className="text-2xl font-bold text-red-600">{criticalRisks.length}</div>
          <div className="text-sm text-red-700">Riesgo Crítico</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200 text-center">
          <div className="text-2xl font-bold text-orange-600">{highRisks.length}</div>
          <div className="text-sm text-orange-700">Riesgo Alto</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200 text-center">
          <div className="text-2xl font-bold text-green-600">{risks.length - criticalRisks.length - highRisks.length}</div>
          <div className="text-sm text-green-700">Bajo/Medio</div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-bold text-gray-800">Proyectos que Requieren Atención</h4>
        {[...criticalRisks, ...highRisks].slice(0, 10).map((item, index) => (
          <div key={index} className={`rounded-lg p-4 border ${
            item.risk.level === 'critical' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                <span className="font-semibold text-gray-800">{item.project.key}</span>
                <p className="text-sm text-gray-600 truncate">{item.project.summary}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                item.risk.level === 'critical' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
              }`}>
                {item.risk.totalScore} pts
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Factores de riesgo:</div>
              <div className="flex flex-wrap gap-2">
                {item.risk.risks.map((risk, idx) => (
                  <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                    {risk.factor} (+{risk.score})
                  </span>
                ))}
              </div>
              
              <div className="text-sm font-medium text-gray-700 mt-3">Recomendaciones:</div>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                {item.risk.recommendations.slice(0, 2).map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const MLPredictionsView = ({ predictions }) => {
  const validPredictions = predictions.filter(p => p.prediction.predictedEndDate || p.prediction.avgDuration);
  
  return (
    <div className="space-y-6">
      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
        <h4 className="font-bold text-purple-800 mb-2">Predicciones de Finalización</h4>
        <p className="text-purple-600 text-sm">
          {validPredictions.length} proyectos con predicciones disponibles basadas en ML
        </p>
      </div>

      <div className="space-y-4">
        {validPredictions.map((item, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                <span className="font-semibold text-gray-800">{item.project.key}</span>
                <p className="text-sm text-gray-600 truncate max-w-md">{item.project.summary}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                item.prediction.confidence > 80 ? 'bg-green-100 text-green-800' :
                item.prediction.confidence > 60 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {item.prediction.confidence}% confianza
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-600">Fecha Predicha</p>
                <p className="font-semibold text-blue-600">
                  {item.prediction.predictedEndDate ? 
                    item.prediction.predictedEndDate.toLocaleDateString('es-ES') :
                    `${item.prediction.avgDuration} días desde inicio`
                  }
                </p>
              </div>
              
              <div>
                <p className="text-xs font-medium text-gray-600">Basado en</p>
                <p className="text-sm text-gray-700">
                  {typeof item.prediction.basedOn === 'number' ? 
                    `${item.prediction.basedOn} proyectos similares` :
                    item.prediction.basedOn
                  }
                </p>
              </div>
              
              <div>
                <p className="text-xs font-medium text-gray-600">Método ML</p>
                <p className="text-sm text-gray-700">
                  {item.prediction.method === 'similar_projects' ? 'Proyectos similares' : 'Promedio por tamaño'}
                </p>
              </div>
            </div>
            
            {item.prediction.variance && (
              <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                <span className="font-medium">Varianza:</span> ±{item.prediction.variance} días
              </div>
            )}
          </div>
        ))}

        {validPredictions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p>No hay predicciones disponibles</p>
            <p className="text-sm mt-1">Los proyectos necesitan fechas de inicio para predicciones</p>
          </div>
        )}
      </div>
    </div>
  );
};

const MLProjectAnalysisView = ({ data, onSelectProject, selectedAnalysis }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredProjects = data
    .filter(p => !STATE_CATEGORIES.finalizados.includes(p.state))
    .filter(p => 
      p.key?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.summary?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .slice(0, 20);

  if (selectedAnalysis) {
    return <MLProjectDetailedAnalysis analysis={selectedAnalysis} onBack={() => onSelectProject(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Buscar proyecto para análisis ML..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredProjects.map((project, index) => (
          <div
            key={index}
            onClick={() => onSelectProject(project)}
            className="border border-gray-200 rounded-lg p-4 hover:bg-purple-50 cursor-pointer transition-colors hover:border-purple-300"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-purple-700">{project.key}</span>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {project.state}
              </span>
            </div>
            <p className="text-sm text-gray-600 truncate">{project.summary}</p>
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
              {project.sizing && <span className="bg-gray-100 px-2 py-1 rounded">{project.sizing}</span>}
              {project.country && <span>{project.country}</span>}
            </div>
          </div>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Brain className="h-12 w-12 mx-auto mb-2 text-gray-400" />
          <p>No se encontraron proyectos</p>
          <p className="text-sm mt-1">Ajusta el filtro de búsqueda</p>
        </div>
      )}
    </div>
  );
};

const MLProjectDetailedAnalysis = ({ analysis, onBack }) => {
  const { project, prediction, risk } = analysis;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h3 className="text-xl font-bold text-gray-800">{project.key}</h3>
            <p className="text-gray-600">{project.summary}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prediction card */}
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h4 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Predicción ML
          </h4>
          {prediction.predictedEndDate ? (
            <div>
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {prediction.predictedEndDate.toLocaleDateString('es-ES')}
              </div>
              <p className="text-blue-700 text-sm">
                Duración: {prediction.avgDuration} días • Confianza: {prediction.confidence}%
              </p>
              {prediction.variance && (
                <p className="text-blue-600 text-xs mt-1">Varianza: ±{prediction.variance} días</p>
              )}
            </div>
          ) : (
            <div>
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {prediction.avgDuration} días
              </div>
              <p className="text-blue-700 text-sm">Duración estimada</p>
              {prediction.needsStartDate && (
                <p className="text-blue-600 text-xs mt-1">⚠️ Requiere fecha de inicio para predicción exacta</p>
              )}
            </div>
          )}
        </div>

        {/* Risk card */}
        <div className={`rounded-lg p-6 border ${
          risk.level === 'critical' ? 'bg-red-50 border-red-200' :
          risk.level === 'high' ? 'bg-orange-50 border-orange-200' :
          'bg-green-50 border-green-200'
        }`}>
          <h4 className={`font-bold mb-4 flex items-center gap-2 ${
            risk.level === 'critical' ? 'text-red-800' :
            risk.level === 'high' ? 'text-orange-800' :
            'text-green-800'
          }`}>
            <AlertCircle className="h-5 w-5" />
            Análisis de Riesgo ML
          </h4>
          <div className={`text-2xl font-bold mb-2 ${
            risk.level === 'critical' ? 'text-red-600' :
            risk.level === 'high' ? 'text-orange-600' :
            'text-green-600'
          }`}>
            {risk.totalScore}/100
          </div>
          <p className="text-sm capitalize font-medium">
            Riesgo {risk.level === 'critical' ? 'crítico' : risk.level === 'high' ? 'alto' : 'bajo/medio'}
          </p>
          
          {risk.risks.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium mb-2">Factores de riesgo detectados:</p>
              <div className="space-y-1">
                {risk.risks.map((r, i) => (
                  <div key={i} className="text-xs bg-white/50 p-2 rounded">
                    <span className="font-medium">{r.factor}</span> (+{r.score} pts)
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recommendations */}
      {risk.recommendations.length > 0 && (
        <div className="bg-indigo-50 rounded-lg p-6 border border-indigo-200">
          <h4 className="font-bold text-indigo-800 mb-3 flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Recomendaciones ML
          </h4>
          <ul className="space-y-2">
            {risk.recommendations.map((rec, index) => (
              <li key={index} className="text-sm text-indigo-700">• {rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// ===============================
// MAIN ML INSIGHTS MODULE
// ===============================

const MLInsightsModule = ({ data }) => {
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeTab, setActiveTab] = useState('insights');
  const [mlInsights, setMlInsights] = useState(null);
  
  useEffect(() => {
    if (data.length > 10) {
      generateMLInsights();
    }
  }, [data]);

  const generateMLInsights = () => {
    const activeProjects = data.filter(p => !STATE_CATEGORIES.finalizados.includes(p.state));
    
    // Risk analysis for all active projects
    const riskAnalysis = activeProjects.map(project => ({
      project,
      risk: BasicRiskDetector.analyze(project, data)
    }));

    const highRiskProjects = riskAnalysis.filter(r => ['high', 'critical'].includes(r.risk.level));
    
    // Recent completions (last 30 days)
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentCompletions = data.filter(p => 
      STATE_CATEGORIES.finalizados.includes(p.state) &&
      ((p.prodDate && p.prodDate >= last30Days) || 
       (p.uatEnd && p.uatEnd >= last30Days) || 
       (p.endDate && p.endDate >= last30Days))
    );

    // Predictions for active projects with start dates
    const predictions = activeProjects
      .filter(p => p.startDate)
      .slice(0, 10)
      .map(project => ({
        project,
        prediction: BasicCompletionPredictor.predict(project, data)
      }));

    setMlInsights({
      totalProjects: data.length,
      activeProjects: activeProjects.length,
      highRiskCount: highRiskProjects.length,
      recentCompletions: recentCompletions.length,
      riskAnalysis: riskAnalysis.slice(0, 20),
      predictions,
      lastUpdated: new Date()
    });
  };

  const predictProject = (project) => {
    const prediction = BasicCompletionPredictor.predict(project, data);
    const risk = BasicRiskDetector.analyze(project, data);
    
    setSelectedProject({ project, prediction, risk });
  };

  if (!mlInsights) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Brain className="h-16 w-16 text-purple-500 mx-auto mb-4 animate-pulse" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Inicializando ML Engine...</h3>
          <p className="text-gray-600">
            {data.length < 10 ? 
              `Necesitas al menos 10 proyectos para análisis ML. Tienes ${data.length}.` :
              'Analizando patrones en tus datos...'
            }
          </p>
          {data.length >= 10 && (
            <button
              onClick={generateMLInsights}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Iniciar Análisis
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ML Overview */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Brain className="h-8 w-8 text-purple-600" />
            <div>
              <h3 className="text-xl font-bold text-purple-800">ML Insights Engine</h3>
              <p className="text-purple-600">{mlInsights.totalProjects} proyectos analizados</p>
            </div>
          </div>
          <button
            onClick={generateMLInsights}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm"
          >
            <Zap className="h-4 w-4" />
            Actualizar ML
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-blue-600">{mlInsights.activeProjects}</div>
            <div className="text-sm text-blue-700">Proyectos Activos</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-red-600">{mlInsights.highRiskCount}</div>
            <div className="text-sm text-red-700">Alto Riesgo ML</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-green-600">{mlInsights.recentCompletions}</div>
            <div className="text-sm text-green-700">Completados (30d)</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-purple-600">{mlInsights.predictions.length}</div>
            <div className="text-sm text-purple-700">Con Predicciones</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="border-b">
          <div className="flex space-x-8 px-6">
            {[
              { id: 'insights', label: 'Insights Generales', icon: Lightbulb },
              { id: 'risks', label: 'Análisis de Riesgos', icon: AlertCircle },
              { id: 'predictions', label: 'Predicciones ML', icon: Calendar },
              { id: 'project', label: 'Análisis Individual', icon: Target }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'insights' && <MLGeneralInsights insights={mlInsights} />}
          {activeTab === 'risks' && <MLRiskAnalysis risks={mlInsights.riskAnalysis} />}
          {activeTab === 'predictions' && <MLPredictionsView predictions={mlInsights.predictions} />}
          {activeTab === 'project' && (
            <MLProjectAnalysisView 
              data={data} 
              onSelectProject={predictProject}
              selectedAnalysis={selectedProject}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default MLInsightsModule;
