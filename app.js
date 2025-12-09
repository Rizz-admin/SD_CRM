// app.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const db = new sqlite3.Database('./db.sqlite');

app.use(bodyParser.json());
app.use(express.static(__dirname)); // Serve HTML, CSS, JS

// Create tables if not exist (no seeding needed anymore)
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS apartments (
      id INTEGER PRIMARY KEY,
      house_num REAL,
      block INTEGER NOT NULL,
      floor INTEGER NOT NULL,
      number INTEGER NOT NULL,
      rooms INTEGER NOT NULL, 
      room_1 INTEGER NOT NULL DEFAULT 0, 
      room_2 INTEGER NOT NULL DEFAULT 0, 
      room_3 INTEGER NOT NULL DEFAULT 0, 
      loggia_1 INTEGER NOT NULL DEFAULT 0, 
      loggia_2 INTEGER NOT NULL DEFAULT 0, 
      balcony_1 INTEGER NOT NULL DEFAULT 0, 
      balcony_2 INTEGER NOT NULL DEFAULT 0, 
      kitchen INTEGER NOT NULL DEFAULT 0, 
      hall INTEGER NOT NULL DEFAULT 0, 
      bath INTEGER NOT NULL DEFAULT 0, 
      toilet INTEGER NOT NULL DEFAULT 0, 
      storage INTEGER NOT NULL DEFAULT 0, 
      liv_area INTEGER NOT NULL DEFAULT 0, 
      tech_area INTEGER NOT NULL DEFAULT 0, 
      area_nbalc INTEGER NOT NULL, 
      area_wbalc INTEGER NOT NULL,
      UNIQUE(house_num, block, floor, number)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reservations (
      apartment_id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      surname TEXT NOT NULL,
      reserved_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
      FOREIGN KEY (apartment_id) REFERENCES apartments (id)
    )
  `);
});

// API: Get all apartments with reservation status
app.get('/api/apartments', (req, res) => {
  const sql = `
    SELECT a.id, a.house_num, a.block, a.floor, a.number, a.area_nbalc,
           r.name, r.surname, r.reserved_at
    FROM apartments a
    LEFT JOIN reservations r ON a.id = r.apartment_id
    ORDER BY a.house_num, a.block, a.floor DESC, a.number
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// API: Reserve apartment
app.post('/api/reserve/:id', (req, res) => {
  const { name, surname } = req.body;
  const aptId = req.params.id;

  if (!name || !surname) {
    return res.status(400).json({ error: "Name and surname required" });
  }

  db.run(
    `INSERT OR REPLACE INTO reservations (apartment_id, name, surname) VALUES (?, ?, ?)`,
    [aptId, name.trim(), surname.trim()],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, reserved_by: `${name} ${surname}` });
    }
  );
});

// API: Cancel reservation
app.delete('/api/reserve/:id', (req, res) => {
  db.run(`DELETE FROM reservations WHERE apartment_id = ?`, req.params.id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

const PORT = 3000;
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Open browser and go to: http://localhost:${PORT}`);
});

