const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const db = require('./db');

const app = express();
const port = process.env.PORT || 5000;
const jwtSecret = process.env.JWT_SECRET || 'pdam_secret_key';

// Middleware
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Set to keep track of connected WebSocket clients
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('🔌 Client baru terhubung ke WebSocket');
  clients.add(ws);

  // Send a welcome message
  ws.send(JSON.stringify({ type: 'WELCOME', message: 'Koneksi realtime berhasil tersambung.' }));

  ws.on('close', () => {
    console.log('❌ Client terputus dari WebSocket');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('⚠️ WebSocket Error:', error);
    clients.delete(ws);
  });
});

// Helper function to broadcast message to all connected clients
function broadcast(data) {
  const payload = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// ==========================================
// MIDDLEWARE: AUTHENTICATION
// ==========================================
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token akses tidak ditemukan.' });
  }

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token tidak valid atau kedaluwarsa.' });
    }
    req.user = user;
    next();
  });
}

// ==========================================
// ROUTE: AUTHENTICATION (ADMIN)
// ==========================================

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username dan password wajib diisi.' });
  }

  try {
    const users = await db.query('SELECT * FROM admins WHERE username = ?', [username]);

    if (users.length === 0) {
      return res.status(401).json({ message: 'Username atau password salah.' });
    }

    const admin = users[0];
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Username atau password salah.' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: admin.id, username: admin.username }, jwtSecret, { expiresIn: '24h' });

    res.json({
      message: 'Login berhasil.',
      token,
      admin: { id: admin.id, username: admin.username }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
  }
});

// Verify token
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// ==========================================
// ROUTE: LOCATIONS (ADMIN & PUBLIC)
// ==========================================

// GET all locations (Public) with latest pressure readings
app.get('/api/locations', async (req, res) => {
  try {
    const locations = await db.query(`
      SELECT 
        l.*,
        pl.pressure_bar as latest_pressure_bar,
        pl.pressure_psi as latest_pressure_psi,
        pl.recorded_at as latest_recorded_at
      FROM locations l
      LEFT JOIN (
        SELECT pl1.* 
        FROM pressure_logs pl1
        INNER JOIN (
          SELECT location_id, MAX(recorded_at) as max_recorded_at
          FROM pressure_logs
          GROUP BY location_id
        ) pl2 ON pl1.location_id = pl2.location_id AND pl1.recorded_at = pl2.max_recorded_at
      ) pl ON l.id = pl.location_id
      ORDER BY l.name ASC
    `);

    res.json(locations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal mengambil data lokasi.' });
  }
});

// POST new location (Admin only)
app.post('/api/locations', authenticateToken, async (req, res) => {
  const { name, address, latitude, longitude, esp32_device_id, min_threshold_bar, max_threshold_bar } = req.body;

  if (!name || !address || latitude === undefined || longitude === undefined || !esp32_device_id) {
    return res.status(400).json({ message: 'Semua kolom wajib diisi dengan benar.' });
  }

  try {
    // Check if device ID already exists
    const existing = await db.query('SELECT id FROM locations WHERE esp32_device_id = ?', [esp32_device_id]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Device ID ESP32 sudah terdaftar di lokasi lain.' });
    }

    const minVal = min_threshold_bar !== undefined ? min_threshold_bar : 0.50;
    const maxVal = max_threshold_bar !== undefined ? max_threshold_bar : 4.00;

    const result = await db.query(
      `INSERT INTO locations (name, address, latitude, longitude, esp32_device_id, min_threshold_bar, max_threshold_bar)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, address, latitude, longitude, esp32_device_id, minVal, maxVal]
    );

    const newLocationId = result.insertId;

    // Seed an initial pressure log of 0 to prevent nulls on startup
    await db.query(
      'INSERT INTO pressure_logs (location_id, pressure_bar, pressure_psi) VALUES (?, ?, ?)',
      [newLocationId, 0.00, 0.00]
    );

    res.status(201).json({
      message: 'Lokasi berhasil ditambahkan.',
      locationId: newLocationId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal menambahkan lokasi baru.' });
  }
});

// PUT update location (Admin only)
app.put('/api/locations/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, address, latitude, longitude, esp32_device_id, min_threshold_bar, max_threshold_bar } = req.body;

  if (!name || !address || latitude === undefined || longitude === undefined || !esp32_device_id) {
    return res.status(400).json({ message: 'Semua kolom wajib diisi dengan benar.' });
  }

  try {
    // Check device ID collision (excluding this device)
    const existing = await db.query('SELECT id FROM locations WHERE esp32_device_id = ? AND id != ?', [esp32_device_id, id]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Device ID ESP32 sudah digunakan oleh lokasi lain.' });
    }

    const minVal = min_threshold_bar !== undefined ? min_threshold_bar : 0.50;
    const maxVal = max_threshold_bar !== undefined ? max_threshold_bar : 4.00;

    await db.query(
      `UPDATE locations 
       SET name = ?, address = ?, latitude = ?, longitude = ?, esp32_device_id = ?, min_threshold_bar = ?, max_threshold_bar = ?
       WHERE id = ?`,
      [name, address, latitude, longitude, esp32_device_id, minVal, maxVal, id]
    );

    res.json({ message: 'Data lokasi berhasil diperbarui.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal memperbarui data lokasi.' });
  }
});

// DELETE location (Admin only)
app.delete('/api/locations/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    await db.query('DELETE FROM locations WHERE id = ?', [id]);
    res.json({ message: 'Lokasi berhasil dihapus.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal menghapus lokasi.' });
  }
});

// ==========================================
// ROUTE: ESP32 INTEGRATION & DATA LOGGING
// ==========================================

// POST log data dari alat ESP32 (atau simulator)
app.post('/api/pressure/log', async (req, res) => {
  const { device_id, pressure_bar } = req.body;

  if (!device_id || pressure_bar === undefined) {
    return res.status(400).json({ message: 'device_id dan pressure_bar wajib dikirimkan.' });
  }

  try {
    // 1. Cari lokasi berdasarkan device_id
    const locations = await db.query('SELECT * FROM locations WHERE esp32_device_id = ?', [device_id]);
    if (locations.length === 0) {
      return res.status(404).json({ message: `Lokasi untuk Device ID ${device_id} tidak ditemukan.` });
    }

    const location = locations[0];
    const pressureBarVal = parseFloat(pressure_bar);
    const pressurePsiVal = parseFloat((pressureBarVal * 14.5038).toFixed(2));

    // 2. Insert ke tabel log
    const result = await db.query(
      'INSERT INTO pressure_logs (location_id, pressure_bar, pressure_psi) VALUES (?, ?, ?)',
      [location.id, pressureBarVal, pressurePsiVal]
    );

    const logRecord = {
      id: result.insertId,
      location_id: location.id,
      name: location.name,
      esp32_device_id: device_id,
      pressure_bar: pressureBarVal,
      pressure_psi: pressurePsiVal,
      recorded_at: new Date().toISOString(),
      min_threshold_bar: parseFloat(location.min_threshold_bar),
      max_threshold_bar: parseFloat(location.max_threshold_bar)
    };

    // 3. Broadcast data baru ke semua klien WebSocket secara realtime
    broadcast({
      type: 'PRESSURE_UPDATE',
      data: logRecord
    });

    res.status(201).json({
      message: 'Log data berhasil dicatat dan disebarkan secara realtime.',
      log: logRecord
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal mencatat data log tekanan air.' });
  }
});

// GET historical log data for charts (last 24 hours)
app.get('/api/pressure/history/:locationId', async (req, res) => {
  const { locationId } = req.params;
  const limit = parseInt(req.query.limit) || 24; // default ambil 24 log terakhir

  try {
    const logs = await db.query(
      `SELECT pressure_bar, pressure_psi, recorded_at 
       FROM pressure_logs 
       WHERE location_id = ? 
       ORDER BY recorded_at DESC 
       LIMIT ?`,
      [locationId, limit]
    );

    // Kirim dengan urutan ascending untuk rendering grafik
    res.json(logs.reverse());
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Gagal mengambil riwayat data tekanan.' });
  }
});

// Start the Server
server.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server berjalan di http://localhost:${port}`);
  console.log(`🔌 WebSocket server aktif di port yang sama (ws://localhost:${port})`);
});
