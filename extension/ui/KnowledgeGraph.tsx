/**
 * Knowledge Graph Visualization Component
 * Displays medication interactions and clinical relationships
 */

import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';

interface GraphNode {
  id: string;
  label: string;
  type: 'medication' | 'condition' | 'symptom' | 'lab' | 'interaction';
  properties?: Record<string, any>;
}

interface GraphEdge {
  source: string;
  target: string;
  type: 'treats' | 'causes' | 'interacts_with' | 'monitors' | 'contraindicated_by';
  polarity?: 'positive' | 'negative' | 'neutral';
  properties?: Record<string, any>;
}

interface KnowledgeGraphProps {
  sessionId: string;
  onUpdate?: (nodes: GraphNode[], edges: GraphEdge[]) => void;
}

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ sessionId, onUpdate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cytoscapeRef = useRef<any>(null);

  // Load graph data
  useEffect(() => {
    loadGraphData();
    
    // Poll for updates every 5 seconds
    const interval = setInterval(loadGraphData, 5000);
    
    return () => clearInterval(interval);
  }, [sessionId]);

  // Initialize Cytoscape when data is ready
  useEffect(() => {
    if (nodes.length === 0 && edges.length === 0) return;
    if (!containerRef.current) return;

    if (cytoscapeRef.current) {
      cytoscapeRef.current.destroy();
    }

    const cy = cytoscape({
        container: containerRef.current,
        elements: buildGraphElements(nodes, edges),
        style: [
          {
            selector: 'node',
            style: {
              'label': 'data(label)',
              'width': 60,
              'height': 60,
              'shape': 'round-rectangle',
              'background-color': 'data(color)',
              'color': '#fff',
              'text-valign': 'center',
              'text-halign': 'center',
              'font-size': '12px',
              'font-weight': 'bold',
              'border-width': 2,
              'border-color': '#333'
            }
          },
          {
            selector: 'node[type="medication"]',
            style: {
              'background-color': '#4A90E2',
              'shape': 'hexagon'
            }
          },
          {
            selector: 'node[type="condition"]',
            style: {
              'background-color': '#E24A4A',
              'shape': 'ellipse'
            }
          },
          {
            selector: 'node[type="symptom"]',
            style: {
              'background-color': '#F5A623',
              'shape': 'triangle'
            }
          },
          {
            selector: 'node[type="lab"]',
            style: {
              'background-color': '#7ED321',
              'shape': 'diamond'
            }
          },
          {
            selector: 'node[type="interaction"]',
            style: {
              'background-color': '#BD10E0',
              'shape': 'star'
            }
          },
          {
            selector: 'edge',
            style: {
              'width': 3,
              'line-color': 'data(color)',
              'target-arrow-color': 'data(color)',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'label': 'data(label)',
              'font-size': '10px',
              'text-rotation': 'autorotate',
              'text-margin-y': -10,
              'opacity': 0.8
            }
          },
          {
            selector: 'edge[polarity="positive"]',
            style: {
              'line-color': '#7ED321',
              'target-arrow-color': '#7ED321'
            }
          },
          {
            selector: 'edge[polarity="negative"]',
            style: {
              'line-color': '#E24A4A',
              'target-arrow-color': '#E24A4A',
              'line-style': 'dashed'
            }
          },
          {
            selector: 'edge[polarity="neutral"]',
            style: {
              'line-color': '#9B9B9B',
              'target-arrow-color': '#9B9B9B'
            }
          }
        ],
        layout: {
          name: 'cose',
          animate: true,
          animationDuration: 1000,
          animationEasing: 'ease-in-out-cubic',
          idealEdgeLength: 100,
          nodeOverlap: 20,
          refresh: 20,
          fit: true,
          padding: 30,
          randomize: false,
          componentSpacing: 100,
          nodeRepulsion: 400000000,
          edgeElasticity: 100,
          nestingFactor: 5,
          gravity: 80,
          numIter: 1000,
          initialTemp: 200,
          coolingFactor: 0.95,
          minTemp: 1.0
        }
      });

    // Add smooth hover animations for nodes
    cy.on('mouseover', 'node', (event: any) => {
      event.target.animate({
        style: {
          'width': 70,
          'height': 70,
          'border-width': 3
        }
      }, {
        duration: 300,
        easing: 'ease-in-out-cubic'
      });
    });

    cy.on('mouseout', 'node', (event: any) => {
      event.target.animate({
        style: {
          'width': 60,
          'height': 60,
          'border-width': 2
        }
      }, {
        duration: 300,
        easing: 'ease-in-out-cubic'
      });
    });

    // Add smooth hover animations for edges
    cy.on('mouseover', 'edge', (event: any) => {
      event.target.animate({
        style: {
          'width': 5,
          'opacity': 1
        }
      }, {
        duration: 200
      });
    });

    cy.on('mouseout', 'edge', (event: any) => {
      event.target.animate({
        style: {
          'width': 3,
          'opacity': 0.8
        }
      }, {
        duration: 200
      });
    });

    cytoscapeRef.current = cy;

    // Notify parent of update
    if (onUpdate) {
      onUpdate(nodes, edges);
    }

    return () => {
      if (cytoscapeRef.current) {
        cytoscapeRef.current.destroy();
        cytoscapeRef.current = null;
      }
    };
  }, [nodes, edges, onUpdate]);

  const loadGraphData = async () => {
    try {
      setIsLoading(true);
      console.log('[KnowledgeGraph] Loading graph data for session:', sessionId);
      const response = await fetch(`http://localhost:3000/api/medications/graph/${sessionId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load graph: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[KnowledgeGraph] Graph data received:', { 
        nodeCount: data.nodes?.length || 0, 
        edgeCount: data.edges?.length || 0,
        nodes: data.nodes,
        edges: data.edges
      });
      
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
      setError(null);
    } catch (err: any) {
      console.error('[KnowledgeGraph] Error loading graph data:', err);
      setError(err.message || 'Failed to load graph data');
    } finally {
      setIsLoading(false);
    }
  };

  const buildGraphElements = (nodes: GraphNode[], edges: GraphEdge[]) => {
    const elements: any[] = [];

    // Add nodes
    nodes.forEach(node => {
      elements.push({
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
          color: getNodeColor(node.type),
          ...node.properties
        }
      });
    });

    // Add edges
    edges.forEach((edge, index) => {
      elements.push({
        data: {
          id: `edge-${index}`,
          source: edge.source,
          target: edge.target,
          label: getEdgeLabel(edge.type),
          type: edge.type,
          polarity: edge.polarity || 'neutral',
          color: getEdgeColor(edge.polarity || 'neutral'),
          ...edge.properties
        }
      });
    });

    return elements;
  };

  const getNodeColor = (type: string): string => {
    const colors: Record<string, string> = {
      medication: '#4A90E2',
      condition: '#E24A4A',
      symptom: '#F5A623',
      lab: '#7ED321',
      interaction: '#BD10E0'
    };
    return colors[type] || '#9B9B9B';
  };

  const getEdgeColor = (polarity: string): string => {
    const colors: Record<string, string> = {
      positive: '#7ED321',
      negative: '#E24A4A',
      neutral: '#9B9B9B'
    };
    return colors[polarity] || '#9B9B9B';
  };

  const getEdgeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      treats: 'treats',
      causes: 'causes',
      interacts_with: 'interacts',
      monitors: 'monitors',
      contraindicated_by: 'contraindicated'
    };
    return labels[type] || type;
  };

  if (isLoading && nodes.length === 0) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center',
        color: '#666'
      }}>
        <div>Loading knowledge graph...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center',
        color: '#E24A4A'
      }}>
        <div>Error: {error}</div>
        <button 
          onClick={loadGraphData}
          style={{
            marginTop: '10px',
            padding: '8px 16px',
            backgroundColor: '#4A90E2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center',
        color: '#666'
      }}>
        <div>No medication data available yet.</div>
        <div style={{ fontSize: '12px', marginTop: '8px' }}>
          Confirm a medication to see interactions on the graph.
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div 
        ref={containerRef}
        style={{
          width: '100%',
          height: '600px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          position: 'relative'
        }}
      />
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div><strong>Nodes:</strong> {nodes.length} | <strong>Edges:</strong> {edges.length}</div>
      </div>
    </div>
  );
};

