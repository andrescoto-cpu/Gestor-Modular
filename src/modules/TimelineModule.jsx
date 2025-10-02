import React, { useMemo, useState } from 'react';
import { STATE_CATEGORIES, stateColors } from '../utils/constants';
import { isValidEpic } from '../utils/dataProcessing';
import { JiraLink } from '../common/TicketViewer';

const TimelineModule = ({ data, timelineFilter }) => {
  const [expandedEpics, setExpandedEpics] = useState(new Set());

  // Calculate date range: either from filter or default 6 months back + 3 months forward
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

  // Process épicas timeline data
  const epicTimeline = useMemo(() => {
    const epicData = {};
    
    data.forEach(item => {
      if (!isValidEpic(item.epic)) return;
      
      // Get all relevant dates for this item
      const itemDates = [
        item.startDate, item.endDate, item.uatStart, 
        item.uatEnd, item.prodDate, item.regulatoryDate
      ].filter(Boolean);
      
      if (itemDates.length === 0) return;
      
      if (!epicData[item.epic]) {
        epicData[item.epic] = {
          epic: item.epic, items: [], startDate: null, endDate: null,
          totalItems: 0, completedItems: 0
        };
      }
      
      epicData[item.epic].items.push(item);
      epicData[item.epic].totalItems++;
      
      if (STATE_CATEGORIES.finalizados.includes(item.state)) {
        epicData[item.epic].completedItems++;
      }
      
      // Calculate epic date range
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

  // Generate months header
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

  // Calculate bar position and width for timeline
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

  // Render ticket phases (DEV, UAT, PROD, REG)
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
              Vista cronológica detallada con fases de desarrollo ({monthsHeader.length} meses)
            </p>
          </div>
          {/* Phase legend */}
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

        {/* Timeline header with months */}
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

        {/* Timeline content */}
        <div className="space-y-1 max-h-[70vh] overflow-y-auto">
          {epicTimeline.map((epic, epicIndex) => {
            const isExpanded = expandedEpics.has(epic.epic);
            const { left, width } = calculateBarPosition(epic.startDate, epic.endDate);
            
            return (
              <div key={epicIndex} className="border border-gray-200 rounded-lg">
                {/* Epic header row */}
                <div 
                  className="relative h-12 hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleEpic(epic.epic)}
                >
                  {/* Epic name column */}
                  <div className="absolute left-0 top-0 h-full w-80 flex items-center px-4 text-sm font-medium text-gray-800 border-r border-gray-200 bg-white">
                    <div className="flex items-center space-x-2 w-full">
                      <span 
                        className="transform transition-transform duration-200" 
                        style={{transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'}}
                      >
                        ▶
                      </span>
                      <div className="flex-1 truncate" title={epic.epic}>
                        <span className="font-semibold">{epic.epic}</span>
                        <span className="ml-2 text-xs text-gray-500">({epic.totalItems} tickets)</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Epic timeline bar */}
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

                {/* Expanded tickets view */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    {epic.items.map((ticket, ticketIndex) => {
                      const phases = renderTicketPhases(ticket);
                      if (phases.length === 0) return null;
                      
                      return (
                        <div key={ticketIndex} className="relative min-h-16 border-b border-gray-100 last:border-b-0 py-2">
                          {/* Ticket info column */}
                          <div className="absolute left-0 top-0 h-full w-80 flex flex-col justify-center px-8 text-xs text-gray-700 border-r border-gray-200">
                            <div className="flex items-center space-x-2 mb-1">
                              <JiraLink 
                                ticketKey={ticket.key} 
                                className="font-medium hover:text-blue-600"
                              >
                                {ticket.key}
                              </JiraLink>
                              <span 
                                className="text-xs px-2 py-1 rounded text-white" 
                                style={{backgroundColor: stateColors[ticket.state] || stateColors.default}}
                              >
                                {ticket.state}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 leading-tight">
                              {ticket.summary || 'Sin resumen disponible'}
                            </div>
                          </div>
                          
                          {/* Ticket phases timeline */}
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

        {/* Footer stats */}
        <div className="mt-6 text-sm text-gray-600 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span>
              <span className="font-semibold">{epicTimeline.length}</span> épicas en el período
              ({dateRange.start.toLocaleDateString('es-ES')} - {dateRange.end.toLocaleDateString('es-ES')})
            </span>
            <span className="text-xs text-gray-500">
              Haz clic en una épica para ver sus tickets y fases detalladas
            </span>
          </div>
        </div>

        {/* Empty state */}
        {epicTimeline.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-lg font-medium">No hay datos de timeline disponibles</p>
            <p className="text-sm mt-1">Los proyectos necesitan fechas válidas para aparecer en el timeline</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelineModule;
