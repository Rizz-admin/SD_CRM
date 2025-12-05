// app.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const db = new sqlite3.Database('./db.sqlite');

app.use(bodyParser.json());
app.use(express.static(__dirname)); // Serve HTML, CSS, JS

// Create tables if not exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS apartments (
      id INTEGER PRIMARY KEY,
      block TEXT NOT NULL,
      floor INTEGER NOT NULL,
      number TEXT NOT NULL,
      UNIQUE(block, floor, number)
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

  // Seed some apartments if empty (3 blocks, 4 floors, 4 apts per floor)
  const aptCount = db.prepare("SELECT COUNT(*) as count FROM apartments").get();
  db.get("SELECT COUNT(*) as count FROM apartments", (err, row) => {
    if (row.count === 0) {
      const insert = db.prepare("INSERT OR IGNORE INTO apartments (block, floor, number) VALUES (?, ?, ?)");
      const blocks = ['A', 'B', 'C'];
      blocks.forEach(block => {
        for (let floor = 1; floor <= 4; floor++) {
          for (let num = 1; num <= 4; num++) {
            insert.run(block, floor, `${block}${floor}0${num}`);
          }
        }
      });
      insert.finalize();
      console.log("Sample apartments added (A, B, C blocks)");
    }
  });
});

// API: Get all apartments with reservation status
app.get('/api/apartments', (req, res) => {
  const sql = `
    SELECT a.id, a.block, a.floor, a.number,
           r.name, r.surname, r.reserved_at
    FROM apartments a
    LEFT JOIN reservations r ON a.id = r.apartment_id
    ORDER BY a.block, a.floor, a.number
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