// db.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('studysnip.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote TEXT,
    url TEXT,
    comment TEXT,
    groupToken TEXT
  )`);
});

module.exports = db;
