/**
 * Utilidades para convertir tipos de relación a multiplicidades UML 2.5
 */

export interface Multiplicities {
  sourceMultiplicity: string;
  targetMultiplicity: string;
}

/**
 * Convierte un tipo de relación clásico a multiplicidades UML 2.5
 * @param relationType - Tipo de relación
 * @param customMultiplicity - Multiplicidad personalizada para UML 2.5 (opcional)
 */
export function getMultiplicitiesFromRelationType(
  relationType: string, 
  customMultiplicity?: "1-1" | "1-N" | "N-N"
): Multiplicities {
  switch (relationType) {
    case "1-1":
      return {
        sourceMultiplicity: "1",
        targetMultiplicity: "1",
      };
    
    case "1-N":
      return {
        sourceMultiplicity: "1",
        targetMultiplicity: "*",
      };
    
    case "N-N":
      return {
        sourceMultiplicity: "1",
        targetMultiplicity: "*",
      };
    
    case "FK":
      return {
        sourceMultiplicity: "1",
        targetMultiplicity: "*",
      };
    
    case "ASSOCIATION":
      if (customMultiplicity === "1-1") {
        return {
          sourceMultiplicity: "1",
          targetMultiplicity: "1",
        };
      } else if (customMultiplicity === "1-N") {
        return {
          sourceMultiplicity: "1",
          targetMultiplicity: "*",
        };
      } else if (customMultiplicity === "N-N") {
        return {
          sourceMultiplicity: "*",
          targetMultiplicity: "*",
        };
      }
      return {
        sourceMultiplicity: "1",
        targetMultiplicity: "*",
      };
    
    case "AGGREGATION":
      if (customMultiplicity === "1-1") {
        return {
          sourceMultiplicity: "1",
          targetMultiplicity: "1",
        };
      } else if (customMultiplicity === "1-N") {
        return {
          sourceMultiplicity: "1",
          targetMultiplicity: "*",
        };
      }
      // AGGREGATION no soporta N-N en UML 2.5, usar por defecto 1-N
      return {
        sourceMultiplicity: "1",
        targetMultiplicity: "*",
      };
    
    case "COMPOSITION":
      if (customMultiplicity === "1-1") {
        return {
          sourceMultiplicity: "1",
          targetMultiplicity: "1",
        };
      } else if (customMultiplicity === "1-N") {
        return {
          sourceMultiplicity: "1",
          targetMultiplicity: "1..*",
        };
      }
      // COMPOSITION no soporta N-N en UML 2.5, usar por defecto 1-N
      return {
        sourceMultiplicity: "1",
        targetMultiplicity: "1..*",
      };
    
    case "INHERITANCE":
      return {
        sourceMultiplicity: "",
        targetMultiplicity: "",
      };
    
    case "DEPENDENCY":
    case "REALIZATION":
      return {
        sourceMultiplicity: "",
        targetMultiplicity: "",
      };
    
    default:
      return {
        sourceMultiplicity: "1",
        targetMultiplicity: "*",
      };
  }
}

export function getMultiplicities(edgeData: any): Multiplicities {
  if (edgeData?.sourceMultiplicity && edgeData?.targetMultiplicity) {
    return {
      sourceMultiplicity: edgeData.sourceMultiplicity,
      targetMultiplicity: edgeData.targetMultiplicity,
    };
  }

  const relationType = edgeData?.relationType || "1-N";
  return getMultiplicitiesFromRelationType(relationType);
}
