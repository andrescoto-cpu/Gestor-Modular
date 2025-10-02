import React, { useMemo, useState } from 'react';
import { Users, Activity, ArrowLeft } from 'lucide-react';
import { STATE_CATEGORIES } from '../utils/constants';
import TicketViewer from '../common/TicketViewer';

const RecursosModule = ({ data }) => {
  const [selectedResource, setSelectedResource] = useState(null);

  // Dual priority methodology: Dev Responsible > Assigned Person
  const getAssignedResource = (item) => {
    if (item.devResponsible && item.devResponsible.trim() !== '' && item.devResponsible !== '#N/A') {
      return { name: item.devResponsible.trim(), type: 'Dev', priority: 1 };
    }
    
    if (item.assignee && item.assignee.trim() !== '' && item.assignee !== '#N/A') {
      return { name: item.assignee.trim(), type: 'Assigned', priority: 2 };
    }
    
    return null;
  };

  const resourceAnalysis = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return {
        resources: [], unassignedItems: [],
        teamMetrics: { totalResources: 0, totalAssignedItems: 0, unassignedItems: 0, avgThroughput: 0 }
      };
    }

    const resourceStats = {};
    const unassignedItems = [];
    
    data.forEach(item => {
      const resource = getAssignedResource(item);
      
      if (!resource) {
        unassignedItems.push(item);
        return;
      }
      
      if (!resourceStats[resource.name]) {
        resourceStats[resource.name] = {
          name: resource.name, type: resource.type, totalItems: 0,
          finalizados: 0, enProceso: 0, atrasados: 0, throughput: 0, items: []
        };
      }
      
      const stats = resourceStats[resource.name];
      stats.totalItems++;
      stats.items.push(item);
      
      if (STATE_CATEGORIES.finalizados.includes(item.state)) {
        stats.finalizados++;
      } else if (STATE_CATEGORIES.enProceso.includes(item.state)) {
        stats.enProceso++;
      }
      
      // Check for overdue items
      const today = new Date();
      if (item.endDate && item.endDate < today && !STATE_CATEGORIES.finalizados.includes(item.state)) {
        stats.atrasados++;
      }
    });

    // Calculate throughput for each resource
    Object.values(resourceStats).forEach(stats => {
      stats.throughput = stats.totalItems > 0 ? Math.round((stats.finalizados / stats.totalItems) * 100) : 0;
    });

    const resourceList = Object.values(resourceStats).sort((a, b) => b.totalItems - a.totalItems);
    
    const teamMetrics = {
      totalResources: resourceList.length,
      totalAssignedItems: data.length - unassignedItems.length,
      unassignedItems: unassignedItems.length,
      avgThroughput: resourceList.length > 0 ? Math.round(resourceList.reduce((acc, r) => acc + r.throughput, 0) / resourceList.length) : 0
    };

    return { resources: resourceList, unassignedItems, teamMetrics };
  }, [data]);

  // Individual resource detailed view
  if (selectedResource) {
    const resource = resourceAnalysis.resources.find(r => r.name === selectedResource);
    if (!resource) return null;

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">{resource.name}</h2>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  resource.type === 'Dev' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {resource.type === 'Dev' ? 'Responsable Dev' : 'Persona Asignada'}
                </span>
                <span>{resource.totalItems} proyectos</span>
                <span className="text-green-600">{resource.throughput}% throughput</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedResource(null)}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Volver</span>
            </button>
          </div>

          <TicketViewer
            tickets={resource.items}
            title={`Proyectos asignados a ${resource.name}`}
            emptyMessage="No hay proyectos asignados"
            borderColor="border-blue-500"
            bgColor="bg-blue-50"
          />
        </div>
      </div>
    );
  }

  // Main resources overview
  return (
    <div className="space-y-4">
      {/* Methodology explanation */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-4">
        <div className="flex items-start space-x-3">
          <Activity className="h-6 w-6 text-blue-600 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-800 mb-2">Metodología de Asignación de Recursos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-white/70 rounded-lg p-3 border border-blue-100">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                  <span className="font-semibold text-purple-700">Prioridad 1: Responsable Dev</span>
                </div>
                <p className="text-gray-700 text-xs">
                  Se asigna como <strong>Dev</strong> cuando existe un responsable de desarrollo definido
                </p>
                <div className="mt-1 text-xs text-purple-600">
                  {resourceAnalysis.resources.filter(r => r.type === 'Dev').length} recursos clasificados
                </div>
              </div>
              <div className="bg-white/70 rounded-lg p-3 border border-blue-100">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                  <span className="font-semibold text-blue-700">Prioridad 2: Persona Asignada</span>
                </div>
                <p className="text-gray-700 text-xs">
                  Se asigna como <strong>Assigned</strong> cuando no hay responsable dev (fallback)
                </p>
                <div className="mt-1 text-xs text-blue-600">
                  {resourceAnalysis.resources.filter(r => r.type === 'Assigned').length} recursos clasificados
                </div>
              </div>
            </div>
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <strong>Clasificación Automática:</strong> {resourceAnalysis.teamMetrics.totalResources} recursos procesados, 
              {resourceAnalysis.teamMetrics.unassignedItems} elementos sin asignar requieren ownership
            </div>
          </div>
        </div>
      </div>

      {/* Team metrics overview */}
      <div className="bg-white rounded-lg shadow-lg p-4">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Análisis de Utilización de Recursos</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-blue-800">{resourceAnalysis.teamMetrics.totalResources}</div>
                <div className="text-xs text-blue-600">Recursos Activos</div>
              </div>
              <Users className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 border-l-4 border-green-500">
            <div className="text-lg font-bold text-green-800">{resourceAnalysis.teamMetrics.totalAssignedItems}</div>
            <div className="text-xs text-green-600">Items Asignados</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 border-l-4 border-yellow-500">
            <div className="text-lg font-bold text-yellow-800">{resourceAnalysis.teamMetrics.unassignedItems}</div>
            <div className="text-xs text-yellow-600">Sin Asignar</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 border-l-4 border-purple-500">
            <div className="text-lg font-bold text-purple-800">{resourceAnalysis.teamMetrics.avgThroughput}%</div>
            <div className="text-xs text-purple-600">Throughput Promedio</div>
          </div>
        </div>

        {/* Resources list */}
        {resourceAnalysis.resources.length > 0 ? (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {resourceAnalysis.resources.map((resource, index) => (
              <div 
                key={index} 
                className="bg-gray-50 rounded-lg p-4 border border-gray-200 cursor-pointer hover:shadow-md transition-all hover:bg-gray-100"
                onClick={() => setSelectedResource(resource.name)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">{resource.name}</h4>
                    <div className="flex items-center space-x-3 text-sm text-gray-600">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        resource.type === 'Dev' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {resource.type === 'Dev' ? 'Responsable Dev' : 'Persona Asignada'}
                      </span>
                      <span>{resource.totalItems} proyectos</span>
                      {resource.atrasados > 0 && (
                        <span className="text-red-600 font-medium">{resource.atrasados} atrasados</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      resource.throughput >= 80 ? 'text-green-600' :
                      resource.throughput >= 60 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {resource.throughput}%
                    </div>
                    <div className="text-xs text-gray-600">Throughput</div>
                  </div>
                </div>

                {/* Resource metrics bar */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-sm font-bold text-green-600">{resource.finalizados}</div>
                    <div className="text-xs text-gray-600">Completados</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-blue-600">{resource.enProceso}</div>
                    <div className="text-xs text-gray-600">En Proceso</div>
                  </div>
                  <div>
                    <div className={`text-sm font-bold ${resource.atrasados > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {resource.atrasados}
                    </div>
                    <div className="text-xs text-gray-600">Atrasados</div>
                  </div>
                </div>

                {/* Workload indicator */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Carga de trabajo</span>
                    <span>{resource.totalItems} total</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="flex h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-green-500" 
                        style={{ width: `${(resource.finalizados / resource.totalItems) * 100}%` }}
                      ></div>
                      <div 
                        className="bg-blue-500" 
                        style={{ width: `${(resource.enProceso / resource.totalItems) * 100}%` }}
                      ></div>
                      <div 
                        className="bg-red-500" 
                        style={{ width: `${(resource.atrasados / resource.totalItems) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p>No se encontraron recursos asignados</p>
            <p className="text-sm mt-1">Verifica que los datos contengan información de asignación</p>
          </div>
        )}

        {/* Unassigned items warning */}
        {resourceAnalysis.teamMetrics.unassignedItems > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                {resourceAnalysis.teamMetrics.unassignedItems} elementos sin asignar requieren atención
              </span>
            </div>
          </div>
        )}

        <div className="mt-4 text-xs text-gray-600 text-center">
          Haz clic en cualquier recurso para ver el detalle completo de sus proyectos
        </div>
      </div>
    </div>
  );
};

export default RecursosModule;
