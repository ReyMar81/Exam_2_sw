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
    strokeDasharray: "5 5",
    labelBgPadding: [4, 2] as [number, number],
    labelBgBorderRadius: 4,
    labelBgStyle: { 
      fill: "#1e1e1e", 
      color: "#fff", 
      opacity: 0.85 
    },
  };

  switch (type) {
    case "1-1":
      return {
        ...baseStyle,
        stroke: "#74b9ff",
        animated: true,
        strokeDasharray: "5 5",
      };
    case "1-N":
      return {
        ...baseStyle,
        stroke: "#00cec9",
        animated: true,
        strokeDasharray: "5 5",
      };
    case "N-N":
      return {
        ...baseStyle,
        stroke: "#ff7675",
        strokeWidth: 3,
        animated: true,
        strokeDasharray: "8 4",
      };
    case "FK":
      return {
        ...baseStyle,
        stroke: "#00b894",
        animated: true,
        strokeDasharray: "5 5",
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
