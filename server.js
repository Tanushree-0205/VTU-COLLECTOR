const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = 3000;

// --- Middleware ---
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Database Setup ---
const db = new Database(path.join(__dirname, 'vtu_numbers.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS vtu_numbers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vtu_number TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// --- API Routes ---

// Save a VTU number
app.post('/api/vtu', (req, res) => {
  const { vtuNumber } = req.body;

  if (!vtuNumber || typeof vtuNumber !== 'string') {
    return res.status(400).json({ success: false, message: 'VTU number is required.' });
  }

  const trimmed = vtuNumber.trim().toUpperCase();

  // VTU format validation: e.g. VTU27935
  const vtuPattern = /^VTU\d+$/i;
  if (!vtuPattern.test(trimmed)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid VTU number format. Expected format like VTU12345.'
    });
  }

  try {
    const stmt = db.prepare('INSERT INTO vtu_numbers (vtu_number) VALUES (?)');
    stmt.run(trimmed);
    return res.status(201).json({ success: true, message: 'VTU number saved successfully!' });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ success: false, message: 'This VTU number already exists.' });
    }
    console.error('Database error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// Get all saved VTU numbers (optional utility endpoint)
app.get('/api/vtu', (req, res) => {
  const rows = db.prepare('SELECT vtu_number, created_at FROM vtu_numbers ORDER BY created_at DESC').all();
  return res.json({ success: true, data: rows });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`✅ VTU Collector server running at http://localhost:${PORT}`);
});
