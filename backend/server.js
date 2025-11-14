// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./db');
const crypto = require('crypto');

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Helper: generate random group token
function generateGroupToken() {
  return crypto.randomBytes(4).toString('hex'); // 8 chars token
}

// Save note
app.post('/notes', (req, res) => {
  const { quote, url, comment, groupToken } = req.body;

  if (!quote || !url) {
    return res.status(400).json({ error: 'quote and url are required' });
  }

  db.run(
    `INSERT INTO notes (quote, url, comment, groupToken) VALUES (?, ?, ?, ?)`,
    [quote, url, comment || '', groupToken || null],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// Get all notes (optional query param groupToken)
app.get('/notes', (req, res) => {
  const groupToken = req.query.groupToken;

  if (groupToken) {
    db.all(
      `SELECT * FROM notes WHERE groupToken = ? ORDER BY id DESC`,
      [groupToken],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
      }
    );
  } else {
    // Return all notes (limit to 100 for safety)
    db.all(
      `SELECT * FROM notes ORDER BY id DESC LIMIT 100`,
      [],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
      }
    );
  }
});

// Delete note by id
app.delete('/notes/:id', (req, res) => {
  db.run(`DELETE FROM notes WHERE id = ?`, [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true });
  });
});

// Create new group token
app.post('/groups', (req, res) => {
  const token = generateGroupToken();
  // For simplicity, no group table; groupToken is just a string for sharing
  // You can add a groups table if needed later
  res.json({ groupToken: token });
});

app.listen(4000, () => console.log('Backend running on http://localhost:4000'));
