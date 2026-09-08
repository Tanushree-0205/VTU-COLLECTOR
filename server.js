const express = require('express');
const { sql } = require('@vercel/postgres');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Database Setup ---
let isDbInitialized = false;

async function ensureDb() {
  if (isDbInitialized) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS vtu_numbers (
        id SERIAL PRIMARY KEY,
        vtu_number VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Trigger function: resets sequence to 1 if table empty, else to MAX(id)
    await sql`
      CREATE OR REPLACE FUNCTION reset_vtu_sequence()
      RETURNS TRIGGER AS $$
      BEGIN
        IF (SELECT COUNT(*) FROM vtu_numbers) = 0 THEN
          PERFORM setval('vtu_numbers_id_seq', 1, false);
        ELSE
          PERFORM setval('vtu_numbers_id_seq', (SELECT MAX(id) FROM vtu_numbers));
        END IF;
        RETURN OLD;
      END;
      $$ LANGUAGE plpgsql;
    `;

    // Attach trigger to vtu_numbers table
    await sql`DROP TRIGGER IF EXISTS reset_id_on_delete ON vtu_numbers`;
    await sql`
      CREATE TRIGGER reset_id_on_delete
      AFTER DELETE ON vtu_numbers
      FOR EACH ROW EXECUTE FUNCTION reset_vtu_sequence();
    `;

    isDbInitialized = true;
    console.log('✅ Database initialized successfully');
  } catch (err) {
    console.error('❌ Failed to initialize database. Make sure Vercel Postgres is connected:', err);
    throw err;
  }
}

// --- API Routes ---

// Save a VTU number
app.post('/api/vtu', async (req, res) => {
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
    await ensureDb();
    await sql`INSERT INTO vtu_numbers (vtu_number) VALUES (${trimmed})`;
    return res.status(201).json({ success: true, message: 'VTU number saved successfully!' });
  } catch (err) {
    if (err.code === '23505') { // Postgres unique violation error code
      return res.status(409).json({ success: false, message: 'This VTU number already exists.' });
    }
    console.error('Database error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// Get all saved VTU numbers (optional utility endpoint)
app.get('/api/vtu', async (req, res) => {
  try {
    const { rows } = await sql`SELECT vtu_number, created_at FROM vtu_numbers ORDER BY created_at DESC`;
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Database error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// --- Start Server ---
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅ VTU Collector server running at http://localhost:${PORT}`);
  });
}

// Export for Vercel Serverless Functions
module.exports = app;
