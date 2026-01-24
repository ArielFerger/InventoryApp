// Importación de módulos necesarios para la aplicación
// - app: Controla el ciclo de vida de la aplicación.
// - BrowserWindow: Crea ventanas de la aplicación.
// - ipcMain: Maneja la comunicación entre procesos.
// - path: Manejo de rutas de archivos.
// - db: Base de datos SQLite.
// - fs: Sistema de archivos para guardar archivos.
// - dialog: Ventanas de diálogo para guardar archivos.

// Función para crear la ventana principal de la aplicación
// Configura el tamaño, las preferencias y carga el archivo HTML principal.

// Evento que se ejecuta cuando la aplicación está lista para iniciar
// Llama a la función createWindow para mostrar la ventana principal.

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

// Manejo de materiales en la base de datos:
// - get-materiales: Obtiene todos los materiales.
// - save-material: Guarda o actualiza un material.

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

// Manejo de proyectos en la base de datos:
// - get-proyectos: Obtiene todos los proyectos.
// - save-proyecto: Guarda o actualiza un proyecto.
// - delete-proyecto: Elimina un proyecto por su ID.
// - get-items: Obtiene los ítems de un proyecto.
// - save-item: Guarda un ítem asociado a un proyecto.
// - delete-items-proyecto: Elimina todos los ítems de un proyecto.

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

// Generación de archivos PDF desde la ventana actual:
// - Configura opciones de impresión (márgenes, tamaño de página, fondo).
// - Abre un diálogo para que el usuario elija dónde guardar el archivo.
// - Escribe el archivo PDF en la ruta seleccionada.

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