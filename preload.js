const { contextBridge, ipcRenderer } = require('electron')

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