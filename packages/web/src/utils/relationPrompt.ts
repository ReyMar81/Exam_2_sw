import Swal from "sweetalert2";

export async function askRelationType(): Promise<string | null> {
  const { value: type } = await Swal.fire({
    title: "Selecciona tipo de relación",
    html: `
      <div style="text-align:left; padding: 20px; font-size: 15px; line-height: 2; color: #e0e0e0;">
        <div style="margin-bottom: 16px;">
          <strong style="color: #74b9ff; font-size: 16px;">1‒1</strong> → Uno a uno 
          <span style="opacity: 0.8; font-size: 13px;">(ej: Usuario–Perfil)</span>
        </div>
        <div style="margin-bottom: 16px;">
          <strong style="color: #00cec9; font-size: 16px;">1‒N</strong> → Uno a muchos 
          <span style="opacity: 0.8; font-size: 13px;">(ej: Rol–Usuario)</span>
        </div>
        <div>
          <strong style="color: #ff7675; font-size: 16px;">N‒N</strong> → Muchos a muchos 
          <span style="opacity: 0.8; font-size: 13px;">(ej: Estudiante–Curso)</span>
        </div>
      </div>
    `,
    input: "select",
    inputOptions: {
      "1-1": "1‒1 (uno a uno)",
      "1-N": "1‒N (uno a muchos)",
      "N-N": "N‒N (muchos a muchos)",
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
