const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const db = new sqlite3.Database(
  path.join(__dirname, 'ar_obras.db')
)

db.serialize(() => {

  db.run(`
    CREATE TABLE IF NOT EXISTS materiales (
      id INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL,
      categoria TEXT NOT NULL,
      precio REAL NOT NULL
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS proyectos (
      id INTEGER PRIMARY KEY,
      nombre TEXT,
      cliente TEXT,
      descripcion TEXT,  /* <--- NUEVA COLUMNA */
      ancho REAL,
      largo REAL,
      fecha TEXT
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS proyecto_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      proyecto_id INTEGER,
      material_id INTEGER,
      cantidad REAL
    )
  `)
  

})

module.exports = db
