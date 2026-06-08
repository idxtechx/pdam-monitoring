const mysql = require('mysql2/promise');
require('dotenv').config();

// Membuat connection pool ke database MySQL XAMPP
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS !== undefined ? process.env.DB_PASS : '',
  database: process.env.DB_NAME || 'pdam_monitoring',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Menambahkan helper function untuk query agar mempermudah pemanggilan
async function query(sql, params) {
  const [results] = await pool.execute(sql, params);
  return results;
}

// Uji koneksi saat inisialisasi
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Berhasil terhubung ke database MySQL XAMPP.');
    connection.release();
  } catch (error) {
    console.error('❌ Gagal terhubung ke database MySQL:', error.message);
    console.error('👉 Pastikan MySQL di XAMPP Control Panel Anda sudah AKTIF (Running).');
  }
})();

module.exports = {
  pool,
  query
};
