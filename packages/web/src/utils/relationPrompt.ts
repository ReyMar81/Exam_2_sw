import Swal from "sweetalert2";

export async function askRelationType(): Promise<string | null> {
  const { value: type } = await Swal.fire({
    title: "Selecciona tipo de relación",
    html: `
      <div style="text-align:left; padding: 20px; font-size: 14px; line-height: 1.8; color: #e0e0e0;">
        
        <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #444;">
          <h4 style="color: #74b9ff; margin-bottom: 10px; font-size: 15px;">🗂️ Crow's Foot (Base de Datos)</h4>
          <div style="margin-bottom: 12px;">
            <strong style="color: #74b9ff;">1‒1</strong> → Uno a uno 
            <span style="opacity: 0.7; font-size: 12px;">(ej: Usuario–Perfil)</span>
          </div>
          <div style="margin-bottom: 12px;">
            <strong style="color: #00cec9;">1‒N</strong> → Uno a muchos 
            <span style="opacity: 0.7; font-size: 12px;">(ej: Rol–Usuario)</span>
          </div>
          <div style="margin-bottom: 12px;">
            <strong style="color: #ff7675;">N‒N</strong> → Muchos a muchos 
            <span style="opacity: 0.7; font-size: 12px;">(ej: Estudiante–Curso)</span>
          </div>
        </div>

        <div>
          <h4 style="color: #9b59b6; margin-bottom: 10px; font-size: 15px;">📐 UML 2.5 (Diseño Conceptual)</h4>
          <div style="margin-bottom: 12px;">
            <strong style="color: #9b59b6;">→</strong> <strong>Asociación</strong> 
            <span style="opacity: 0.7; font-size: 12px;">(relación bidireccional simple)</span>
          </div>
          <div style="margin-bottom: 12px;">
            <strong style="color: #3498db;">◇→</strong> <strong>Agregación</strong> 
            <span style="opacity: 0.7; font-size: 12px;">(el todo sin partes puede existir)</span>
          </div>
          <div style="margin-bottom: 12px;">
            <strong style="color: #e74c3c;">◆→</strong> <strong>Composición</strong> 
            <span style="opacity: 0.7; font-size: 12px;">(ciclo de vida dependiente)</span>
          </div>
          <div style="margin-bottom: 12px;">
            <strong style="color: #2ecc71;">△</strong> <strong>Herencia</strong> 
            <span style="opacity: 0.7; font-size: 12px;">(generalización/especialización)</span>
          </div>
          <div style="margin-bottom: 12px;">
            <strong style="color: #f39c12;">⇢</strong> <strong>Dependencia</strong> 
            <span style="opacity: 0.7; font-size: 12px;">(usa temporalmente)</span>
          </div>
          <div>
            <strong style="color: #1abc9c;">△⋯</strong> <strong>Realización</strong> 
            <span style="opacity: 0.7; font-size: 12px;">(implementa interfaz)</span>
          </div>
        </div>

      </div>
    `,
    input: "select",
    inputOptions: {
      // Crow's Foot
      "1-1": "🗂️ 1‒1 (uno a uno)",
      "1-N": "🗂️ 1‒N (uno a muchos)",
      "N-N": "🗂️ N‒N (muchos a muchos)",
      
      // UML 2.5
      "ASSOCIATION": "📐 → Asociación",
      "AGGREGATION": "📐 ◇→ Agregación",
      "COMPOSITION": "📐 ◆→ Composición",
      "INHERITANCE": "📐 △ Herencia",
      "DEPENDENCY": "📐 ⇢ Dependencia",
      "REALIZATION": "📐 △⋯ Realización",
    },
    inputPlaceholder: "Selecciona un tipo...",
    confirmButtonText: "Aceptar",
    cancelButtonText: "Cancelar",
    showCancelButton: true,
    confirmButtonColor: "#0984e3",
    cancelButtonColor: "#636e72",
    background: "#1e1e1e",
    color: "#fff",
    customClass: {
      popup: "swal-dark-popup",
      confirmButton: "swal-confirm-btn",
      cancelButton: "swal-cancel-btn",
      htmlContainer: "swal-html-dark",
      input: "swal-dark-select"
    },
    didOpen: () => {
      // Aplicar estilos al select después de que se renderice
      const selectElement = document.querySelector('.swal2-select') as HTMLSelectElement;
      if (selectElement) {
        selectElement.style.backgroundColor = '#2a2a2a';
        selectElement.style.color = '#ffffff';
        selectElement.style.border = '2px solid #0984e3';
        selectElement.style.padding = '12px';
        selectElement.style.fontSize = '15px';
        selectElement.style.borderRadius = '6px';
        selectElement.style.cursor = 'pointer';
        selectElement.style.width = '100%';
        
        // Estilos para opciones (funciona en algunos navegadores)
        const options = selectElement.querySelectorAll('option');
        options.forEach((option) => {
          (option as HTMLOptionElement).style.backgroundColor = '#2a2a2a';
          (option as HTMLOptionElement).style.color = '#ffffff';
          (option as HTMLOptionElement).style.padding = '10px';
        });
      }
    }
  });

  return type || null;
}
