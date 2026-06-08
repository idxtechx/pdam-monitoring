# 💧 Sistem Monitoring Tekanan Air PDAM Realtime (IoT ESP32 & React)

Proyek ini adalah sistem monitoring tekanan air PDAM secara realtime untuk tingkat rumah tangga. Sistem diintegrasikan dengan mikrokontroler **ESP32** dan **Sensor Tekanan Air (Water Pressure Transducer)**. Hasil pembacaan tekanan air dikirimkan langsung ke database MySQL dan ditampilkan secara dinamis di web dashboard.

---

## 📂 Struktur Folder Proyek
```text
pdam-monitoring/
├── backend/                  # REST API & WebSocket Server (Node.js/Express)
│   ├── db.js                 # Koneksi database MySQL
│   ├── server.js             # API router & WebSocket broadcast
│   ├── .env                  # Konfigurasi port & database
│   └── package.json
├── frontend/                 # Web Dashboard Client (React + Vite)
│   ├── src/
│   │   ├── components/       # Komponen Map (Leaflet) & Chart (Recharts)
│   │   ├── pages/            # Public & Admin dashboards, Admin login
│   │   ├── App.jsx           # Main controller & navigation
│   │   └── index.css         # Styling modern premium (Vanilla CSS)
│   └── package.json
├── esp32_pdam_monitoring/    # Kode program Arduino IDE (.ino) untuk ESP32
│   └── esp32_pdam_monitoring.ino
└── database.sql              # Script database MySQL untuk XAMPP
```

---

## 🛠️ Langkah-Langkah Setup Sistem

### 1. Setup Database (XAMPP MySQL)
1. Aktifkan **Apache** dan **MySQL** di XAMPP Control Panel Anda.
2. Buka browser dan masuk ke **phpMyAdmin** (`http://localhost/phpmyadmin`).
3. Buat database baru bernama `pdam_monitoring`.
4. Pilih database tersebut, lalu buka menu **Import**.
5. Pilih file `database.sql` yang ada di root folder proyek ini, lalu klik **Go/Kirim**.
6. Database Anda sekarang telah siap dengan contoh data lokasi dan log awal.
   * Akun Admin Default:
     * **Username**: `admin`
     * **Password**: `admin123`

### 2. Setup Backend Server
1. Masuk ke terminal dan arahkan ke folder `backend`.
2. Jalankan perintah untuk menginstal dependensi:
   ```bash
   npm install
   ```
3. Sesuaikan konfigurasi database jika diperlukan pada file `.env`. (Konfigurasi bawaan sudah cocok dengan setelan XAMPP default).
4. Jalankan backend server:
   ```bash
   npm run dev
   ```
   Server akan berjalan di `http://localhost:5000` dan WebSocket di port yang sama.

### 3. Setup Frontend React
1. Buka terminal baru dan arahkan ke folder `frontend`.
2. Instal dependensi frontend:
   ```bash
   npm install
   ```
3. Jalankan server development React:
   ```bash
   npm run dev
   ```
4. Buka tautan lokal yang tampil di terminal (biasanya `http://localhost:5173`) di browser Anda.

---

## 📡 Integrasi Alat ESP32 & Kalibrasi Sensor

### ⚡ Skema Rangkaian (Wiring Diagram)
Karena sensor Water Pressure Transducer memerlukan tegangan **5V** untuk beroperasi dan mengeluarkan output analog **0.5V - 4.5V**, sedangkan pin input analog ESP32 maksimal hanya **3.3V**, Anda wajib membuat pembagi tegangan (voltage divider) menggunakan resistor agar pin ESP32 tidak rusak.

```text
[ Sensor VCC (5V) ]  ---> Hubungkan ke Output 5V / VIN ESP32 (jika dicolok USB)
[ Sensor GND ]       ---> Hubungkan ke Pin GND ESP32
[ Sensor OUT (Sig) ] ---> [ Resistor 10k Ohm ] ---> Pin GPIO 34 ESP32 (ADC)
                                               |
                                        [ Resistor 20k Ohm ]
                                               |
                                              GND
```

### ⚙️ Cara Kalibrasi Sensor di Arduino
Tegangan sensor dikonversikan secara linear ke Bar (maksimum kapasitas sensor adalah 12 Bar pada output 4.5V):
* **0.5 Volt** = 0 Bar (Tidak ada tekanan/aliran mati)
* **4.5 Volt** = 12 Bar (1.2 MPa)
* Rumus Linear: `Tekanan (Bar) = (Voltase - 0.5) * (12.0 / (4.5 - 0.5))`

### 💻 Pengaturan Program ESP32
1. Buka file `esp32_pdam_monitoring/esp32_pdam_monitoring.ino` menggunakan **Arduino IDE**.
2. Instal library **ArduinoJson** (Tools -> Manage Libraries -> Cari "ArduinoJson" oleh Benoit Blanchon, pilih versi terbaru dan instal).
3. Sesuaikan variabel berikut di dalam kode:
   * `ssid`: Nama jaringan WiFi Anda.
   * `password`: Kata sandi WiFi Anda.
   * `serverUrl`: Ganti `192.168.1.100` dengan alamat IP lokal komputer Anda tempat backend dijalankan.
4. Apabila alat fisik sensor belum dirakit, Anda dapat membiarkan `SIMULATION_MODE = true;` agar ESP32 mensimulasikan nilai tekanan air bergelombang secara otomatis untuk pengujian.
5. Upload kode ke board ESP32 Anda.

---

## 🧪 Menguji Sistem Tanpa Alat Fisik (Built-in Web Simulator)
Kami telah menyediakan panel simulator bawaan di web admin untuk mempermudah demonstrasi:
1. Masuk ke halaman **Login Admin** di pojok kanan atas website, gunakan `admin` dan `admin123`.
2. Di bagian bawah Dashboard Admin, Anda akan menemukan bagian **IoT Device Simulator**.
3. Pilih salah satu alat rumah terdaftar, sesuaikan slider tekanan air, lalu klik **Kirim Data Simulasi**.
4. Buka halaman **Dashboard Publik**, klik rumah yang Anda simulasikan di peta, dan lihat grafik serta nilai tekanan air berubah secara instan tanpa perlu me-refresh halaman!
