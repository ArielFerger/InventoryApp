// Importación de módulos necesarios
// - contextBridge: Permite exponer APIs seguras al contexto de la ventana renderizada.
// - ipcRenderer: Facilita la comunicación entre procesos (main y renderer).

const { contextBridge, ipcRenderer } = require('electron')

// Exposición de la API `db` en el contexto global de la ventana renderizada
// Esto permite que el código del frontend interactúe con la base de datos de manera segura.

// Métodos expuestos:
// - generatePDF: Genera un archivo PDF invocando el proceso principal.
// - getMateriales: Obtiene la lista de materiales desde la base de datos.
// - saveMaterial: Guarda o actualiza un material en la base de datos.
// - getProyectos: Obtiene la lista de proyectos desde la base de datos.
// - saveProyecto: Guarda o actualiza un proyecto en la base de datos.
// - deleteProyecto: Elimina un proyecto por su ID.
// - getItems: Obtiene los ítems asociados a un proyecto.
// - saveItem: Guarda un ítem asociado a un proyecto.
// - clearItems: Elimina todos los ítems asociados a un proyecto.

contextBridge.exposeInMainWorld('db', {
  generatePDF: (nombre) => ipcRenderer.invoke('generate-pdf', nombre),
  getMateriales: () => ipcRenderer.invoke('get-materiales'),
  saveMaterial: (m) => ipcRenderer.invoke('save-material', m),

  getProyectos: () => ipcRenderer.invoke('get-proyectos'),
  saveProyecto: (p) => ipcRenderer.invoke('save-proyecto', p),
  deleteProyecto: (id) => ipcRenderer.invoke('delete-proyecto', id), // Nueva función

  getItems: (id) => ipcRenderer.invoke('get-items', id),
  saveItem: (item) => ipcRenderer.invoke('save-item', item),
  clearItems: (id) => ipcRenderer.invoke('delete-items-proyecto', id)
})