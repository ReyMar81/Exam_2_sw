import Swal from "sweetalert2";

export interface RelationConfig {
  type: string;
  multiplicity?: "1-1" | "1-N";
}

export async function askRelationType(): Promise<RelationConfig | null> {
  // Paso 1: Seleccionar tipo de relación con CARDS
  const { value: type } = await Swal.fire({
    title: "Selecciona el tipo de relación",
    html: `
      <style>
        .relation-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          padding: 10px;
          max-height: 500px;
          overflow-y: auto;
        }
        .relation-category {
          margin-bottom: 8px;
        }
        .category-title {
          font-size: 13px;
          font-weight: 600;
          color: #74b9ff;
          margin-bottom: 8px;
          padding: 8px 12px;
          background: rgba(116, 185, 255, 0.1);
          border-radius: 6px;
          text-align: left;
        }
        .category-title.uml {
          color: #9b59b6;
          background: rgba(155, 89, 182, 0.1);
        }
        .relation-card {
          background: #2a2a2a;
          border: 2px solid #444;
          border-radius: 8px;
          padding: 12px 16px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }
        .relation-card:hover {
          border-color: #0984e3;
          background: #333;
          transform: translateY(-2px);
        }
        .relation-card-title {
          font-size: 15px;
          font-weight: 600;
          color: #fff;
          margin-bottom: 4px;
        }
        .relation-card-desc {
          font-size: 12px;
          color: #aaa;
        }
      </style>
      <div class="relation-grid">
        <div class="relation-category">
          <div class="category-title">🗂️ BASE DE DATOS (Crow's Foot)</div>
          <div class="relation-card" data-value="1-1">
            <div class="relation-card-title">1:1 — Uno a uno</div>
            <div class="relation-card-desc">Ej: Usuario ↔ Perfil</div>
          </div>
          <div class="relation-card" data-value="1-N">
            <div class="relation-card-title">1:N — Uno a muchos</div>
            <div class="relation-card-desc">Ej: Departamento → Empleados</div>
          </div>
          <div class="relation-card" data-value="N-N">
            <div class="relation-card-title">N:N — Muchos a muchos</div>
            <div class="relation-card-desc">Ej: Estudiantes ↔ Cursos</div>
          </div>
        </div>
        
        <div class="relation-category">
          <div class="category-title uml">📐 UML 2.5 (Diseño Orientado a Objetos)</div>
          <div class="relation-card" data-value="ASSOCIATION">
            <div class="relation-card-title">→ Asociación</div>
            <div class="relation-card-desc">Relación de conocimiento mutuo</div>
          </div>
          <div class="relation-card" data-value="AGGREGATION">
            <div class="relation-card-title">◇→ Agregación</div>
            <div class="relation-card-desc">Relación "tiene-un" débil</div>
          </div>
          <div class="relation-card" data-value="COMPOSITION">
            <div class="relation-card-title">◆→ Composición</div>
            <div class="relation-card-desc">Relación "parte-de" fuerte</div>
          </div>
          <div class="relation-card" data-value="INHERITANCE">
            <div class="relation-card-title">△ Herencia</div>
            <div class="relation-card-desc">Generalización "es-un"</div>
          </div>
          <div class="relation-card" data-value="DEPENDENCY">
            <div class="relation-card-title">⇢ Dependencia</div>
            <div class="relation-card-desc">Una clase usa otra temporalmente</div>
          </div>
          <div class="relation-card" data-value="REALIZATION">
            <div class="relation-card-title">△⋯ Realización</div>
            <div class="relation-card-desc">Implementa una interfaz</div>
          </div>
        </div>
      </div>
    `,
    showConfirmButton: false,
    showCancelButton: true,
    cancelButtonText: "Cancelar",
    cancelButtonColor: "#636e72",
    background: "#1e1e1e",
    color: "#fff",
    width: '500px',
    customClass: {
      popup: "swal-dark-popup",
      cancelButton: "swal-cancel-btn",
      htmlContainer: "swal-html-dark",
    },
    didOpen: () => {
      const cards = document.querySelectorAll('.relation-card');
      cards.forEach((card) => {
        card.addEventListener('click', () => {
          const value = (card as HTMLElement).getAttribute('data-value');
          Swal.clickConfirm();
          (Swal as any).selectedValue = value;
        });
      });
    },
    preConfirm: () => {
      return (Swal as any).selectedValue;
    }
  });

  if (!type) return null;

  // Paso 2: Si es ASSOCIATION, AGGREGATION o COMPOSITION, preguntar multiplicidad
  if (type === "ASSOCIATION" || type === "AGGREGATION" || type === "COMPOSITION") {
    const relationName = 
      type === "ASSOCIATION" ? "Asociación" :
      type === "AGGREGATION" ? "Agregación" :
      "Composición";

    const { value: multiplicity } = await Swal.fire({
      title: `${relationName}: Multiplicidad`,
      html: `
        <style>
          .multiplicity-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 12px;
            padding: 10px;
          }
          .multiplicity-card {
            background: #2a2a2a;
            border: 2px solid #444;
            border-radius: 8px;
            padding: 16px;
            cursor: pointer;
            transition: all 0.2s;
            text-align: left;
          }
          .multiplicity-card:hover {
            border-color: #0984e3;
            background: #333;
            transform: translateY(-2px);
          }
          .multiplicity-card.selected {
            border-color: #0984e3;
            background: #1a3a52;
          }
          .multiplicity-card-title {
            font-size: 16px;
            font-weight: 600;
            color: #fff;
            margin-bottom: 8px;
          }
          .multiplicity-card-desc {
            font-size: 13px;
            color: #aaa;
            line-height: 1.5;
          }
          .multiplicity-card-example {
            font-size: 12px;
            color: #74b9ff;
            margin-top: 8px;
            font-style: italic;
          }
        </style>
        <div class="multiplicity-grid">
          <div class="multiplicity-card" data-value="1-1">
            <div class="multiplicity-card-title">🔹 1 a 1 (uno a uno)</div>
            <div class="multiplicity-card-desc">
              Cada elemento del origen se relaciona con <strong>exactamente uno</strong> en el destino
            </div>
            <div class="multiplicity-card-example">Ejemplo: Persona [1] → [1] Pasaporte</div>
          </div>
          
          <div class="multiplicity-card selected" data-value="1-N">
            <div class="multiplicity-card-title">🔹 1 a Muchos (1:N)</div>
            <div class="multiplicity-card-desc">
              Cada elemento del origen puede tener <strong>varios</strong> en el destino
            </div>
            <div class="multiplicity-card-example">Ejemplo: Departamento [1] ◇→ [*] Empleados</div>
          </div>
        </div>
      `,
      showConfirmButton: true,
      showCancelButton: true,
      confirmButtonText: "Crear relación",
      cancelButtonText: "← Atrás",
      confirmButtonColor: "#0984e3",
      cancelButtonColor: "#636e72",
      background: "#1e1e1e",
      color: "#fff",
      width: '520px',
      customClass: {
        popup: "swal-dark-popup",
        confirmButton: "swal-confirm-btn",
        cancelButton: "swal-cancel-btn",
        htmlContainer: "swal-html-dark",
      },
      didOpen: () => {
        // Pre-seleccionar 1-N por defecto
        (Swal as any).selectedMultiplicity = "1-N";
        
        const cards = document.querySelectorAll('.multiplicity-card');
        cards.forEach((card) => {
          card.addEventListener('click', () => {
            // Remover selección previa
            cards.forEach(c => c.classList.remove('selected'));
            // Agregar selección a la actual
            card.classList.add('selected');
            
            const value = (card as HTMLElement).getAttribute('data-value');
            (Swal as any).selectedMultiplicity = value;
          });
        });
      },
      preConfirm: () => {
        return (Swal as any).selectedMultiplicity;
      }
    });

    if (!multiplicity) return null; // Usuario canceló

    return { type, multiplicity: multiplicity as "1-1" | "1-N" };
  }

  // Para otros tipos, no necesitan multiplicidad personalizada
  return { type };
}
