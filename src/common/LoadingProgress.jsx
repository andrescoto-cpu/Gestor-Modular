import React from 'react';

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
          {/* Circular progress indicator */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle cx="50" cy="50" r="45" stroke="#E5E7EB" strokeWidth="6" fill="none" />
              {/* Progress circle */}
              <circle
                cx="50" cy="50" r="45" stroke="#3B82F6" strokeWidth="6" fill="none"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                strokeLinecap="round" className="transition-all duration-300"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-gray-800">{Math.round(progress)}%</span>
            </div>
          </div>
          
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Cargando datos</h3>
          <p className="text-gray-600">{displayMessage}</p>
          
          {/* Progress bar */}
          <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingProgress;