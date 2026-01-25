/**
 * Estilos para relaciones Crow's Foot (legacy) y UML 2.5
 * 
 * UML 2.5 Markers:
 * - ASSOCIATION: Flecha simple →
 * - AGGREGATION: Rombo blanco ◇→
 * - COMPOSITION: Rombo negro ◆→
 * - INHERITANCE: Triángulo blanco △
 * - DEPENDENCY: Flecha punteada ⇢
 * - REALIZATION: Triángulo punteado △⋯
 */

export const defaultEdgeStyle = {
  stroke: "#00b894",
  strokeWidth: 2,
  type: "smoothstep" as const,
  strokeDasharray: "5 5",
};

export const getEdgeStyle = (type: string) => {
  const baseStyle = {
    strokeWidth: 2,
    type: "smoothstep" as const,
    animated: true,
    strokeDasharray: undefined as string | undefined,
    labelBgPadding: [4, 2] as [number, number],
    labelBgBorderRadius: 4,
    labelBgStyle: { 
      fill: "#1e1e1e", 
      color: "#fff", 
      opacity: 0.85 
    },
  };

  switch (type) {
    // ============ Crow's Foot (legacy) ============
    case "1-1":
      return {
        ...baseStyle,
        stroke: "#74b9ff",
        animated: false,
        strokeDasharray: undefined, // Línea sólida (UML 2.5: asociaciones son sólidas)
        // Sin markerEnd: en UML las asociaciones no tienen flechas, solo multiplicidades
      };
    case "1-N":
      return {
        ...baseStyle,
        stroke: "#00cec9",
        animated: false,
        strokeDasharray: undefined, // Línea sólida (UML 2.5: asociaciones son sólidas)
        // Sin markerEnd: en UML las asociaciones no tienen flechas, solo multiplicidades
      };
    case "N-N":
      return {
        ...baseStyle,
        stroke: "#ff7675",
        strokeWidth: 3,
        animated: false,
        strokeDasharray: undefined, // Línea sólida (UML 2.5: asociaciones son sólidas)
        // Sin markerEnd: en UML las asociaciones no tienen flechas, solo multiplicidades
      };
    case "FK":
      return {
        ...baseStyle,
        stroke: "#00b894",
        animated: false,
        strokeDasharray: undefined, // FK también sólida por defecto
        // Sin markerEnd: línea simple
      };

    // ============ UML 2.5 ============
    case "ASSOCIATION":
      return {
        ...baseStyle,
        stroke: "#9b59b6",  // Púrpura
        strokeWidth: 2,
        animated: false,
        strokeDasharray: undefined,
        // ASOCIACIÓN no lleva flecha, solo línea con multiplicidad
      };
    
    case "AGGREGATION":
      return {
        ...baseStyle,
        stroke: "#3498db",  // Azul
        strokeWidth: 2,
        animated: false,
        strokeDasharray: undefined,
        markerEnd: { type: "arrowclosed", color: "#3498db" },
        style: { 
          markerEnd: "url(#uml-diamond-white)"
        }
      };
    
    case "COMPOSITION":
      return {
        ...baseStyle,
        stroke: "#e74c3c",  // Rojo
        strokeWidth: 2.5,
        animated: false,
        strokeDasharray: undefined,
        markerEnd: { type: "arrowclosed", color: "#e74c3c" },
        style: {
          markerEnd: "url(#uml-diamond-black)"
        }
      };
    
    case "INHERITANCE":
      return {
        ...baseStyle,
        stroke: "#2ecc71",  // Verde
        strokeWidth: 2,
        animated: false,
        strokeDasharray: undefined,
        markerEnd: { type: "arrowclosed", color: "#2ecc71" },
        style: {
          markerEnd: "url(#uml-triangle-white)"
        }
      };
    
    case "DEPENDENCY":
      return {
        ...baseStyle,
        stroke: "#f39c12",  // Naranja
        strokeWidth: 1.5,
        animated: true,
        strokeDasharray: "5 5",
        markerEnd: { type: "arrowclosed", color: "#f39c12" },
      };
    
    case "REALIZATION":
      return {
        ...baseStyle,
        stroke: "#1abc9c",  // Turquesa
        strokeWidth: 1.5,
        animated: true,
        strokeDasharray: "5 5",
        markerEnd: { type: "arrowclosed", color: "#1abc9c" },
        style: {
          markerEnd: "url(#uml-triangle-white)"
        }
      };

    default:
      return {
        ...baseStyle,
        stroke: "#00b894",
        strokeDasharray: "5 5",
      };
  }
};

export const selectedEdgeStyle = {
  stroke: "#667eea",
  strokeWidth: 3,
};

/**
 * SVG Markers para UML 2.5
 * Estos defs deben agregarse al SVG principal de ReactFlow
 */
export const UML_SVG_MARKERS = `
  <!-- Flecha simple UML -->
  <marker
    id="uml-arrow"
    viewBox="0 0 10 10"
    refX="9"
    refY="5"
    markerWidth="6"
    markerHeight="6"
    orient="auto"
  >
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#9b59b6" />
  </marker>

  <!-- Rombo blanco (Aggregation) -->
  <marker
    id="uml-diamond-white"
    viewBox="0 0 20 20"
    refX="10"
    refY="10"
    markerWidth="8"
    markerHeight="8"
    orient="auto"
  >
    <path d="M 0 10 L 10 5 L 20 10 L 10 15 z" fill="white" stroke="#3498db" stroke-width="1.5" />
  </marker>

  <!-- Rombo negro (Composition) -->
  <marker
    id="uml-diamond-black"
    viewBox="0 0 20 20"
    refX="10"
    refY="10"
    markerWidth="8"
    markerHeight="8"
    orient="auto"
  >
    <path d="M 0 10 L 10 5 L 20 10 L 10 15 z" fill="#e74c3c" stroke="#e74c3c" stroke-width="1" />
  </marker>

  <!-- Triángulo blanco (Inheritance/Realization) -->
  <marker
    id="uml-triangle-white"
    viewBox="0 0 10 10"
    refX="9"
    refY="5"
    markerWidth="7"
    markerHeight="7"
    orient="auto"
  >
    <path d="M 0 0 L 10 5 L 0 10 z" fill="white" stroke="#2ecc71" stroke-width="1.5" />
  </marker>

  <!-- Flecha punteada (Dependency) -->
  <marker
    id="uml-arrow-dashed"
    viewBox="0 0 10 10"
    refX="9"
    refY="5"
    markerWidth="6"
    markerHeight="6"
    orient="auto"
  >
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#f39c12" />
  </marker>

  <!-- Crow's Foot (legacy) -->
  <marker
    id="arrow-crows-foot"
    viewBox="0 0 10 10"
    refX="9"
    refY="5"
    markerWidth="5"
    markerHeight="5"
    orient="auto"
  >
    <circle cx="5" cy="5" r="3" fill="currentColor" />
  </marker>
`;
