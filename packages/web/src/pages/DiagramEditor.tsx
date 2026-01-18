import React, { useEffect, useCallback, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import ReactFlow, {
  addEdge,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  NodeChange,
  EdgeChange,
} from "reactflow";
import "reactflow/dist/style.css";
import { getSocket, disconnectSocket } from "../socketManager";
import { useAppStore } from "../store/useAppStore";
import { api } from "../api";
import TableNode from "../components/TableNode";
import { Sidebar } from "../components/Sidebar";
import PropertiesPanel from "../components/PropertiesPanel";
import DownloadButton from "../components/DownloadButton";
import { generateSQL, downloadSQL } from "../utils/sqlGenerator";
import { generateSpringBootProject, downloadSpringBootProject } from "../utils/springBootGenerator";
import { generateFlutterProject, downloadFlutterProject } from "../utils/flutterGenerator";
import { determinePKFK, createFKField } from "../utils/relationHandler";
import { getEdgeStyle, UML_SVG_MARKERS } from "../utils/relationStyles";
import UmlMultiplicityEdge from "../components/edges/UmlMultiplicityEdge";
import { getMultiplicitiesFromRelationType } from "../utils/multiplicityHelper";
import { AIPromptBar } from "../components/AIPromptBar";

function throttle<T extends (...args: any[]) => any>(func: T, delay: number): T {
  let timeout: NodeJS.Timeout | null = null;
  return ((...args: Parameters<T>) => {
    if (!timeout) {
      timeout = setTimeout(() => {
        func(...args);
        timeout = null;
      }, delay);
    }
  }) as T;
}

export default function DiagramEditor() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, project, setProject } = useAppStore();
  const [isConnected, setConnected] = useState(false);
  const [userRole, setUserRole] = useState<string>("VIEWER");
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);

  const isViewer = userRole === "VIEWER";
  const isGuest = user?.id?.startsWith("guest_");
  const inviteToken = searchParams.get("fromInvite");

  // Obtener socket desde el manager (solo se crea si hay usuario)
  const socket = getSocket(user);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);

  // Tipos de nodos personalizados
  const nodeTypes = { 
    table: TableNode
  };

  // Tipos de edges personalizados para notación UML 2.5
  const edgeTypes = React.useMemo(
    () => ({
      umlMultiplicity: UmlMultiplicityEdge,
    }),
    []
  );

  // Obtener lista de nombres de tablas para el dropdown de FK
  const availableTables = nodes
    .map(n => n.data.name || n.data.label || "Sin nombre");

  // Load project if not in store (e.g., direct URL access or F5 refresh)
  useEffect(() => {
    if (!user) {
      console.error("🚨 Sin usuario, redirigiendo");
      navigate("/");
      return;
    }

    if (!project || project.id !== projectId) {
      api
        .get(`/api/projects/${user.id}`)
        .then((res) => {
          const foundProject = res.data.find((p: any) => p.id === projectId);
          if (!foundProject) {
            console.error("❌ Proyecto no encontrado");
            navigate("/dashboard");
          } else {
            setProject(foundProject);
            return api.get(`/api/projects/role/${projectId}?userId=${user.id}`);
          }
        })
        .then((roleRes) => {
          if (roleRes) {
            const realRole = roleRes.data.role || "VIEWER";
            setUserRole(realRole);
          }
        })
        .catch((err) => {
          console.error("❌ Error cargando proyecto:", err);
          navigate("/dashboard");
        });
    } else {
      api.get(`/api/projects/role/${projectId}?userId=${user.id}`)
        .then((roleRes) => {
          const realRole = roleRes.data.role || "VIEWER";
          setUserRole(realRole);
        })
        .catch((err) => {
          console.error("❌ Error verificando rol:", err);
        });
    }
  }, [projectId, user, project, navigate, setProject]);

  // 🔄 Cargar diagrama inicial desde BD
  useEffect(() => {
    if (project?.id) {
      fetch(`/api/diagrams/single/${project.id}`)
        .then((res) => res.json())
        .then((d) => {
          if (d?.data) {
            const loadedNodes = d.data.nodes || [];
            const loadedEdges = d.data.edges || [];
            
            setNodes(loadedNodes);
            setEdges(loadedEdges);
            
            if (loadedNodes.length > 0) {
              const reconstructedEdges: any[] = [];
              
              loadedNodes.forEach((node: any) => {
                if (node.data?.isJunctionTable) {
                  console.log(`⏭️  [Editor] Skipping edge reconstruction from junction table: ${node.data.name}`);
                  return;
                }
                
                const fields = node.data?.fields || [];
                
                fields.forEach((field: any) => {
                  // 🚫 No reconstruir edges que pertenezcan a relaciones N-N
                  if (field.relationType === "N-N") {
                    return;
                  }
                  
                  // Si el field es FK y tiene references + referencesField
                  if (field.isForeign && field.references && field.referencesField) {
                    // Encontrar el nodo referenciado primero
                    const targetNode = loadedNodes.find((n: any) => 
                      n.data.name === field.references || n.data.label === field.references
                    );
                    
                    if (!targetNode) return;
                    
                    // Buscar si ya existe UN EDGE entre estos dos nodos (en cualquier dirección)
                    const existingEdge = loadedEdges.find((e: any) => 
                      (e.source === targetNode.id && e.target === node.id) ||
                      (e.source === node.id && e.target === targetNode.id)
                    );
                    
                    if (!existingEdge) {
                      console.log(`🔧 [Editor] Reconstructing missing edge: ${targetNode.data.name}.${field.referencesField} → ${node.data.name}.${field.name}`);
                      
                      // Obtener estilo según tipo de relación
                        const edgeStyle = getEdgeStyle(field.relationType || "1-N");
                        
                        // 🆕 UML 2.5: Obtener multiplicidades para los extremos
                        const multiplicities = getMultiplicitiesFromRelationType(field.relationType || "1-N");
                        
                      const reconstructedEdge: any = {
                        id: `edge-${targetNode.id}-${node.id}-${field.name}`,
                        source: targetNode.id,  // Tabla con PK
                        target: node.id,        // Tabla con FK
                        type: "umlMultiplicity", // 🆕 Usar edge personalizado con multiplicidades
                        animated: edgeStyle.animated,
                        style: { 
                          stroke: edgeStyle.stroke, 
                          strokeWidth: edgeStyle.strokeWidth,
                          strokeDasharray: edgeStyle.strokeDasharray,
                          // Agregar markerEnd desde el style si existe (para UML markers personalizados)
                          ...(edgeStyle.style || {})
                        },
                        markerEnd: typeof edgeStyle.markerEnd === 'object' ? {
                          type: (edgeStyle.markerEnd as any).type,
                          color: (edgeStyle.markerEnd as any).color,
                          width: 20,
                          height: 20
                        } : (field.relationType === "1-N" || field.relationType === "ASSOCIATION" ? {
                          type: 'arrowclosed',
                          color: edgeStyle.stroke
                        } : undefined),
                        data: {
                          sourceField: field.referencesField,  // Campo PK
                          targetField: field.name,             // Campo FK
                          relationType: field.relationType || "1-N",
                          sourceMultiplicity: multiplicities.sourceMultiplicity, // 🆕 Multiplicidad en extremo source
                          targetMultiplicity: multiplicities.targetMultiplicity  // 🆕 Multiplicidad en extremo target
                        }
                      };
                      
                      reconstructedEdges.push(reconstructedEdge);
                    }
                  }
                });
              });
              
              if (reconstructedEdges.length > 0) {
                console.log(`✨ [Editor] Reconstructed ${reconstructedEdges.length} missing edges from field references`);
                setEdges((prev: any[]) => [...prev, ...reconstructedEdges]);
              }
            }
          }
        })
        .catch((err) => {
          console.error("❌ [Editor] Failed to load diagram:", err);
        });
    }
  }, [project?.id, setNodes, setEdges]);

  // 🔌 Unirse a proyecto y configurar WebSocket
  useEffect(() => {
    if (!user || !project || !socket) return;

    console.log("🎨 Uniéndose al proyecto", project.id);
    
    // Enviar info completa del usuario para presencia (sin rol, el backend lo obtiene de DB)
    socket.emit("join-project", { 
      userId: user.id, 
      projectId: project.id,
      name: user.name
    });

    const onConnect = () => {
      setConnected(true);
    };

    const onDisconnect = () => {
      setConnected(false);
    };

    const onPresenceUpdate = (users: any[]) => {
      setOnlineUsers(users);
      
      // Actualizar rol del usuario actual basado en presencia
      const currentUserData = users?.find((u: any) => u.userId === user.id);
      if (currentUserData && currentUserData.role !== userRole) {
        console.log("🔄 [Editor] Updating user role from", userRole, "to", currentUserData.role);
        setUserRole(currentUserData.role);
      }
    };

    const onWarning = (data: any) => {
      alert(data.message);
    };

    const onError = (data: any) => {
      alert("Error: " + data.message);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("presence-update", onPresenceUpdate);
    socket.on("warning", onWarning);
    socket.on("error", onError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("presence-update", onPresenceUpdate);
      socket.off("warning", onWarning);
      socket.off("error", onError);
    };
  }, [user, project, socket]);

  useEffect(() => {
    if (!user || !project || !socket) return;

    const interval = setInterval(() => {
      socket.emit("ping-diagram", { projectId: project.id, userId: user.id });
    }, 30000);

    return () => clearInterval(interval);
  }, [user, project, socket]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (project && user && socket) {
        socket.emit("leave-project", { projectId: project.id, userId: user.id });
        disconnectSocket();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    
    return () => {
      handleBeforeUnload();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [project, user, socket]);

  // 🎧 Escuchar actualizaciones en tiempo real (cambios incrementales)
  useEffect(() => {
    const onDiagramUpdate = ({ action, payload }: any) => {
      try {
        console.log("📡 [Editor] Received diagram-update:", action, payload);

        switch (action) {
          case "ADD_NODE":
            setNodes((nds) => {
              // Evitar duplicados
              if (nds.find((n) => n.id === payload.id)) {
                console.warn("⚠️ [Editor] Node already exists, skipping:", payload.id);
                return nds;
              }
              console.log("➕ [Editor] Adding node:", payload.id);
              return [...nds, payload];
            });
            break;

          case "DELETE_NODE":
            setNodes((nds) => {
              console.log("🗑️ [Editor] Deleting node:", payload.id);
              return nds.filter((n) => n.id !== payload.id);
            });
            break;

          case "UPDATE_NODE":
          case "MOVE_NODE":
            setNodes((nds) => {
              console.log("✏️ [Editor] Updating node:", payload.id);
              return nds.map((n) => {
                if (n.id === payload.id) {
                  // Si hay data en el payload, actualizar data también
                  if (payload.data) {
                    return { ...n, data: { ...n.data, ...payload.data }, ...payload };
                  }
                  return { ...n, ...payload };
                }
                return n;
              });
            });
            break;

          case "ADD_EDGE":
            setEdges((eds) => {
              // Verificar duplicados por ID o por source/target/tipo
              const isDuplicate = eds.find((e) => 
                e.id === payload.id ||
                (e.source === payload.source && 
                 e.target === payload.target && 
                 e.data?.relationType === payload.data?.relationType)
              );
              
              if (isDuplicate) {
                console.warn("⚠️ [Editor] Edge already exists, skipping:", payload.id);
                return eds;
              }
              console.log("🔗 [Editor] Adding edge from socket:", payload.id);
              return [...eds, payload];
            });
            break;

          case "DELETE_EDGE":
            setEdges((eds) => {
              console.log("✂️ [Editor] Deleting edge:", payload.id);
              return eds.filter((e) => e.id !== payload.id);
            });
            break;

          case "SYNC_EDGES":
            console.log("🔗 [Editor] Syncing edges:", payload.edges?.length || 0);
            setEdges(payload.edges || []);
            break;

          default:
            console.warn("⚠️ [Editor] Unknown action:", action);
        }
      } catch (err) {
        console.error("❌ [Editor] Error handling diagram-update:", err);
      }
    };

    socket.on("diagram-update", onDiagramUpdate);

    return () => {
      socket.off("diagram-update", onDiagramUpdate);
    };
  }, [setNodes, setEdges]);

  // Validación temprana (después de los hooks)
  if (!user || !project) {
    return (
      <div style={{ 
        color: "#fff", 
        padding: 16, 
        background: "#1e1e2f", 
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        🔄 Cargando editor...
      </div>
    );
  }

  // ➕ Agregar nodo tipo tabla ER
  const addNode = useCallback(() => {
    if (userRole === "VIEWER" || isGuest) {
      alert("Modo solo lectura - Inicia sesión para editar");
      return;
    }

    const id = `node-${Date.now()}`;
    const newNode: Node = {
      id,
      type: "table",
      position: { x: Math.random() * 400, y: Math.random() * 300 },
      data: { 
        name: `Tabla${nodes.length + 1}`,
        label: `Tabla${nodes.length + 1}`,
        fields: [
          {
            id: Date.now() + 1,
            name: "id",
            type: "INT",
            isPrimary: true,
            isForeign: false,
            nullable: false,
          }
        ]
      },
    };

    setNodes((nds: Node[]) => [...nds, newNode]);

    socket.emit("diagram-change", {
      projectId: project.id,
      action: "ADD_NODE",
      payload: newNode,
    });
  }, [userRole, isGuest, project, nodes, setNodes, socket]);

  // 📝 Manejar actualización de nodo desde PropertiesPanel
  const handleNodeUpdate = useCallback((nodeId: string, updatedData: any) => {
    setNodes((nds: Node[]) =>
      nds.map((n: Node) =>
        n.id === nodeId 
          ? { ...n, data: { ...n.data, ...updatedData } } 
          : n
      )
    );

    // Sincronizar con otros usuarios (sin throttle, PropertiesPanel ya controla)
    socket.emit("diagram-change", {
      projectId: project.id,
      action: "UPDATE_NODE",
      payload: { 
        id: nodeId, 
        data: updatedData 
      },
    });
  }, [project, setNodes, socket]);

  // 🎯 Detectar cuando se suelta un nodo (al final del drag)
  const onNodeDragStop = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (userRole === "VIEWER") return;

      setNodes((nds: Node[]) =>
        nds.map((n: Node) =>
          n.id === node.id ? { ...n, position: node.position } : n
        )
      );

      // Emitir movimiento al servidor y otros clientes
      socket.emit("diagram-change", {
        projectId: project.id,
        action: "MOVE_NODE",
        payload: { 
          id: node.id, 
          position: node.position 
        },
      });
    },
    [userRole, project, setNodes, socket]
  );

  // 🎯 Manejar cambios de nodos (incluye selección)
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      
      // Detectar selección
      changes.forEach((change) => {
        if (change.type === 'select' && 'selected' in change) {
          if (change.selected) {
            setSelectedNode(change.id);
          }
        }
      });
    },
    [onNodesChange]
  );

  // 🔗 Manejar cambios de edges
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
    },
    [onEdgesChange]
  );

  // 🔗 Manejar nueva conexión entre tablas
  const handleConnect = useCallback(
    async (connection: Connection) => {
      if (userRole === "VIEWER") {
        alert("No tienes permisos para editar este proyecto (VIEWER)");
        return;
      }

      // Importar dinámicamente la función de modal
      const { askRelationType } = await import("../utils/relationPrompt");
      const relationConfig = await askRelationType();

      if (!relationConfig) return; // Cancelado

      const relationType = relationConfig.type;
      const multiplicity = relationConfig.multiplicity;
      
      const sourceNode = nodes.find(n => n.id === connection.source);
      const targetNode = nodes.find(n => n.id === connection.target);
      
      if (!sourceNode || !targetNode) {
        console.error("❌ Nodos no encontrados");
        return;
      }

      if (relationType === "N-N") {
        const sourceTableName = sourceNode.data.name || sourceNode.data.label || "tabla1";
        const targetTableName = targetNode.data.name || targetNode.data.label || "tabla2";
        
        const sourcePK = sourceNode.data.fields.find((f: any) => f.isPrimary);
        const targetPK = targetNode.data.fields.find((f: any) => f.isPrimary);
        const sourcePKName = sourcePK?.name || "id";
        const targetPKName = targetPK?.name || "id";
        
        const joinTableId = `join-${Date.now()}`;
        const joinTableNode: Node = {
          id: joinTableId,
          type: "table",
          position: { 
            x: (sourceNode.position.x + targetNode.position.x) / 2, 
            y: (sourceNode.position.y + targetNode.position.y) / 2 + 80
          },
          data: {
            name: `${sourceTableName}_${targetTableName}`,
            label: `${sourceTableName}_${targetTableName}`,
            isJunctionTable: true,
            fields: [
              { 
                id: Date.now() + 1, 
                name: `${sourceTableName}_${sourcePKName}`,
                type: sourcePK?.type || "INT", 
                isForeign: true, 
                nullable: false,
                references: sourceTableName,
                referencesField: sourcePKName,
                relationType: "N-N"
              },
              { 
                id: Date.now() + 2, 
                name: `${targetTableName}_${targetPKName}`,
                type: targetPK?.type || "INT", 
                isForeign: true, 
                nullable: false,
                references: targetTableName,
                referencesField: targetPKName,
                relationType: "N-N"
              },
            ],
          },
        };

        const edgeStyle1 = getEdgeStyle("1-N");
        const edgeStyle2 = getEdgeStyle("1-N");

        const edge1: Edge = {
          id: `edge-${Date.now()}-1`,
          source: connection.source!,
          target: joinTableId,
          type: "umlMultiplicity",
          animated: edgeStyle1.animated,
          style: { 
            stroke: edgeStyle1.stroke, 
            strokeWidth: edgeStyle1.strokeWidth,
            strokeDasharray: edgeStyle1.strokeDasharray
          },
          markerEnd: { type: 'arrowclosed', color: edgeStyle1.stroke },
          data: {
            sourceField: sourcePKName,
            targetField: `${sourceTableName}_${sourcePKName}`,
            relationType: "1-N",
            sourceMultiplicity: "",
            targetMultiplicity: ""
          }
        };

        const edge2: Edge = {
          id: `edge-${Date.now()}-2`,
          source: connection.target!,
          target: joinTableId,
          type: "umlMultiplicity",
          animated: edgeStyle2.animated,
          style: { 
            stroke: edgeStyle2.stroke, 
            strokeWidth: edgeStyle2.strokeWidth,
            strokeDasharray: edgeStyle2.strokeDasharray
          },
          markerEnd: { type: 'arrowclosed', color: edgeStyle2.stroke },
          data: {
            sourceField: targetPKName,
            targetField: `${targetTableName}_${targetPKName}`,
            relationType: "1-N",
            sourceMultiplicity: "",
            targetMultiplicity: ""
          }
        };

        setNodes((nds: Node[]) => [...nds, joinTableNode]);
        setEdges((eds: Edge[]) => [...eds, edge1, edge2]);

        socket.emit("diagram-change", {
          projectId: project.id,
          action: "ADD_NODE",
          payload: joinTableNode,
        });

        setTimeout(() => {
          socket.emit("diagram-change", {
            projectId: project.id,
            action: "ADD_EDGE",
            payload: edge1,
          });
        }, 50);

        setTimeout(() => {
          socket.emit("diagram-change", {
            projectId: project.id,
            action: "ADD_EDGE",
            payload: edge2,
          });
        }, 100);

        return;
      }

      const requiresFK = !["DEPENDENCY", "REALIZATION"].includes(relationType) && relationType !== "INHERITANCE";
      
      let pkTable = sourceNode;
      let fkTable = targetNode;
      let fkField = null;
      let shouldInvertEdge = false;
      
      if (requiresFK) {
        
        if (relationType === "AGGREGATION" || relationType === "COMPOSITION") {
          // ◇/◆ AGREGACIÓN/COMPOSICIÓN según UML 2.5:
          // El rombo SIEMPRE se dibuja del lado del "TODO" (contenedor)
          // La FK SIEMPRE va en el lado de las "PARTES" (contenidas)
          // 
          // React Flow: markerEnd aparece en el TARGET
          // Por lo tanto: TARGET = TODO (tiene rombo), SOURCE = PARTES (tiene FK)
          pkTable = targetNode;  // El TODO tiene la PK
          fkTable = sourceNode;  // Las PARTES tienen la FK
          
          console.log(`🔷 [${relationType}] TODO: ${targetNode.data.name} (rombo), PARTES: ${sourceNode.data.name} (FK)`);
          
        } else if (relationType === "1-1") {
          // 1-1: FK puede ir en cualquier tabla
          // Por convención, ponemos FK en la tabla target (segundo nodo seleccionado)
          pkTable = sourceNode;
          fkTable = targetNode;
          console.log(`🔗 [1-1] PK en ${sourceNode.data.name}, FK en ${targetNode.data.name}`);
          
        } else if (relationType === "1-N") {
          // 1-N: FK SIEMPRE va en el lado "N" (muchos)
          // Source = lado "1" (uno), Target = lado "N" (muchos)
          pkTable = sourceNode;  // El "1" tiene la PK
          fkTable = targetNode;  // El "N" tiene la FK
          console.log(`🔗 [1-N] Lado 1: ${sourceNode.data.name} (PK), Lado N: ${targetNode.data.name} (FK)`);
          
        } else if (relationType === "ASSOCIATION") {
          // ASSOCIATION: FK va hacia donde apunta la flecha (target)
          // Source → Target: FK en target
          pkTable = sourceNode;
          fkTable = targetNode;
          console.log(`🔗 [ASSOCIATION] Flecha apunta a ${targetNode.data.name}, FK en ${targetNode.data.name}`);
          
        } else {
          const detected = determinePKFK(sourceNode, targetNode);
          pkTable = detected.pkTable;
          fkTable = detected.fkTable;
        }
        
        fkField = createFKField(fkTable, pkTable, relationType);
      }
      
      const pkField = pkTable.data.fields.find((f: any) => f.isPrimary);
      
      if (fkField && pkField && requiresFK) {
        
        // Actualizar el nodo con el nuevo campo
        setNodes((nds: Node[]) => 
          nds.map((n: Node) => 
            n.id === fkTable.id 
              ? { ...n, data: { ...n.data, fields: fkTable.data.fields } }
              : n
          )
        );

        // Sincronizar el nodo actualizado PRIMERO
        socket.emit("diagram-change", {
          projectId: project.id,
          action: "UPDATE_NODE",
          payload: {
            id: fkTable.id,
            data: fkTable.data
          },
        });

        // Esperar 100ms para asegurar que el nodo se guarde antes del edge
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Obtener estilo según el tipo seleccionado (sin conversión)
      const edgeStyle = getEdgeStyle(relationType);
      
      // 🆕 UML 2.5: Obtener multiplicidades para los extremos (con multiplicidad personalizada)
      const multiplicities = getMultiplicitiesFromRelationType(relationType, multiplicity);

      const newEdge: Edge = {
        id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
        source: connection.source!,
        target: connection.target!,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: "umlMultiplicity",
        animated: edgeStyle.animated,
        style: { 
          stroke: edgeStyle.stroke, 
          strokeWidth: edgeStyle.strokeWidth,
          strokeDasharray: edgeStyle.strokeDasharray,
          ...(edgeStyle.style || {})
        },
        markerEnd: typeof edgeStyle.markerEnd === 'object' ? {
          type: (edgeStyle.markerEnd as any).type,
          color: (edgeStyle.markerEnd as any).color,
          width: 20,
          height: 20
        } : undefined,
        data: {
          sourceField: pkField?.name,
          targetField: fkField?.name,
          relationType: relationType,
          sourceMultiplicity: multiplicities.sourceMultiplicity,
          targetMultiplicity: multiplicities.targetMultiplicity
        }
      };

      setEdges((eds: Edge[]) => addEdge(newEdge, eds));

      socket.emit("diagram-change", {
        projectId: project.id,
        action: "ADD_EDGE",
        payload: newEdge,
      });
    },
    [userRole, project, nodes, setNodes, setEdges, socket]
  );

  // � Crear relación desde FK (cuando se marca un campo como foreign key)
  const handleCreateRelationFromFK = useCallback(
    (sourceNodeId: string, targetTableName: string) => {
      // Buscar el nodo destino por nombre de tabla
      const targetNode = nodes.find(n => 
        (n.data.name === targetTableName || n.data.label === targetTableName)
      );

      if (!targetNode) {
        console.warn("⚠️ [Editor] Target table not found:", targetTableName);
        return;
      }

      // 🗑️ ELIMINAR relaciones FK previas desde este nodo hacia cualquier tabla
      const filteredEdges = edges.filter(e => 
        !(e.source === targetNode.id && e.target === sourceNodeId && e.label?.includes("‒"))
      );

      // Verificar si ya existe exactamente esta relación
      const existingEdge = filteredEdges.find(e => 
        (e.source === targetNode.id && e.target === sourceNodeId)
      );

      if (existingEdge) {
        console.log("ℹ️ [Editor] Relation already exists, skipping");
        return;
      }

      // Obtener estilo unificado para relaciones FK
      const edgeStyle = getEdgeStyle("FK");
      
      // 🆕 UML 2.5: Obtener multiplicidades
      const multiplicities = getMultiplicitiesFromRelationType("FK");

      // Crear edge 1-N (tabla referenciada → tabla con FK)
      const newEdge: Edge = {
        id: `edge-fk-${Date.now()}`,
        source: targetNode.id,
        target: sourceNodeId,
        type: "umlMultiplicity", // 🆕 Usar edge personalizado
        animated: edgeStyle.animated,
        style: { 
          stroke: edgeStyle.stroke, 
          strokeWidth: edgeStyle.strokeWidth,
          strokeDasharray: edgeStyle.strokeDasharray
        },
        markerEnd: {
          type: 'arrowclosed',
          color: edgeStyle.stroke
        },
        data: {
          relationType: "FK",
          sourceMultiplicity: multiplicities.sourceMultiplicity,
          targetMultiplicity: multiplicities.targetMultiplicity
        }
      };

      console.log("🔗 [Editor] Creating FK relation:", targetNode.id, "(1) →", sourceNodeId, "(N)");
      
      // Actualizar edges (eliminar previos del mismo tipo + nuevo)
      setEdges(filteredEdges.concat(newEdge));

      // Sincronizar eliminación de edges FK previos
      edges.filter(e => 
        e.source === targetNode.id && e.target === sourceNodeId && e.label?.includes("‒")
      ).forEach(oldEdge => {
        socket.emit("diagram-change", {
          projectId: project.id,
          action: "DELETE_EDGE",
          payload: { id: oldEdge.id },
        });
      });

      // Sincronizar nuevo edge
      socket.emit("diagram-change", {
        projectId: project.id,
        action: "ADD_EDGE",
        payload: newEdge,
      });
    },
    [nodes, edges, project, setEdges, socket]
  );

  // ��️ Función auxiliar para eliminar tabla (usada por Sidebar y Delete key)
  const handleDeleteNode = useCallback((nodeId: string) => {
    if (userRole === "VIEWER" || isGuest) {
      alert("Modo solo lectura - No puedes eliminar tablas");
      return;
    }

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    console.log("🗑️ [Editor] Deleting node:", nodeId);
    
    // 🔍 Encontrar todos los edges relacionados ANTES de eliminarlos
    const relatedEdges = edges.filter((e: Edge) => e.source === nodeId || e.target === nodeId);
    console.log(`📊 [Editor] Found ${relatedEdges.length} related edges to delete`);
    
    // Eliminar nodo localmente
    setNodes((nds: Node[]) => nds.filter((n: Node) => n.id !== nodeId));
    
    // Eliminar edges relacionados localmente
    setEdges((eds: Edge[]) => eds.filter((e: Edge) => e.source !== nodeId && e.target !== nodeId));

    // Emitir eliminación del nodo al servidor
    socket.emit("diagram-change", {
      projectId: project.id,
      action: "DELETE_NODE",
      payload: { id: nodeId },
    });

    // 🔥 CRÍTICO: Emitir DELETE_EDGE para cada edge relacionado
    relatedEdges.forEach((edge: Edge) => {
      console.log(`🗑️ [Editor] Emitting DELETE_EDGE for orphaned edge: ${edge.id}`);
      socket.emit("diagram-change", {
        projectId: project.id,
        action: "DELETE_EDGE",
        payload: { id: edge.id },
      });
    });

    // Limpiar selección si era el nodo seleccionado
    if (selectedNode === nodeId) {
      setSelectedNode(null);
    }
  }, [userRole, isGuest, nodes, edges, project, setNodes, setEdges, socket, selectedNode]);

  // �🗑️ Eliminar tabla con clic derecho
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      
      if (userRole === "VIEWER" || isGuest) {
        alert("Modo solo lectura - No puedes eliminar tablas");
        return;
      }

      const tableName = node.data.name || node.data.label || "esta tabla";
      const confirmDelete = window.confirm(`¿Eliminar tabla "${tableName}"?\n\nEsto también eliminará todas sus relaciones.`);
      
      if (confirmDelete) {
        handleDeleteNode(node.id);
      }
    },
    [userRole, isGuest, handleDeleteNode]
  );

  // ⌨️ Eliminar tabla con tecla Delete/Supr
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Supr") {
        // Eliminar tabla si hay una seleccionada
        if (selectedNode) {
          if (userRole === "VIEWER" || isGuest) {
            alert("Modo solo lectura - No puedes eliminar tablas");
            return;
          }

          const node = nodes.find(n => n.id === selectedNode);
          if (!node) return;

          const tableName = node.data.name || node.data.label || "esta tabla";
          const confirmDelete = window.confirm(
            `¿Eliminar tabla "${tableName}"?\n\nEsto también eliminará todas sus relaciones.\n\nPresiona Aceptar para confirmar.`
          );
          
          if (confirmDelete) {
            console.log("🗑️ [Editor] Deleting node with Delete key:", node.id);
            
            // 🔍 Encontrar todos los edges relacionados ANTES de eliminarlos
            const relatedEdges = edges.filter((e: Edge) => e.source === node.id || e.target === node.id);
            console.log(`📊 [Editor] Found ${relatedEdges.length} related edges to delete`);
            
            // Eliminar nodo localmente
            setNodes((nds: Node[]) => nds.filter((n: Node) => n.id !== node.id));
            
            // Eliminar edges relacionados localmente
            setEdges((eds: Edge[]) => eds.filter((e: Edge) => e.source !== node.id && e.target !== node.id));

            // Emitir eliminación del nodo al servidor
            socket.emit("diagram-change", {
              projectId: project.id,
              action: "DELETE_NODE",
              payload: { id: node.id },
            });

            // 🔥 CRÍTICO: Emitir DELETE_EDGE para cada edge relacionado
            relatedEdges.forEach((edge: Edge) => {
              console.log(`🗑️ [Editor] Emitting DELETE_EDGE for orphaned edge: ${edge.id}`);
              socket.emit("diagram-change", {
                projectId: project.id,
                action: "DELETE_EDGE",
                payload: { id: edge.id },
              });
            });

            // Limpiar selección
            setSelectedNode(null);
          }
        }
        // Eliminar relación si hay una seleccionada
        else if (selectedEdge) {
          if (userRole === "VIEWER" || isGuest) {
            alert("Modo solo lectura - No puedes eliminar relaciones");
            return;
          }

          const confirmDelete = window.confirm(
            `¿Eliminar relación "${selectedEdge.label || 'esta relación'}"?\n\nPresiona Aceptar para confirmar.`
          );
          
          if (confirmDelete) {
            console.log("🗑️ [Editor] Deleting edge with Delete key:", selectedEdge.id);
            
            // Eliminar edge localmente
            setEdges((eds: Edge[]) => eds.filter((e: Edge) => e.id !== selectedEdge.id));

            // Emitir eliminación al servidor
            socket.emit("diagram-change", {
              projectId: project.id,
              action: "DELETE_EDGE",
              payload: { id: selectedEdge.id },
            });

            // Limpiar selección
            setSelectedEdge(null);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNode, selectedEdge, nodes, edges, userRole, isGuest, project, setNodes, setEdges, socket]);

  // 🖱️ Eliminar relación con clic derecho
  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      
      if (userRole === "VIEWER" || isGuest) {
        alert("Modo solo lectura - No puedes eliminar relaciones");
        return;
      }

      const confirmDelete = window.confirm(
        `¿Eliminar relación "${edge.label || 'esta relación'}"?`
      );
      
      if (confirmDelete) {
        console.log("🗑️ [Editor] Deleting edge with context menu:", edge.id);
        
        // Eliminar edge localmente
        setEdges((eds: Edge[]) => eds.filter((e: Edge) => e.id !== edge.id));

        // Emitir eliminación al servidor
        socket.emit("diagram-change", {
          projectId: project.id,
          action: "DELETE_EDGE",
          payload: { id: edge.id },
        });
      }
    },
    [userRole, isGuest, project, setEdges, socket]
  );

  // 🧠 AI Integration - Apply actions received from AI
  const applyAIActions = useCallback(
    async (actions: any[]) => {
      console.log("🧠🧠🧠 [Editor] APPLYAIACTIONS CALLED WITH:", JSON.stringify(actions, null, 2));

      if (!actions || !Array.isArray(actions)) {
        console.warn("⚠️ [AI] No valid actions to apply");
        return;
      }
      
      console.log("✅ [Editor] Actions are valid array, processing...");

      // 🧩 Guardar temporalmente las acciones AddField para ejecutarlas al final
      const deferredAddFields: any[] = [];
      const deferredRenames: any[] = [];
      
      // Crear una referencia a los nodos y edges actualizados durante el proceso
      let updatedNodes = [...nodes];
      let updatedEdges = [...edges];

      // 🔹 Primera pasada: ejecutar todo excepto AddField y RenameTable
      for (const action of actions) {
        // Diferir AddField y RenameTable para el final
        if (action.type === "AddField") {
          deferredAddFields.push(action);
          continue;
        }
        
        if (action.type === "RenameTable") {
          deferredRenames.push(action);
          continue;
        }

        try {
          switch (action.type) {
            case "CreateTable": {
              const nodeId = `node-${Date.now()}-${Math.random()}`;
              const newNode: Node = {
                id: nodeId,
                type: "table",
                position: {
                  x: Math.random() * 400 + 100,
                  y: Math.random() * 300 + 100,
                },
                data: {
                  name: action.name,
                  label: action.name,
                  fields: action.fields.map((f: any, idx: number) => ({
                    id: Date.now() + idx,
                    name: f.name,
                    type: f.type,
                    isPrimary: f.isPrimary || false,
                    isForeign: f.isForeign || false,
                    nullable: f.nullable !== false, // Default true
                    references: f.references,
                    referencesField: f.referencesField,
                    relationType: f.relationType,
                    onDelete: f.onDelete,
                    onUpdate: f.onUpdate,
                  })),
                },
              };

              // Actualizar estado local y referencia
              updatedNodes = [...updatedNodes, newNode];
              setNodes((nds: Node[]) => [...nds, newNode]);

              // Sincronizar con Socket.IO
              socket.emit("diagram-change", {
                projectId: project.id,
                action: "ADD_NODE",
                payload: newNode,
              });

              // 🆕 Crear edges automáticamente para campos FK con references + referencesField
              const fkFields = action.fields.filter((f: any) => f.isForeign && f.references && f.referencesField);
              for (const fkField of fkFields) {
                const targetNode = updatedNodes.find((n) => 
                  n.data.name?.toLowerCase() === fkField.references?.toLowerCase() || 
                  n.data.label?.toLowerCase() === fkField.references?.toLowerCase()
                );

                if (targetNode) {
                  const edgeStyle = getEdgeStyle(fkField.relationType || "ASSOCIATION");
                  const multiplicities = getMultiplicitiesFromRelationType(fkField.relationType || "ASSOCIATION");

                  const newEdge: Edge = {
                    id: `edge-${Date.now()}-${Math.random()}`,
                    source: targetNode.id,
                    target: nodeId,
                    type: "uml-multiplicity",
                    data: {
                      relationType: fkField.relationType || "ASSOCIATION",
                      sourceField: fkField.referencesField,
                      targetField: fkField.name,
                      sourceMultiplicity: multiplicities.source,
                      targetMultiplicity: multiplicities.target,
                      onDelete: fkField.onDelete,
                      onUpdate: fkField.onUpdate,
                    },
                    ...edgeStyle,
                  };

                  updatedEdges = [...updatedEdges, newEdge];
                  setEdges((eds: Edge[]) => [...eds, newEdge]);

                  // Esperar 100ms para asegurar que el nodo FK esté guardado
                  await new Promise(resolve => setTimeout(resolve, 100));

                  socket.emit("diagram-change", {
                    projectId: project.id,
                    action: "ADD_EDGE",
                    payload: newEdge,
                  });

                  console.log(`✅ [AI] Auto-created edge for FK: ${targetNode.data.name}.${fkField.referencesField} → ${action.name}.${fkField.name}`);
                }
              }

              break;
            }

            case "CreateRelation": {
              
              // Buscar nodos source y target por nombre en updatedNodes (case-insensitive)
              const sourceNode = updatedNodes.find(
                (n) => 
                  n.data.name?.toLowerCase() === action.fromTable?.toLowerCase() || 
                  n.data.label?.toLowerCase() === action.fromTable?.toLowerCase()
              );
              const targetNode = updatedNodes.find(
                (n) => 
                  n.data.name?.toLowerCase() === action.toTable?.toLowerCase() || 
                  n.data.label?.toLowerCase() === action.toTable?.toLowerCase()
              );

              console.log(`🔍 [AI] Found sourceNode:`, sourceNode?.data.name);
              console.log(`🔍 [AI] Found targetNode:`, targetNode?.data.name);

              if (!sourceNode || !targetNode) {
                console.warn(
                  `⚠️ [AI] Relation skipped: table not found (${action.fromTable} → ${action.toTable})`
                );
                break;
              }

              // Determinar tipo de relación: priorizar relationType (UML 2.5) sobre cardinality
              let relationType = "1-N"; // Default
              
              // Si hay relationType (INHERITANCE, COMPOSITION, etc.), usarlo directamente
              if (action.relationType) {
                relationType = action.relationType;
                console.log(`🎯 [AI] Using relationType from action: ${relationType}`);
              }
              // Si no hay relationType pero hay cardinality, mapear cardinalidades clásicas
              else if (action.cardinality) {
                if (action.cardinality === "ONE_TO_ONE") relationType = "1-1";
                if (action.cardinality === "ONE_TO_MANY") relationType = "1-N";
                if (action.cardinality === "MANY_TO_MANY") relationType = "N-N";
                console.log(`🎯 [AI] Mapped cardinality ${action.cardinality} to ${relationType}`);
              }

              console.log(
                `🔗 [AI] Creating ${relationType} relation: ${action.fromTable} → ${action.toTable}`
              );

              // 🔹 Caso 1: HERENCIA (solo edge visual, sin FK)
              if (relationType === "INHERITANCE") {
                console.log(`🔥 [AI] Entering INHERITANCE case block`);
                const childTable = sourceNode;
                const parentTable = targetNode;
                
                const edgeStyle = getEdgeStyle("INHERITANCE");
                const multiplicities = getMultiplicitiesFromRelationType("INHERITANCE");
                
                const pkField = parentTable.data.fields.find((f: any) => f.isPrimary);
                
                const newEdge: Edge = {
                  id: `edge-${Date.now()}`,
                  source: childTable.id,
                  target: parentTable.id,
                  type: "umlMultiplicity",
                  animated: edgeStyle.animated,
                  style: {
                    stroke: edgeStyle.stroke,
                    strokeWidth: edgeStyle.strokeWidth,
                    strokeDasharray: edgeStyle.strokeDasharray,
                    ...(edgeStyle.style || {})
                  },
                  markerEnd: typeof edgeStyle.markerEnd === 'object' ? {
                    type: (edgeStyle.markerEnd as any).type,
                    color: (edgeStyle.markerEnd as any).color,
                    width: 20,
                    height: 20
                  } : undefined,
                  data: {
                    sourceField: undefined,
                    targetField: pkField?.name,
                    relationType: "INHERITANCE",
                    onDelete: action.onDelete || "CASCADE",
                    onUpdate: action.onUpdate || "CASCADE",
                    sourceMultiplicity: multiplicities.sourceMultiplicity,
                    targetMultiplicity: multiplicities.targetMultiplicity
                  },
                };

                updatedEdges = [...updatedEdges, newEdge];
                setEdges((eds: Edge[]) => [...eds, newEdge]);

                socket.emit("diagram-change", {
                  projectId: project.id,
                  action: "ADD_EDGE",
                  payload: newEdge,
                });
                
                console.log(`✅ [AI] Created INHERITANCE relation (visual only, no FK) - Edge ID: ${newEdge.id}`);
                console.log(`✅ [AI] Edge details:`, newEdge);
                break; // Importante: salir del switch para no caer en otros casos
              }
              // 🔹 Caso 2: RELACIÓN N-N (tabla intermedia)
              else if (relationType === "N-N") {
                const sourcePK = sourceNode.data.fields.find((f: any) => f.isPrimary);
                const targetPK = targetNode.data.fields.find((f: any) => f.isPrimary);
                const sourcePKName = sourcePK?.name || "id";
                const targetPKName = targetPK?.name || "id";

                const joinTableId = `join-${Date.now()}`;
                const joinTableName = action.through || `${action.fromTable}_${action.toTable}`;
                const joinTableNode: Node = {
                  id: joinTableId,
                  type: "table",
                  position: {
                    x: (sourceNode.position.x + targetNode.position.x) / 2,
                    y: (sourceNode.position.y + targetNode.position.y) / 2 + 80,
                  },
                  data: {
                    name: joinTableName,
                    label: joinTableName,
                    fields: [
                      {
                        id: Date.now() + 1,
                        name: `${action.fromTable}_${sourcePKName}`,
                        type: sourcePK?.type.toUpperCase().includes("SERIAL") ? "INT" : (sourcePK?.type || "INT"),
                        isForeign: true,
                        nullable: false,
                        references: action.fromTable,
                        referencesField: sourcePKName,
                      },
                      {
                        id: Date.now() + 2,
                        name: `${action.toTable}_${targetPKName}`,
                        type: targetPK?.type.toUpperCase().includes("SERIAL") ? "INT" : (targetPK?.type || "INT"),
                        isForeign: true,
                        nullable: false,
                        references: action.toTable,
                        referencesField: targetPKName,
                      },
                    ],
                  },
                };

                // Crear edges
                const edgeStyle1 = getEdgeStyle("1-N");
                const edgeStyle2 = getEdgeStyle("1-N");
                
                // ⚠️ UML 2.5: En N-N las multiplicidades hacia tabla intermedia se sobreentienden

                const edge1: Edge = {
                  id: `edge-${Date.now()}-1`,
                  source: sourceNode.id,
                  target: joinTableId,
                  type: "umlMultiplicity", // 🆕 Usar edge personalizado
                  animated: edgeStyle1.animated,
                  style: {
                    stroke: edgeStyle1.stroke,
                    strokeWidth: edgeStyle1.strokeWidth,
                    strokeDasharray: edgeStyle1.strokeDasharray,
                  },
                  markerEnd: { type: "arrowclosed", color: edgeStyle1.stroke },
                  data: {
                    sourceField: sourcePKName,
                    targetField: `${action.fromTable}_${sourcePKName}`,
                    relationType: "1-N",
                    sourceMultiplicity: "",  // Vacío: no se muestra
                    targetMultiplicity: ""   // Vacío: no se muestra
                  },
                };

                const edge2: Edge = {
                  id: `edge-${Date.now()}-2`,
                  source: targetNode.id,
                  target: joinTableId,
                  type: "umlMultiplicity", // 🆕 Usar edge personalizado
                  animated: edgeStyle2.animated,
                  style: {
                    stroke: edgeStyle2.stroke,
                    strokeWidth: edgeStyle2.strokeWidth,
                    strokeDasharray: edgeStyle2.strokeDasharray,
                  },
                  markerEnd: { type: "arrowclosed", color: edgeStyle2.stroke },
                  data: {
                    sourceField: targetPKName,
                    targetField: `${action.toTable}_${targetPKName}`,
                    relationType: "1-N",
                    sourceMultiplicity: "",  // Vacío: no se muestra
                    targetMultiplicity: ""   // Vacío: no se muestra
                  },
                };

                // Actualizar estado local y referencia
                updatedNodes = [...updatedNodes, joinTableNode];
                setNodes((nds: Node[]) => [...nds, joinTableNode]);
                setEdges((eds: Edge[]) => [...eds, edge1, edge2]);

                // Sincronizar
                socket.emit("diagram-change", {
                  projectId: project.id,
                  action: "ADD_NODE",
                  payload: joinTableNode,
                });

                setTimeout(() => {
                  socket.emit("diagram-change", {
                    projectId: project.id,
                    action: "ADD_EDGE",
                    payload: edge1,
                  });
                }, 50);

                setTimeout(() => {
                  socket.emit("diagram-change", {
                    projectId: project.id,
                    action: "ADD_EDGE",
                    payload: edge2,
                  });
                }, 100);
              } else {
                // 🔹 Caso 3: Resto de relaciones (COMPOSITION, AGGREGATION, ASSOCIATION, 1-1, 1-N)
                // Todas estas generan FK física en la tabla destino
                const { pkTable, fkTable } = determinePKFK(sourceNode, targetNode);
                const fkField = createFKField(fkTable, pkTable, relationType);
                const pkField = pkTable.data.fields.find((f: any) => f.isPrimary);

                if (fkField && pkField) {
                  // Actualizar nodo con FK en referencia local
                  updatedNodes = updatedNodes.map((n: Node) =>
                    n.id === fkTable.id
                      ? { ...n, data: { ...n.data, fields: fkTable.data.fields } }
                      : n
                  );
                  
                  setNodes((nds: Node[]) =>
                    nds.map((n: Node) =>
                      n.id === fkTable.id
                        ? { ...n, data: { ...n.data, fields: fkTable.data.fields } }
                        : n
                    )
                  );

                  // Sincronizar nodo actualizado
                  socket.emit("diagram-change", {
                    projectId: project.id,
                    action: "UPDATE_NODE",
                    payload: {
                      id: fkTable.id,
                      data: fkTable.data,
                    },
                  });

                  // Esperar 100ms para asegurar que el nodo se guarde antes del edge
                  await new Promise(resolve => setTimeout(resolve, 100));

                  // Crear edge
                  const edgeStyle = getEdgeStyle(relationType);
                  
                  // 🆕 UML 2.5: Obtener multiplicidades
                  const multiplicities = getMultiplicitiesFromRelationType(relationType);
                  
                  const newEdge: Edge = {
                    id: `edge-${Date.now()}`,
                    source: pkTable.id,
                    target: fkTable.id,
                    type: "umlMultiplicity", // 🆕 Usar edge personalizado
                    animated: edgeStyle.animated,
                    style: {
                      stroke: edgeStyle.stroke,
                      strokeWidth: edgeStyle.strokeWidth,
                      strokeDasharray: edgeStyle.strokeDasharray,
                      // Agregar markerEnd desde el style si existe (para UML markers personalizados)
                      ...(edgeStyle.style || {})
                    },
                    markerEnd: typeof edgeStyle.markerEnd === 'object' ? {
                      type: (edgeStyle.markerEnd as any).type,
                      color: (edgeStyle.markerEnd as any).color,
                      width: 20,
                      height: 20
                    } : undefined,
                    data: {
                      sourceField: pkField?.name,
                      targetField: fkField?.name,
                      relationType,
                      sourceMultiplicity: multiplicities.sourceMultiplicity,
                      targetMultiplicity: multiplicities.targetMultiplicity,
                      ...(action.onDelete && { onDelete: action.onDelete }),
                      ...(action.onUpdate && { onUpdate: action.onUpdate }),
                    },
                  };

                  setEdges((eds: Edge[]) => [...eds, newEdge]);

                  socket.emit("diagram-change", {
                    projectId: project.id,
                    action: "ADD_EDGE",
                    payload: newEdge,
                  });
                  
                  console.log(`✅ [AI] Created ${relationType} relation with FK: ${pkTable.data.name} → ${fkTable.data.name}.${fkField.name}`);
                }
              }

              break;
            }

            case "DeleteTable": {
              const nodeToDelete = updatedNodes.find(
                (n) => 
                  n.data.name?.toLowerCase() === action.name?.toLowerCase() || 
                  n.data.label?.toLowerCase() === action.name?.toLowerCase()
              );

              if (nodeToDelete) {
                updatedNodes = updatedNodes.filter((n) => n.id !== nodeToDelete.id);
                handleDeleteNode(nodeToDelete.id);
              }
              break;
            }

            case "DeleteRelation": {
              const sourceNode = updatedNodes.find(
                (n) => 
                  n.data.name?.toLowerCase() === action.fromTable?.toLowerCase() || 
                  n.data.label?.toLowerCase() === action.fromTable?.toLowerCase()
              );
              const targetNode = updatedNodes.find(
                (n) => 
                  n.data.name?.toLowerCase() === action.toTable?.toLowerCase() || 
                  n.data.label?.toLowerCase() === action.toTable?.toLowerCase()
              );

              if (sourceNode && targetNode) {
                // Buscar edge entre estas dos tablas (en cualquier dirección)
                const edgeToDelete = edges.find(
                  (e) =>
                    (e.source === sourceNode.id && e.target === targetNode.id) ||
                    (e.source === targetNode.id && e.target === sourceNode.id)
                );

                if (edgeToDelete) {
                  setEdges((eds: Edge[]) => eds.filter((e) => e.id !== edgeToDelete.id));
                  
                  socket.emit("diagram-change", {
                    projectId: project.id,
                    action: "DELETE_EDGE",
                    payload: { edgeId: edgeToDelete.id },
                  });

                }
              }
              break;
            }

            case "DeleteField": {
              const targetNode = updatedNodes.find(
                (n) => 
                  n.data.name?.toLowerCase() === action.tableName?.toLowerCase() || 
                  n.data.label?.toLowerCase() === action.tableName?.toLowerCase()
              );

              if (targetNode && action.fieldNames && Array.isArray(action.fieldNames)) {
                const fieldsToDelete = new Set(action.fieldNames.map((f: string) => f.toLowerCase()));
                const updatedFields = targetNode.data.fields.filter(
                  (f: any) => !fieldsToDelete.has(f.name.toLowerCase())
                );

                // Actualizar referencia local
                updatedNodes = updatedNodes.map((n: Node) =>
                  n.id === targetNode.id
                    ? { ...n, data: { ...n.data, fields: updatedFields } }
                    : n
                );

                handleNodeUpdate(targetNode.id, { fields: updatedFields });
              }
              break;
            }

            case "RenameField": {
              const targetNode = updatedNodes.find(
                (n) => 
                  n.data.name?.toLowerCase() === action.tableName?.toLowerCase() || 
                  n.data.label?.toLowerCase() === action.tableName?.toLowerCase()
              );

              if (targetNode) {
                const updatedFields = targetNode.data.fields.map((f: any) =>
                  f.name.toLowerCase() === action.oldFieldName.toLowerCase()
                    ? { ...f, name: action.newFieldName }
                    : f
                );

                // Actualizar referencia local
                updatedNodes = updatedNodes.map((n: Node) =>
                  n.id === targetNode.id
                    ? { ...n, data: { ...n.data, fields: updatedFields } }
                    : n
                );

                handleNodeUpdate(targetNode.id, { fields: updatedFields });
              }
              break;
            }

            case "ModifyField": {
              const targetNode = updatedNodes.find(
                (n) => 
                  n.data.name?.toLowerCase() === action.tableName?.toLowerCase() || 
                  n.data.label?.toLowerCase() === action.tableName?.toLowerCase()
              );

              if (targetNode) {
                const updatedFields = targetNode.data.fields.map((f: any) => {
                  if (f.name.toLowerCase() === action.fieldName.toLowerCase()) {
                    return {
                      ...f,
                      ...(action.newType && { type: action.newType }),
                      ...(action.nullable !== undefined && { nullable: action.nullable }),
                      ...(action.isPrimary !== undefined && { isPrimary: action.isPrimary }),
                    };
                  }
                  return f;
                });

                // Actualizar referencia local
                updatedNodes = updatedNodes.map((n: Node) =>
                  n.id === targetNode.id
                    ? { ...n, data: { ...n.data, fields: updatedFields } }
                    : n
                );

                handleNodeUpdate(targetNode.id, { fields: updatedFields });
              }
              break;
            }

            case "ModifyRelation": {
              const sourceNode = updatedNodes.find(
                (n) => 
                  n.data.name?.toLowerCase() === action.fromTable?.toLowerCase() || 
                  n.data.label?.toLowerCase() === action.fromTable?.toLowerCase()
              );
              const targetNode = updatedNodes.find(
                (n) => 
                  n.data.name?.toLowerCase() === action.toTable?.toLowerCase() || 
                  n.data.label?.toLowerCase() === action.toTable?.toLowerCase()
              );

              if (sourceNode && targetNode) {
                const edgeToModify = edges.find(
                  (e) =>
                    (e.source === sourceNode.id && e.target === targetNode.id) ||
                    (e.source === targetNode.id && e.target === sourceNode.id)
                );

                if (edgeToModify) {
                  // Determinar el nuevo tipo de relación
                  const newRelationType = action.relationType || edgeToModify.data?.relationType || "1-N";
                  const edgeStyle = getEdgeStyle(newRelationType);
                  
                  const labelMap: Record<string, string> = {
                    "1-1": "1‒1",
                    "1-N": "1‒N",
                    "N-N": "N‒N",
                    "ASSOCIATION": "Asociación",
                    "AGGREGATION": "Agregación",
                    "COMPOSITION": "Composición",
                    "INHERITANCE": "Herencia",
                    "DEPENDENCY": "Dependencia",
                    "REALIZATION": "Realización"
                  };

                  const modifiedEdge = {
                    ...edgeToModify,
                    label: labelMap[newRelationType] || newRelationType,
                    animated: edgeStyle.animated,
                    style: {
                      stroke: edgeStyle.stroke,
                      strokeWidth: edgeStyle.strokeWidth,
                      strokeDasharray: edgeStyle.strokeDasharray,
                      ...(edgeStyle.style || {})
                    },
                    labelStyle: {
                      fill: edgeStyle.stroke,
                      fontWeight: 700,
                      fontSize: 13,
                      textShadow: "0 1px 3px rgba(0,0,0,0.8)"
                    },
                    labelBgStyle: edgeStyle.labelBgStyle,
                    markerEnd: typeof edgeStyle.markerEnd === 'object' ? {
                      type: (edgeStyle.markerEnd as any).type,
                      color: (edgeStyle.markerEnd as any).color,
                      width: 20,
                      height: 20
                    } : undefined,
                    data: {
                      ...edgeToModify.data,
                      relationType: newRelationType,
                      ...(action.onDelete && { onDelete: action.onDelete }),
                      ...(action.onUpdate && { onUpdate: action.onUpdate }),
                    },
                  };

                  setEdges((eds: Edge[]) =>
                    eds.map((e) => (e.id === edgeToModify.id ? modifiedEdge : e))
                  );

                  socket.emit("diagram-change", {
                    projectId: project.id,
                    action: "UPDATE_EDGE",
                    payload: modifiedEdge,
                  });
                }
              }
              break;
            }

            default:
              console.warn("⚠️ Acción desconocida:", action.type);
          }

          // Delay pequeño entre acciones para evitar condiciones de carrera
          await new Promise((resolve) => setTimeout(resolve, 150));
        } catch (error) {
          console.error("❌ [AI] Error applying action:", action, error);
        }
      }

      // 🔹 Segunda pasada: aplicar RenameTable (si hay)
      for (const renameAction of deferredRenames) {
        try {
          const nodeToRename = updatedNodes.find(
            (n) => 
              n.data.name?.toLowerCase() === renameAction.oldName?.toLowerCase() || 
              n.data.label?.toLowerCase() === renameAction.oldName?.toLowerCase()
          );

          if (nodeToRename) {
            const updatedData = {
              name: renameAction.newName,
              label: renameAction.newName,
            };

            // Actualizar referencia local
            updatedNodes = updatedNodes.map((n: Node) =>
              n.id === nodeToRename.id
                ? { ...n, data: { ...n.data, ...updatedData } }
                : n
            );

            // Actualizar estado y sincronizar
            handleNodeUpdate(nodeToRename.id, updatedData);

            console.log(
              `✅ [AI] Renamed table: ${renameAction.oldName} → ${renameAction.newName}`
            );
          } else {
            console.warn(
              `⚠️ [AI] Table not found for RenameTable: ${renameAction.oldName}`
            );
          }

          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.error("❌ [AI] Error applying RenameTable:", error);
        }
      }

      // 🔹 Tercera pasada: aplicar AddField una vez que todas las tablas existen
      for (const fieldAction of deferredAddFields) {
        try {
          // Soportar ambos formatos: tableName y targetTable
          const tableName = fieldAction.tableName || fieldAction.targetTable;
          const fields = fieldAction.fields || (fieldAction.field ? [fieldAction.field] : []);

          if (!tableName || fields.length === 0) {
            console.warn("⚠️ [AI] Invalid AddField action:", fieldAction);
            continue;
          }

          const targetNode = updatedNodes.find(
            (n) => 
              n.data.name?.toLowerCase() === tableName?.toLowerCase() || 
              n.data.label?.toLowerCase() === tableName?.toLowerCase()
          );

          if (!targetNode) {
            console.warn(
              `⚠️ [AI] Table not found for AddField: ${tableName}`
            );
            continue;
          }

          // Agregar todos los campos especificados
          const newFields = fields.map((f: any) => ({
            id: Date.now() + Math.random(),
            name: f.name,
            type: f.type,
            isPrimary: f.isPrimary || false,
            nullable: f.nullable !== false,
            isForeign: f.isForeign || false,
            references: f.references,
            referencesField: f.referencesField,
            relationType: f.relationType,
            onDelete: f.onDelete,
            onUpdate: f.onUpdate,
          }));

          const updatedFields = [...targetNode.data.fields, ...newFields];
          
          // Actualizar referencia local
          updatedNodes = updatedNodes.map((n: Node) =>
            n.id === targetNode.id
              ? { ...n, data: { ...n.data, fields: updatedFields } }
              : n
          );

          // Actualizar estado y sincronizar
          handleNodeUpdate(targetNode.id, { fields: updatedFields });

          console.log(
            `✅ [AI] Added ${newFields.length} deferred field(s) to ${tableName}: ${newFields.map((f: any) => f.name).join(", ")}`
          );

          // 🆕 Crear edges automáticamente para nuevos campos FK con references + referencesField
          const fkFields = newFields.filter((f: any) => f.isForeign && f.references && f.referencesField);
          for (const fkField of fkFields) {
            const referencedNode = updatedNodes.find((n) => 
              n.data.name?.toLowerCase() === fkField.references?.toLowerCase() || 
              n.data.label?.toLowerCase() === fkField.references?.toLowerCase()
            );

            if (referencedNode) {
              const edgeStyle = getEdgeStyle(fkField.relationType || "ASSOCIATION");
              const multiplicities = getMultiplicitiesFromRelationType(fkField.relationType || "ASSOCIATION");

              const newEdge: Edge = {
                id: `edge-${Date.now()}-${Math.random()}`,
                source: referencedNode.id,
                target: targetNode.id,
                type: "uml-multiplicity",
                data: {
                  relationType: fkField.relationType || "ASSOCIATION",
                  sourceField: fkField.referencesField,
                  targetField: fkField.name,
                  sourceMultiplicity: multiplicities.source,
                  targetMultiplicity: multiplicities.target,
                  onDelete: fkField.onDelete,
                  onUpdate: fkField.onUpdate,
                },
                ...edgeStyle,
              };

              updatedEdges = [...updatedEdges, newEdge];
              setEdges((eds: Edge[]) => [...eds, newEdge]);

              socket.emit("diagram-change", {
                projectId: project.id,
                action: "ADD_EDGE",
                payload: newEdge,
              });

              console.log(`✅ [AI] Auto-created edge for FK: ${referencedNode.data.name}.${fkField.referencesField} → ${tableName}.${fkField.name}`);
            }
          }

          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.error("❌ [AI] Error applying deferred AddField:", error);
        }
      }

      alert(`✅ ${actions.length} acción(es) de IA aplicada(s) correctamente!`);
    },
    [
      nodes,
      edges,
      project,
      setNodes,
      setEdges,
      socket,
      handleDeleteNode,
      handleNodeUpdate,
    ]
  );

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", position: "relative" }}>
      {/* 📋 TÍTULO DEL PROYECTO EN EL HEADER */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: "50%",
          transform: "translateX(-50%)",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#fff",
          padding: "10px 24px",
          borderRadius: 8,
          fontWeight: "bold",
          fontSize: 16,
          zIndex: 998,
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          gap: 8
        }}
      >
        <span style={{ fontSize: 18 }}>📐</span>
        {project?.name || "Diagrama ER"}
      </div>

      {/* Botón Cerrar Proyecto (siempre visible para usuarios autenticados no-guest) */}
      {!isGuest && (
        <button
          onClick={() => {
            if (socket) {
              socket.emit("leave-project", { projectId: project.id, userId: user.id });
            }
            disconnectSocket();
            navigate("/dashboard");
          }}
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            background: "#333",
            color: "#fff",
            border: "1px solid #555",
            padding: "6px 12px",
            borderRadius: 6,
            cursor: "pointer",
            zIndex: 999,
          }}
        >
          ← Cerrar proyecto
        </button>
      )}

      {/* Banner de VIEWER / GUEST */}
      {(isViewer || isGuest) && (
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            background: "#222",
            color: "#fff",
            padding: "12px 16px",
            borderRadius: 8,
            zIndex: 999,
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            maxWidth: "300px"
          }}
        >
          <p style={{ margin: "0 0 8px 0", fontSize: "14px" }}>
            {isGuest ? (
              <>�️ Estás viendo como <b>INVITADO</b></>
            ) : (
              <>�👀 Estás viendo el proyecto como <b>VIEWER</b></>
            )}
          </p>
          <button
            onClick={() => {
              disconnectSocket();
              // Si hay token de invitación, usarlo en el login
              if (inviteToken) {
                navigate(`/login?fromInvite=${inviteToken}`);
              } else {
                // Guardar la URL actual para volver después del login
                const returnUrl = window.location.pathname;
                sessionStorage.setItem("returnUrl", returnUrl);
                navigate("/login");
              }
            }}
            style={{
              background: "#007bff",
              border: "none",
              padding: "6px 12px",
              borderRadius: 4,
              cursor: "pointer",
              color: "#fff",
              fontSize: "13px",
              fontWeight: "600",
              width: "100%"
            }}
          >
            🔐 Iniciar sesión para editar
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ 
        padding: "12px 20px", 
        background: "#111", 
        color: "#fff",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid #333"
      }}>
        <div style={{ flex: 1 }}>
          <strong style={{ fontSize: "16px" }}>🧩 {project.name}</strong>
          <span style={{ marginLeft: 16, opacity: 0.7 }}>
            👤 {user.name} · <span style={{ 
              padding: "2px 6px", 
              background: userRole === "OWNER" ? "#4CAF50" : userRole === "EDITOR" ? "#2196F3" : "#757575",
              borderRadius: "4px",
              fontSize: "12px"
            }}>{userRole}</span>
          </span>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Panel de usuarios conectados en tiempo real */}
          <div style={{ 
            display: "flex", 
            gap: "6px", 
            alignItems: "center",
            background: "#1b1b1b",
            padding: "4px 10px",
            borderRadius: "6px"
          }}>
            <span style={{ fontSize: "12px", opacity: 0.7 }}>👥 Online:</span>
            {onlineUsers.map((u) => (
              <span
                key={u.userId}
                style={{
                  background: u.role === "OWNER" ? "#007bff" : u.role === "EDITOR" ? "#28a745" : "#6c757d",
                  borderRadius: "12px",
                  padding: "2px 8px",
                  fontSize: "0.75em",
                  fontWeight: "600"
                }}
                title={`${u.name} (${u.role})`}
              >
                {u.name}
              </span>
            ))}
            {onlineUsers.length === 0 && (
              <span style={{ fontSize: "12px", opacity: 0.5 }}>-</span>
            )}
          </div>
          
          <span style={{ opacity: 0.7, fontSize: "14px" }}>
            WebSocket: {isConnected ? "🟢" : "🔴"}
          </span>
        </div>
      </div>

      {/* React Flow Canvas con Sidebar izquierdo y PropertiesPanel derecho */}
      <div style={{ 
        flex: 1, 
        background: "#0f0f0f", 
        position: "relative", 
        display: "flex",
        overflow: "hidden",
        width: "100%",
        height: "100%"
      }}>
        {/* Sidebar izquierdo */}
        <Sidebar 
          nodes={nodes}
          edges={edges}
          selectedNode={selectedNode}
          onAddNode={addNode}
          onExportSQL={() => {
            const sql = generateSQL(nodes, edges);
            downloadSQL(sql, `${project.name}_${Date.now()}.sql`);
            alert("✅ SQL exportado correctamente!");
          }}
          onExportSpringBoot={async () => {
            try {
              const zipBuffer = await generateSpringBootProject(
                { nodes, edges },
                project.name
              );
              downloadSpringBootProject(zipBuffer, project.name);
              alert("✅ Proyecto Spring Boot generado correctamente!");
            } catch (error) {
              console.error("Error generando Spring Boot:", error);
              alert("❌ Error al generar proyecto Spring Boot");
            }
          }}
          onExportFlutter={async () => {
            try {
              const zipBuffer = await generateFlutterProject(
                { nodes, edges },
                project.name
              );
              downloadFlutterProject(zipBuffer, project.name);
              alert("✅ Proyecto Flutter generado correctamente!");
            } catch (error) {
              console.error("Error generando Flutter:", error);
              alert("❌ Error al generar proyecto Flutter");
            }
          }}
          onDeleteNode={handleDeleteNode}
        />

        {/* Canvas central con ReactFlow */}
        <div style={{ flex: 1, height: "100%", overflow: "hidden" }}>
          <ReactFlow
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            nodes={nodes}
            edges={edges}
            onNodesChange={isViewer ? undefined : handleNodesChange}
            onEdgesChange={isViewer ? undefined : onEdgesChange}
            onConnect={isViewer ? undefined : handleConnect}
            onNodeDragStop={isViewer ? undefined : onNodeDragStop}
            onNodeContextMenu={isViewer ? undefined : onNodeContextMenu}
            onEdgeContextMenu={isViewer ? undefined : onEdgeContextMenu}
            onEdgeClick={(_, edge) => setSelectedEdge(edge)}
            onPaneClick={() => {
              setSelectedNode(null);
              setSelectedEdge(null);
            }}
            panOnDrag={!isViewer}
            zoomOnScroll={!isViewer}
            nodesDraggable={!isViewer}
            nodesConnectable={!isViewer}
            elementsSelectable={!isViewer}
            fitView
            attributionPosition="bottom-left"
          >
            <MiniMap 
              nodeColor={() => "#666"}
              maskColor="rgba(0, 0, 0, 0.6)"
            />
            <Controls />
            <Background gap={16} color="#333" />
            <DownloadButton />
            
            {/* SVG Markers para UML 2.5 y Crow's Foot */}
            <svg style={{ position: "absolute", width: 0, height: 0 }}>
              <defs dangerouslySetInnerHTML={{ __html: UML_SVG_MARKERS }} />
            </svg>
          </ReactFlow>
        </div>

        {/* PropertiesPanel derecho */}
        <PropertiesPanel
          selectedNode={nodes.find(n => n.id === selectedNode) || null}
          availableTables={availableTables}
          edges={edges}
          nodes={nodes}
          setEdges={setEdges}
          onUpdate={handleNodeUpdate}
          socket={socket}
          project={project}
        />
      </div>

      {/* 🧠 AI Integration - Prompt Bar (solo para OWNER/EDITOR) */}
      {!isViewer && !isGuest && (
        <AIPromptBar
          projectId={project.id}
          userId={user.id}
          onActionsReceived={applyAIActions}
        />
      )}
    </div>
  );
}
