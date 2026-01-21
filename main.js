const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const db = require('./db/database')
const fs = require('fs') // Necesario para guardar archivos
const { dialog } = require('electron') // Para la ventana de guardar

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win.loadFile('renderer/index.html')
}

app.whenReady().then(createWindow)

/* =======================
   MATERIALES
======================= */

ipcMain.handle('get-materiales', () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM materiales', (err, rows) => {
      if (err) reject(err)
      else resolve(rows)
    })
  })
})

ipcMain.handle('save-material', (_, m) => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT OR REPLACE INTO materiales VALUES (?,?,?,?)`,
      [m.id, m.nombre, m.categoria, m.precio],
      err => err ? reject(err) : resolve(true)
    )
  })
})

/* =======================
   PROYECTOS
======================= */

ipcMain.handle('get-proyectos', () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM proyectos', (err, rows) => {
      if (err) reject(err)
      else resolve(rows)
    })
  })
})

ipcMain.handle('save-proyecto', (_, p) => {
  return new Promise((resolve, reject) => {
    db.run(
      /* Agregamos un ? más y el campo p.descripcion */
      `INSERT OR REPLACE INTO proyectos VALUES (?,?,?,?,?,?,?)`,
      [p.id, p.nombre, p.cliente, p.descripcion, p.ancho, p.largo, p.fecha],
      err => err ? reject(err) : resolve(true)
    )
  })
})

ipcMain.handle('delete-proyecto', (_, id) => {
    return new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM proyectos WHERE id = ?`,
        [id],
        err => err ? reject(err) : resolve(true)
      )
    })
  })

ipcMain.handle('get-items', (_, proyectoId) => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM proyecto_items WHERE proyecto_id = ?`,
      [proyectoId],
      (err, rows) => err ? reject(err) : resolve(rows)
    )
  })
})

ipcMain.handle('save-item', (_, item) => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO proyecto_items (proyecto_id, material_id, cantidad)
       VALUES (?,?,?)`,
      [item.proyectoId, item.materialId, item.cantidad],
      err => err ? reject(err) : resolve(true)
    )
  })
})

ipcMain.handle('delete-items-proyecto', (_, proyectoId) => {
  return new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM proyecto_items WHERE proyecto_id = ?`,
      [proyectoId],
      err => err ? reject(err) : resolve(true)
    )
  })
})

/* =======================
   GENERACIÓN DE PDF
======================= */

ipcMain.handle('generate-pdf', async (event, nombreArchivo) => {
  const win = BrowserWindow.fromWebContents(event.sender)

  // 1. Opciones de impresión (A4, márgenes, fondo activado para colores)
  const pdfOptions = {
    margins: { top: 0, bottom: 0, left: 0, right: 0 }, // Los margenes los manejamos con CSS
    printBackground: true,
    pageSize: 'A4'
  }

  // 2. Generar el buffer del PDF desde la ventana actual
  const data = await win.webContents.printToPDF(pdfOptions)

  // 3. Abrir dialogo de guardar para que el usuario confirme ruta
  const { filePath } = await dialog.showSaveDialog(win, {
    title: 'Guardar Presupuesto PDF',
    defaultPath: `${nombreArchivo}.pdf`,
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
  })

  // 4. Si el usuario eligió una ruta, escribir el archivo
  if (filePath) {
    fs.writeFile(filePath, data, (error) => {
      if (error) throw error
    })
    return true // Éxito
  } else {
    return false // Cancelado por usuario
  }
})