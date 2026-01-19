/* ==========================================================================
   renderer.js - VERSIÓN COMPLETA Y FUNCIONAL
   ========================================================================== */

/* 1. MODELOS */
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
    constructor(id, nombre, cliente, ancho, largo) {
        this.id = id;
        this.nombre = nombre;
        this.cliente = cliente;
        this.ancho = Number(ancho);
        this.largo = Number(largo);
        this.items = []; 
        this.fecha = new Date().toLocaleDateString('es-AR');
    }
    
    get superficie() {
        return (this.ancho * this.largo).toFixed(2);
    }
}

/* 2. REPOSITORIO (POINTERS AL PRELOAD) */
const DB = {
  getMateriales: () => window.db.getMateriales(),
  saveMaterial: (m) => window.db.saveMaterial(m),

  getProyectos: () => window.db.getProyectos(),
  saveProyecto: (p) => window.db.saveProyecto(p),
  deleteProyecto: (id) => window.db.deleteProyecto(id), // Agregado

  getItems: (id) => window.db.getItems(id),
  saveItem: (i) => window.db.saveItem(i),
  clearItems: (id) => window.db.clearItems(id)
}

/* 3. CONTROLADOR */
const app = {
    proyectoActivo: null,

    start: async () => {
        try {
            await app.actualizarKPIs();
            await app.cargarSelectProyectos();
            await app.cargarTablaInventario();
            await app.cargarSelectMateriales();
            
            document.getElementById('form-nuevo-proyecto').addEventListener('submit', (e) => {
                e.preventDefault();
                app.crearProyecto();
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
        if (vista === 'inventario') app.cargarTablaInventario();
    },

    actualizarKPIs: async () => {
        const proyectos = await DB.getProyectos();
        const materiales = await DB.getMateriales();
        document.getElementById('kpi-total-proyectos').textContent = proyectos.length;
        document.getElementById('kpi-total-materiales').textContent = materiales.length;
    },

    crearProyecto: async () => {
        const nombre = document.getElementById('inp-nombre').value;
        const cliente = document.getElementById('inp-cliente').value;
        const ancho = document.getElementById('inp-ancho').value;
        const largo = document.getElementById('inp-largo').value;

        const newId = Date.now();
        const nuevo = new Proyecto(newId, nombre, cliente, ancho, largo);

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

    cargarProyecto: async (id) => {
        if (!id) {
            document.getElementById('empty-state-proyecto').classList.remove('oculto');
            document.getElementById('panel-detalle-proyecto').classList.add('oculto');
            app.proyectoActivo = null;
            return;
        }

        const proyectos = await DB.getProyectos();
        const proyectoData = proyectos.find(p => p.id == id);
        
        if (proyectoData) {
            app.proyectoActivo = new Proyecto(proyectoData.id, proyectoData.nombre, proyectoData.cliente, proyectoData.ancho, proyectoData.largo);
            const itemsDB = await DB.getItems(id);
            app.proyectoActivo.items = itemsDB.map(i => new ItemProyecto(i.proyecto_id, i.material_id, i.cantidad));

            document.getElementById('empty-state-proyecto').classList.add('oculto');
            document.getElementById('panel-detalle-proyecto').classList.remove('oculto');
            
            await app.renderizarTablaItems();
            app.actualizarDatosReporte(); // Prepara los datos para imprimir
        }
    },

    // --- NUEVAS FUNCIONES DE EDICIÓN Y REPORTE ---
    
    abrirModalEditar: () => {
        if (!app.proyectoActivo) return alert("Selecciona un proyecto primero");
        
        document.getElementById('edit-nombre').value = app.proyectoActivo.nombre;
        document.getElementById('edit-cliente').value = app.proyectoActivo.cliente;
        document.getElementById('edit-ancho').value = app.proyectoActivo.ancho;
        document.getElementById('edit-largo').value = app.proyectoActivo.largo;

        const modal = document.getElementById('modal-editar');
        modal.showModal();

        document.getElementById('form-editar-proyecto').onsubmit = async (e) => {
            e.preventDefault();
            
            app.proyectoActivo.nombre = document.getElementById('edit-nombre').value;
            app.proyectoActivo.cliente = document.getElementById('edit-cliente').value;
            app.proyectoActivo.ancho = document.getElementById('edit-ancho').value;
            app.proyectoActivo.largo = document.getElementById('edit-largo').value;
            
            await DB.saveProyecto(app.proyectoActivo);
            modal.close();
            alert("Proyecto actualizado");
            
            await app.cargarSelectProyectos();
            document.getElementById('select-proyecto-activo').value = app.proyectoActivo.id;
            app.actualizarDatosReporte();
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

    generarPDF: () => {
        if (!app.proyectoActivo) return alert("Selecciona un proyecto primero");
        app.actualizarDatosReporte();
        window.print();
    },

    actualizarDatosReporte: () => {
        if(app.proyectoActivo) {
            document.getElementById('reporte-nombre-proyecto').textContent = app.proyectoActivo.nombre;
            document.getElementById('reporte-cliente').textContent = app.proyectoActivo.cliente;
            document.getElementById('reporte-superficie').textContent = app.proyectoActivo.superficie;
        }
    },

    // --- FUNCIONES ITEM Y MATERIALES ---

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

    // --- INVENTARIO Y PRECIOS ---

    cargarTablaInventario: async () => {
        const lista = await DB.getMateriales();
        const tbody = document.getElementById('tabla-inventario');
        tbody.innerHTML = '';

        lista.forEach(m => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${m.id}</td>
                <td>${m.nombre}</td>
                <td>${m.categoria}</td>
                <td class="text-right">
                    <input type="number" 
                           value="${m.precio}" 
                           onchange="app.actualizarPrecioUnitario(${m.id}, this.value)"
                           style="width: 120px; text-align: right;">
                </td>
                <td class="text-center">
                   <span class="material-icons" style="color:#ccc">edit</span>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    actualizarPrecioUnitario: async (id, nuevoVal) => {
        let lista = await DB.getMateriales();
        const mat = lista.find(m => m.id == id);
        if (mat) {
            mat.precio = Number(nuevoVal);
            await DB.saveMaterial(mat);
            if (app.proyectoActivo) {
                await app.cargarSelectMateriales(); 
                await app.renderizarTablaItems(); 
            }
        }
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

    toggleNuevoMaterial: () => {
        document.getElementById('form-nuevo-material').classList.toggle('oculto');
    },

    guardarNuevoMaterial: async () => {
        const nom = document.getElementById('new-mat-nombre').value;
        const cat = document.getElementById('new-mat-cat').value;
        const pre = document.getElementById('new-mat-precio').value;
        if (!nom || !pre) return alert("Complete los datos");

        const lista = await DB.getMateriales();
        const newId = lista.length > 0 ? Math.max(...lista.map(m => m.id)) + 1 : 1;

        const nuevoMat = new Material(newId, nom, cat, pre);
        await DB.saveMaterial(nuevoMat);
        await app.cargarTablaInventario();
        await app.cargarSelectMateriales();
        app.toggleNuevoMaterial();
        
        document.getElementById('new-mat-nombre').value = '';
        document.getElementById('new-mat-precio').value = '';
    },

    formatMoney: (val) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);
    }
};

document.addEventListener('DOMContentLoaded', app.start);