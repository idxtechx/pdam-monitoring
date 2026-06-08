# 🔌 Panduan Lengkap Perakitan Hardware & Jaringan Lokal (ESP32)

Panduan ini berisi panduan teknis mendetail tentang perakitan rangkaian pembagi tegangan (voltage divider) untuk sensor tekanan air serta cara mencari IP Address lokal agar ESP32 dapat mengirimkan data ke backend server komputer Anda.

---

## ⚡ BAGIAN 1: Rangkaian Pembagi Tegangan (Voltage Divider)

### 1. Mengapa Pembagi Tegangan Diperlukan?
Sensor **Water Pressure Transducer** bekerja dengan tegangan input 5V dan menghasilkan output analog linier sebesar **0.5V s.d 4.5V** tergantung tekanan air. 
Namun, mikrokontroler **ESP32** bekerja pada tegangan 3.3V, sehingga pin analognya (ADC) **hanya aman menerima tegangan maksimal 3.3V**. 

Jika Anda menghubungkan langsung kabel signal sensor (4.5V) ke pin ESP32, pin tersebut dapat mengalami kerusakan permanen (terbakar). Oleh karena itu, kita menggunakan rangkaian pembagi tegangan menggunakan 2 resistor untuk menurunkan tegangan 4.5V menjadi maksimal 3.0V.

### 2. Kebutuhan Komponen
* 1x Mikrokontroler ESP32
* 1x Sensor Water Pressure Transducer (tipe 3-kabel: VCC, GND, OUT)
* 1x Resistor **10k Ohm** (sebagai $R_1$)
* 1x Resistor **20k Ohm** (sebagai $R_2$)
* Kabel jumper & Breadboard

### 3. Skema Rangkaian
Berikut adalah cara merangkai kabelnya:

```text
                                 [ Resistor 10k Ohm (R1) ]
                                      +---------+
 Sensor OUT (Signal) -----------------|         |--------------+ (Titik A)
                                      +---------+              |
                                                               |
                                 [ Resistor 20k Ohm (R2) ]     |
                                      +---------+              |
        GND (ESP32) ------------------|         |--------------+
                                      +---------+              |
                                                               |
        Pin GPIO 34 (ADC ESP32) <------------------------------+
```

**Koneksi Pin demi Pin:**
1. Hubungkan kabel **Merah (VCC)** sensor ke pin **VIN / 5V** pada ESP32.
2. Hubungkan kabel **Hitam (GND)** sensor ke pin **GND** pada ESP32.
3. Hubungkan kabel **Kuning/Biru (Signal OUT)** sensor ke salah satu ujung **Resistor 10k Ohm ($R_1$)**.
4. Ujung lain dari **Resistor 10k Ohm** dihubungkan dengan salah satu ujung **Resistor 20k Ohm ($R_2$)**. Titik pertemuan kedua resistor ini (Titik A) dihubungkan ke pin **GPIO 34** (atau pin ADC lain) pada ESP32.
5. Ujung bebas **Resistor 20k Ohm** dihubungkan ke pin **GND** pada ESP32.

### 4. Analisis Perhitungan Tegangan
Rumus pembagi tegangan adalah:
$$V_{out} = V_{in} \times \left( \frac{R_2}{R_1 + R_2} \right)$$

* **Saat sensor mendeteksi tekanan 0 Bar (Tegangan output = 0.5V):**
  $$V_{out} = 0.5V \times \left( \frac{20k}{10k + 20k} \right) = 0.5V \times \frac{2}{3} \approx 0.33V$$
  *(Tegangan masuk ke GPIO 34 adalah 0.33V, sangat aman)*

* **Saat sensor mendeteksi tekanan Maksimal 12 Bar (Tegangan output = 4.5V):**
  $$V_{out} = 4.5V \times \left( \frac{20k}{10k + 20k} \right) = 4.5V \times \frac{2}{3} = 3.0V$$
  *(Tegangan masuk ke GPIO 34 adalah 3.0V, sangat aman karena masih di bawah batas maksimal ESP32 yaitu 3.3V)*

---

## 🌐 BAGIAN 2: Cara Mencari IP Address Lokal Komputer

Agar ESP32 dapat mengirim data ke backend server, ESP32 harus memanggil IP lokal komputer Anda (tidak bisa menggunakan `localhost` karena `localhost` merujuk pada dirinya sendiri di dalam ESP32).

> [!IMPORTANT]
> Komputer Anda (tempat backend berjalan) dan ESP32 **wajib terhubung pada jaringan Wi-Fi/Access Point yang SAMA**.

### 💻 Untuk Pengguna Windows:
1. Tekan tombol `Windows + R` di keyboard, ketik `cmd`, lalu tekan `Enter`.
2. Pada layar hitam Command Prompt, ketik perintah:
   ```cmd
   ipconfig
   ```
3. Tekan `Enter`. Cari bagian bernama **Wireless LAN adapter Wi-Fi** atau **Ethernet adapter**.
4. Cari baris **IPv4 Address**. Nilainya biasanya berformat seperti:
   `192.168.1.XX` atau `10.0.0.XX` (Contoh: `192.168.1.15`).
5. Catat alamat IP tersebut.

### 🍎 Untuk Pengguna macOS (Mac):
1. Buka aplikasi **Terminal** (bisa dicari melalui Spotlight Search dengan menekan `Cmd + Space`).
2. Ketik perintah berikut dan tekan `Enter`:
   ```bash
   ipconfig getifaddr en0
   ```
   *(Jika Anda tersambung lewat Wi-Fi, biasanya interface-nya adalah `en0` atau `en1`)*
3. Alamat IP lokal komputer Mac Anda akan langsung tercetak di bawahnya (Contoh: `192.168.1.12`).
4. **Cara Alternatif via Pengaturan:**
   * Buka **System Settings** -> **Wi-Fi**.
   * Klik tombol **Details...** di sebelah nama Wi-Fi yang sedang terhubung.
   * Alamat IP Anda akan tertera jelas pada menu detail tersebut.

---

## ✏️ Mengonfigurasi Kode ESP32

Setelah Anda mendapatkan alamat IP lokal komputer Anda (misalkan IP komputer Anda adalah `192.168.1.15`), buka program Arduino **[esp32_pdam_monitoring.ino](file:///Users/amfarhan/.gemini/antigravity/scratch/pdam-monitoring/esp32_pdam_monitoring/esp32_pdam_monitoring.ino)** di Arduino IDE, lalu lakukan perubahan berikut:

### 1. Masukkan Nama & Password Wi-Fi Rumah Anda:
```cpp
const char* ssid = "NAMA_WIFI_RUMAH_ANDA";
const char* password = "PASSWORD_WIFI_RUMAH_ANDA";
```

### 2. Ubah Alamat IP Server Sesuai IP Lokal Komputer Anda:
```cpp
// Ganti 192.168.1.100 dengan IP lokal komputer Anda yang dicari tadi
const char* serverUrl = "http://192.168.1.15:5000/api/pressure/log"; 
```

### 3. Matikan Mode Simulasi jika Menggunakan Sensor Fisik:
Jika Anda sudah merakit resistor dan sensor pada ESP32, ubah baris ini agar ESP32 membaca sensor fisik asli:
```cpp
const bool SIMULATION_MODE = false; // Ubah dari true menjadi false
```

Simpan file kode tersebut dan unggah (Upload) kembali ke ESP32 Anda. Sekarang ESP32 akan membaca tekanan air asli dari pipa dan mengirimkannya secara realtime ke dashboard website Anda!
