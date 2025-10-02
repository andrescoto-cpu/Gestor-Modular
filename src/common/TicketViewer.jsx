import React from 'react';
import { stateColors, countryNames } from '../utils/constants';

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

export { JiraLink };
export default TicketViewer;
