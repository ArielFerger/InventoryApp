/* ==========================================================================
   renderer.js - VERSIÓN FINAL (Con UX mejorada: Enter y Focus automático)
   ========================================================================== */

/* 1. MODELOS */
// Clases que representan las entidades principales del sistema.
// Clase Material: Representa un material con atributos básicos.
// Clase ItemProyecto: Representa un material asociado a un proyecto.
// Clase Proyecto: Representa un proyecto con atributos y métodos útiles.

class Material {
    constructor(id, nombre, categoria, precio) {
        this.id = id;
        this.nombre = nombre;
        this.categoria = categoria;
        this.precio = Number(precio);
    }
}

class ItemProyecto {
    constructor(proyectoId, materialId, cantidad) {
        this.proyectoId = proyectoId;
        this.materialId = materialId;
        this.cantidad = Number(cantidad);
    }
}

class Proyecto {
    constructor(id, nombre, cliente, descripcion, ancho, largo) {
        this.id = id;
        this.nombre = nombre;
        this.cliente = cliente;
        this.descripcion = descripcion || ""; 
        this.ancho = Number(ancho);
        this.largo = Number(largo);
        this.items = []; 
        this.fecha = new Date().toLocaleDateString('es-AR');
    }
    
    get superficie() {
        return (this.ancho * this.largo).toFixed(2);
    }
}

/* 2. REPOSITORIO */
// Objeto DB: Interfaz para interactuar con la base de datos.
// Contiene métodos para obtener, guardar y eliminar materiales, proyectos e ítems.

const DB = {
  getMateriales: () => window.db.getMateriales(),
  saveMaterial: (m) => window.db.saveMaterial(m),

  getProyectos: () => window.db.getProyectos(),
  saveProyecto: (p) => window.db.saveProyecto(p),
  deleteProyecto: (id) => window.db.deleteProyecto(id),

  getItems: (id) => window.db.getItems(id),
  saveItem: (i) => window.db.saveItem(i),
  clearItems: (id) => window.db.clearItems(id),
  
  generatePDF: (nombre) => window.db.generatePDF(nombre)
}

/* 3. CONTROLADOR PRINCIPAL */
// Objeto app: Contiene la lógica principal de la aplicación.

const app = {
    proyectoActivo: null,

    /* --- INICIO --- */
    // Método start: Inicializa la aplicación cargando datos y configurando eventos.
    start: async () => {
        try {
            await app.actualizarKPIs();
            await app.actualizarListasCategorias();
            await app.cargarSelectProyectos();
            await app.cargarTablaInventario();
            await app.cargarSelectMateriales();
            
            // Listener: Crear Proyecto
            document.getElementById('form-nuevo-proyecto').addEventListener('submit', (e) => {
                e.preventDefault();
                app.crearProyecto();
            });

            // Listener: Editar Proyecto
            document.getElementById('form-editar-proyecto').addEventListener('submit', (e) => {
                e.preventDefault();
            });

            // Listener: Editar Material
            document.getElementById('form-editar-material').addEventListener('submit', (e) => {
                e.preventDefault();
                app.guardarEdicionMaterial();
            });

            // --- MEJORA UX 1: Al elegir un material, saltar directo a la cantidad ---
            document.getElementById('select-material-add').addEventListener('change', () => {
                const inpCantidad = document.getElementById('inp-cantidad-add');
                inpCantidad.focus();
                inpCantidad.select(); // Selecciona el texto por si quieres sobreescribir
            });

            // --- MEJORA UX 2: Al dar ENTER en cantidad, agregar el material ---
            document.getElementById('inp-cantidad-add').addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault(); // Evitar comportamientos raros
                    app.agregarMaterial();
                }
            });

        } catch (error) {
            console.error("Error al iniciar:", error);
        }
    },

    navegar: (vista) => {
        document.querySelectorAll('.vista').forEach(v => v.classList.add('oculto'));
        document.getElementById(`view-${vista}`).classList.remove('oculto');
        
        document.querySelectorAll('.btn-menu').forEach(b => b.classList.remove('activo'));
        document.getElementById(`btn-${vista}`).classList.add('activo');

        if (vista === 'dashboard') app.actualizarKPIs();
        if (vista === 'inventario') {
            app.cargarTablaInventario();
            app.actualizarListasCategorias();
        }
    },

    actualizarKPIs: async () => {
        const proyectos = await DB.getProyectos();
        const materiales = await DB.getMateriales();
        document.getElementById('kpi-total-proyectos').textContent = proyectos.length;
        document.getElementById('kpi-total-materiales').textContent = materiales.length;
    },

    /* --- GESTIÓN DE CATEGORÍAS --- */
    // Método actualizarListasCategorias: Actualiza las listas y selectores de categorías.
    actualizarListasCategorias: async () => {
        const materiales = await DB.getMateriales();
        
        const categorias = new Set(materiales.map(m => m.categoria));
        categorias.add("Obra Gruesa");
        categorias.add("Terminaciones");
        categorias.add("Instalaciones");
        categorias.add("Electricidad");
        
        const datalist = document.getElementById('list-categorias');
        if(datalist) {
            datalist.innerHTML = '';
            categorias.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat;
                datalist.appendChild(opt);
            });
        }

        const selectAumento = document.getElementById('sel-cat-aumento');
        if(selectAumento) {
            const valActual = selectAumento.value;
            selectAumento.innerHTML = '<option value="TODOS">Todo el catálogo</option>';
            categorias.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat;
                opt.textContent = cat;
                selectAumento.appendChild(opt);
            });
            if (valActual && valActual !== 'TODOS') selectAumento.value = valActual;
        }
    },

    /* --- PROYECTOS --- */
    // Métodos para gestionar proyectos:
    // - crearProyecto: Crea un nuevo proyecto y actualiza la vista.
    // - cargarSelectProyectos: Carga los proyectos en un selector.
    // - cargarProyecto: Carga los detalles de un proyecto seleccionado.
    // - abrirModalEditar: Abre el modal para editar un proyecto.
    // - eliminarProyectoActivo: Elimina el proyecto activo.
    crearProyecto: async () => {
        const nombre = document.getElementById('inp-nombre').value;
        const cliente = document.getElementById('inp-cliente').value;
        const desc = document.getElementById('inp-descripcion').value;
        const ancho = document.getElementById('inp-ancho').value;
        const largo = document.getElementById('inp-largo').value;

        const newId = Date.now();
        const nuevo = new Proyecto(newId, nombre, cliente, desc, ancho, largo);

        await DB.saveProyecto(nuevo);
        alert('Proyecto creado exitosamente');
        document.getElementById('form-nuevo-proyecto').reset();
        
        await app.cargarSelectProyectos();
        app.navegar('proyecto');
        document.getElementById('select-proyecto-activo').value = nuevo.id;
        await app.cargarProyecto(nuevo.id);
    },

    cargarSelectProyectos: async () => {
        const lista = await DB.getProyectos();
        const select = document.getElementById('select-proyecto-activo');
        const valorActual = select.value;

        select.innerHTML = '<option value="">-- Seleccione un Proyecto --</option>';
        lista.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${p.nombre} (${p.cliente})`;
            select.appendChild(opt);
        });

        if(valorActual) select.value = valorActual;
    },

    cargarProyecto: async (id) => {
        if (!id) {
            document.getElementById('empty-state-proyecto').classList.remove('oculto');
            document.getElementById('panel-detalle-proyecto').classList.add('oculto');
            document.getElementById('display-descripcion-proyecto').classList.add('oculto');
            app.proyectoActivo = null;
            return;
        }

        const proyectos = await DB.getProyectos();
        const p = proyectos.find(proj => proj.id == id);
        
        if (p) {
            app.proyectoActivo = new Proyecto(p.id, p.nombre, p.cliente, p.descripcion, p.ancho, p.largo);
            const itemsDB = await DB.getItems(id);
            app.proyectoActivo.items = itemsDB.map(i => new ItemProyecto(i.proyecto_id, i.material_id, i.cantidad));

            document.getElementById('empty-state-proyecto').classList.add('oculto');
            document.getElementById('panel-detalle-proyecto').classList.remove('oculto');
            
            // Mostrar descripción si existe
            const elDesc = document.getElementById('display-descripcion-proyecto');
            if (app.proyectoActivo.descripcion && app.proyectoActivo.descripcion.trim() !== "") {
                elDesc.textContent = app.proyectoActivo.descripcion;
                elDesc.classList.remove('oculto');
            } else {
                elDesc.textContent = "";
                elDesc.classList.add('oculto');
            }
            
            await app.renderizarTablaItems();
            app.actualizarDatosReporte(); 
        }
    },

    abrirModalEditar: () => {
        if (!app.proyectoActivo) return alert("Selecciona un proyecto primero");
        
        document.getElementById('edit-nombre').value = app.proyectoActivo.nombre;
        document.getElementById('edit-cliente').value = app.proyectoActivo.cliente;
        document.getElementById('edit-descripcion').value = app.proyectoActivo.descripcion;
        document.getElementById('edit-ancho').value = app.proyectoActivo.ancho;
        document.getElementById('edit-largo').value = app.proyectoActivo.largo;

        const modal = document.getElementById('modal-editar');
        modal.showModal();

        document.getElementById('form-editar-proyecto').onsubmit = async (e) => {
            e.preventDefault();
            
            app.proyectoActivo.nombre = document.getElementById('edit-nombre').value;
            app.proyectoActivo.cliente = document.getElementById('edit-cliente').value;
            app.proyectoActivo.descripcion = document.getElementById('edit-descripcion').value;
            app.proyectoActivo.ancho = document.getElementById('edit-ancho').value;
            app.proyectoActivo.largo = document.getElementById('edit-largo').value;
            
            await DB.saveProyecto(app.proyectoActivo);
            modal.close();
            alert("Proyecto actualizado");
            
            await app.cargarSelectProyectos();
            document.getElementById('select-proyecto-activo').value = app.proyectoActivo.id;
            app.actualizarDatosReporte();
            // Actualizar vista visual de descripcion si cambió
            app.cargarProyecto(app.proyectoActivo.id);
        };
    },

    eliminarProyectoActivo: async () => {
        if (!app.proyectoActivo) return;

        if (confirm(`¿Estás seguro de ELIMINAR el proyecto "${app.proyectoActivo.nombre}"? Esta acción no se puede deshacer.`)) {
            const id = app.proyectoActivo.id;
            await DB.clearItems(id);
            await DB.deleteProyecto(id);
            
            alert("Proyecto eliminado.");
            app.proyectoActivo = null;
            await app.cargarSelectProyectos();
            app.cargarProyecto("");
            app.actualizarKPIs();
        }
    },

    /* --- ITEMS / MATERIALES --- */
    // Métodos para gestionar materiales en proyectos:
    // - cargarSelectMateriales: Carga los materiales disponibles en un selector.
    // - agregarMaterial: Añade un material al proyecto activo.
    // - eliminarItem: Elimina un material del proyecto activo.
    // - sincronizarItemsConBD: Sincroniza los ítems del proyecto con la base de datos.
    // - renderizarTablaItems: Renderiza la tabla de materiales del proyecto.
    cargarSelectMateriales: async () => {
        const lista = await DB.getMateriales();
        const select = document.getElementById('select-material-add');
        select.innerHTML = '';
        lista.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = `${m.nombre} - ${app.formatMoney(m.precio)}`;
            select.appendChild(opt);
        });
    },

    agregarMaterial: async () => {
        if (!app.proyectoActivo) return;
        
        const matId = parseInt(document.getElementById('select-material-add').value);
        const cant = parseFloat(document.getElementById('inp-cantidad-add').value);

        if (!cant || cant <= 0) return alert("Ingrese una cantidad válida");

        const itemExistente = app.proyectoActivo.items.find(i => i.materialId === matId);
        
        if (itemExistente) {
            itemExistente.cantidad += cant;
        } else {
            app.proyectoActivo.items.push(new ItemProyecto(app.proyectoActivo.id, matId, cant));
        }

        await app.sincronizarItemsConBD();
        document.getElementById('inp-cantidad-add').value = '';
        
        // Volver el foco al selector de materiales para seguir agregando rápido
        document.getElementById('select-material-add').focus();
        
        await app.renderizarTablaItems();
    },

    eliminarItem: async (index) => {
        if (!confirm("¿Quitar este material del presupuesto?")) return;
        app.proyectoActivo.items.splice(index, 1);
        await app.sincronizarItemsConBD();
        await app.renderizarTablaItems();
    },

    sincronizarItemsConBD: async () => {
        const idProy = app.proyectoActivo.id;
        await DB.clearItems(idProy);
        for (const item of app.proyectoActivo.items) {
            await DB.saveItem({
                proyectoId: item.proyectoId, 
                materialId: item.materialId, 
                cantidad: item.cantidad
            });
        }
    },

    renderizarTablaItems: async () => {
        const tbody = document.getElementById('tabla-items-proyecto');
        tbody.innerHTML = '';
        
        const materialesDB = await DB.getMateriales();
        let totalProyecto = 0;

        app.proyectoActivo.items.forEach(item => {
            const mat = materialesDB.find(m => m.id === item.materialId);
            if (mat) totalProyecto += mat.precio * item.cantidad;
        });

        app.proyectoActivo.items.forEach((item, index) => {
            const matReal = materialesDB.find(m => m.id === item.materialId);
            if (matReal) {
                const subtotal = matReal.precio * item.cantidad;
                let porcentaje = totalProyecto > 0 ? (subtotal / totalProyecto) * 100 : 0;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${matReal.nombre}</td>
                    <td><span class="badge">${matReal.categoria}</span></td>
                    <td class="text-right">${app.formatMoney(matReal.precio)}</td>
                    <td class="text-center">${item.cantidad}</td>
                    <td class="text-right"><strong>${app.formatMoney(subtotal)}</strong></td>
                    <td class="text-center" style="color: #555;">
                        <div style="display:flex; align-items:center; gap:10px; justify-content:center;">
                            <small>${porcentaje.toFixed(1)}%</small>
                            <div style="background:#eee; height:6px; width:60px; border-radius:3px;">
                                <div style="background:var(--accent); width:${porcentaje}%; height:100%; border-radius:3px;"></div>
                            </div>
                        </div>
                    </td>
                    <td class="text-center no-print">
                        <button class="btn-icon" onclick="app.eliminarItem(${index})">
                            <span class="material-icons">delete</span>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            }
        });
        document.getElementById('info-header-proyecto').textContent = `Total: ${app.formatMoney(totalProyecto)}`;
    },

    /* --- PDF --- */
    // Métodos para generar reportes en PDF:
    // - generarPDF: Genera un archivo PDF con los datos del proyecto activo.
    // - actualizarDatosReporte: Actualiza los datos del reporte en la interfaz.
    generarPDF: async () => {
        if (!app.proyectoActivo) return alert("Selecciona un proyecto primero");
        
        app.actualizarDatosReporte();
        
        const fechaHoy = new Date().toLocaleDateString('es-AR');
        const elFecha = document.getElementById('reporte-fecha');
        if(elFecha) elFecha.textContent = fechaHoy;

        let nombreLimpio = app.proyectoActivo.nombre.trim();
        nombreLimpio = nombreLimpio.replace(/\s+/g, '_');
        nombreLimpio = nombreLimpio.replace(/[^a-zA-Z0-9_\-]/g, '');
        
        const nombreArchivo = `${nombreLimpio}_Materiales_${fechaHoy.replace(/\//g, '-')}`;

        try {
            const guardado = await window.db.generatePDF(nombreArchivo);
            if(guardado) alert("Listado guardado correctamente en PDF.");
        } catch (error) {
            console.error(error);
            alert("Error al guardar PDF.");
        }
    },

    actualizarDatosReporte: () => {
        if(app.proyectoActivo) {
            const elNombre = document.getElementById('reporte-nombre-proyecto');
            if (elNombre) elNombre.textContent = app.proyectoActivo.nombre;
        }
    },

    /* --- INVENTARIO --- */
    // Métodos para gestionar el inventario de materiales:
    // - cargarTablaInventario: Muestra los materiales disponibles en una tabla.
    // - abrirModalEditarMaterial: Abre el modal para editar un material.
    // - guardarEdicionMaterial: Guarda los cambios realizados a un material.
    // - toggleNuevoMaterial: Muestra/oculta el formulario para agregar un nuevo material.
    // - guardarNuevoMaterial: Guarda un nuevo material en la base de datos.
    // - aplicarInflacion: Aplica un aumento porcentual a los precios de los materiales.
    cargarTablaInventario: async () => {
        const lista = await DB.getMateriales();
        const tbody = document.getElementById('tabla-inventario');
        tbody.innerHTML = '';

        lista.forEach(m => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${m.nombre}</td>
                <td><span class="badge">${m.categoria}</span></td>
                <td class="text-right">
                    <strong>${app.formatMoney(m.precio)}</strong>
                </td>
                <td class="text-center">
                   <button class="btn-icon" onclick="app.abrirModalEditarMaterial(${m.id})" title="Editar Material">
                        <span class="material-icons" style="color:var(--accent)">edit</span>
                   </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    abrirModalEditarMaterial: async (id) => {
        const lista = await DB.getMateriales();
        const material = lista.find(m => m.id === id);
        if(!material) return;

        document.getElementById('edit-mat-id').value = material.id;
        document.getElementById('edit-mat-nombre').value = material.nombre;
        document.getElementById('edit-mat-cat').value = material.categoria;
        document.getElementById('edit-mat-precio').value = material.precio;

        document.getElementById('modal-editar-material').showModal();
    },

    guardarEdicionMaterial: async () => {
        const id = parseInt(document.getElementById('edit-mat-id').value);
        const nombre = document.getElementById('edit-mat-nombre').value;
        const cat = document.getElementById('edit-mat-cat').value; 
        const precio = document.getElementById('edit-mat-precio').value;

        if (!nombre || !cat || !precio) return alert("Complete todos los campos");

        const materialEditado = new Material(id, nombre, cat, precio);
        
        await DB.saveMaterial(materialEditado);
        
        document.getElementById('modal-editar-material').close();
        alert("Material actualizado");

        await app.actualizarListasCategorias();
        await app.cargarTablaInventario();
        await app.cargarSelectMateriales();
        if(app.proyectoActivo) await app.renderizarTablaItems();
    },

    toggleNuevoMaterial: () => {
        document.getElementById('form-nuevo-material').classList.toggle('oculto');
    },

    guardarNuevoMaterial: async () => {
        const nom = document.getElementById('new-mat-nombre').value;
        const cat = document.getElementById('new-mat-cat').value; 
        const pre = document.getElementById('new-mat-precio').value;

        if (!nom || !pre || !cat) return alert("Complete los datos");

        const lista = await DB.getMateriales();
        const newId = lista.length > 0 ? Math.max(...lista.map(m => m.id)) + 1 : 1;

        const nuevoMat = new Material(newId, nom, cat, pre);
        await DB.saveMaterial(nuevoMat);
        
        await app.actualizarListasCategorias();
        await app.cargarTablaInventario();
        await app.cargarSelectMateriales();
        app.toggleNuevoMaterial();
        
        document.getElementById('new-mat-nombre').value = '';
        document.getElementById('new-mat-cat').value = '';
        document.getElementById('new-mat-precio').value = '';
    },

    aplicarInflacion: async () => {
        const pct = parseFloat(document.getElementById('inp-aumento-pct').value);
        const cat = document.getElementById('sel-cat-aumento').value;
        if (!pct) return alert("Ingrese un porcentaje válido");

        if (confirm(`¿Aumentar precios un ${pct}% en: ${cat}?`)) {
            let lista = await DB.getMateriales();
            let contador = 0;
            for (let m of lista) {
                if (cat === "TODOS" || m.categoria === cat) {
                    m.precio = m.precio * (1 + (pct / 100));
                    m.precio = Math.round(m.precio * 100) / 100;
                    await DB.saveMaterial(m);
                    contador++;
                }
            }
            await app.cargarTablaInventario();
            await app.cargarSelectMateriales();
            if (app.proyectoActivo) await app.renderizarTablaItems();
            alert(`Se actualizaron ${contador} materiales.`);
            document.getElementById('inp-aumento-pct').value = '';
        }
    },

    formatMoney: (val) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);
    }
};

// INICIAR APLICACIÓN
// Evento DOMContentLoaded: Llama al método app.start para iniciar la aplicación.
document.addEventListener('DOMContentLoaded', app.start);