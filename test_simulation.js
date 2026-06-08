/**
 * Script Pengujian Simulator Tekanan Air (Node.js)
 * 
 * Deskripsi:
 * Script ini mensimulasikan pengiriman data log tekanan air dari 3 alat ESP32 
 * yang terdaftar di database secara periodik ke API backend.
 * Bermanfaat untuk menguji koneksi database dan sinkronisasi realtime WebSocket
 * pada browser tanpa menggunakan perangkat keras ESP32.
 * 
 * Cara Menjalankan:
 * 1. Pastikan backend server aktif (Running di port 5000).
 * 2. Jalankan perintah: node test_simulation.js
 */

const http = require('http');

// Daftar device ID yang terdaftar sesuai dengan database.sql
const devices = [
  'ESP32-PDAM-001', // Rumah Budi
  'ESP32-PDAM-002', // Rumah Siti
  'ESP32-PDAM-003'  // Rumah Asep
];

// Menghasilkan nilai tekanan acak untuk disimulasikan
function getRandomPressure(deviceId) {
  if (deviceId === 'ESP32-PDAM-001') {
    // Normal: berfluktuasi antara 1.0 - 1.8 Bar
    return (1.0 + Math.random() * 0.8).toFixed(2);
  } else if (deviceId === 'ESP32-PDAM-002') {
    // Tekanan tinggi: berfluktuasi antara 2.0 - 2.8 Bar
    return (2.0 + Math.random() * 0.8).toFixed(2);
  } else {
    // Tekanan rendah / warning: berfluktuasi antara 0.2 - 0.7 Bar
    return (0.2 + Math.random() * 0.5).toFixed(2);
  }
}

// Fungsi mengirim data POST ke endpoint backend
function postPressureUpdate(deviceId, pressure) {
  const data = JSON.stringify({
    device_id: deviceId,
    pressure_bar: parseFloat(pressure)
  });

  const options = {
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/pressure/log',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      if (res.statusCode === 201) {
        const parsed = JSON.parse(body);
        console.log(`✅ [${new Date().toLocaleTimeString()}] BERHASIL: ${deviceId} -> ${pressure} Bar (${parsed.log.pressure_psi} PSI)`);
      } else {
        console.log(`❌ [${new Date().toLocaleTimeString()}] GAGAL: ${deviceId} -> Status ${res.statusCode} | ${body}`);
      }
    });
  });

  req.on('error', (error) => {
    console.error(`⚠️ [${new Date().toLocaleTimeString()}] ERROR Koneksi ke backend:`, error.message);
    console.log('👉 Harap jalankan backend server terlebih dahulu sebelum menjalankan script ini.');
  });

  req.write(data);
  req.end();
}

console.log('🏁 Memulai simulator pengiriman data sensor air...');
console.log('Press Ctrl+C to stop.');

// Jalankan pengiriman berkala setiap 3 detik
const intervalId = setInterval(() => {
  devices.forEach((deviceId) => {
    const pressure = getRandomPressure(deviceId);
    postPressureUpdate(deviceId, pressure);
  });
}, 3000);
