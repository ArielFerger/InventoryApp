const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const db = require('./db/database')

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
      `INSERT OR REPLACE INTO proyectos VALUES (?,?,?,?,?,?)`,
      [p.id, p.nombre, p.cliente, p.ancho, p.largo, p.fecha],
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