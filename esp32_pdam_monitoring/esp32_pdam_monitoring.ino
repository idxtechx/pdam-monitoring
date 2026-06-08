/**
 * Program ESP32 - Monitoring Tekanan Air PDAM Realtime
 * 
 * Deskripsi:
 * Program ini membaca data analog dari Water Pressure Transducer sensor,
 * melakukan kalibrasi tegangan ke satuan Bar, lalu mengirimkannya via 
 * HTTP POST request ke Server Backend secara berkala.
 * 
 * Dilengkapi dengan "SIMULATION_MODE" untuk pengujian tanpa sensor fisik.
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h> // Pastikan Anda sudah menginstal library "ArduinoJson" oleh Benoit Blanchon di Arduino IDE

// ==========================================
// KONSITURASI WIFI & SERVER API
// ==========================================
const char* ssid = "NAMA_WIFI_ANDA";
const char* password = "PASSWORD_WIFI_ANDA";

// Masukkan IP lokal komputer server Anda (Cari dengan: ipconfig di cmd Windows / ifconfig di Mac terminal)
// Ganti 'localhost' dengan IP Address lokal, karena ESP32 tidak bisa mengakses 'localhost'
const char* serverUrl = "http://192.168.1.100:5000/api/pressure/log"; 

// ID Alat Unik (Harus sama dengan yang terdaftar di Dashboard Admin)
const char* deviceId = "ESP32-PDAM-001";

// ==========================================
// KONSITURASI HARDWARE SENSOR
// ==========================================
const int sensorPin = 34; // Pin ADC ESP32 (Gunakan pin input analog seperti GPIO 34, 35, 36, 39)
const float adcMaxVoltage = 3.3; // Tegangan referensi ADC ESP32 (3.3V)
const int adcResolution = 4095;  // Resolusi ADC ESP32 (12-bit, range 0 - 4095)

// Nilai Resistor Pembagi Tegangan (Voltage Divider)
// Sensor mengeluarkan 0.5V - 4.5V. Pin ESP32 hanya aman menerima max 3.3V.
// Skema: [Sensor Out] -- [Resistor 10k] -- [Pin ESP32 (ADC)] -- [Resistor 20k] -- [GND]
const float r1 = 10000.0; // 10k Ohm
const float r2 = 20000.0; // 20k Ohm
const float dividerRatio = r2 / (r1 + r2); // 20k / (10k + 20k) = 0.667

// Spesifikasi Sensor Water Pressure Transducer
// Output linear: 0.5V = 0 Bar, 4.5V = 12 Bar (1.2 MPa)
const float minSensorVoltage = 0.5; // Tegangan sensor saat 0 Bar
const float maxSensorVoltage = 4.5; // Tegangan sensor saat 12 Bar
const float maxPressureBar = 12.0;  // Kapasitas maksimum sensor

// ==========================================
// FITUR SIMULASI (Set ke true jika sensor belum dirakit)
// ==========================================
const bool SIMULATION_MODE = true; 
const int sendIntervalMs = 5000; // Interval pengiriman data (5 detik)

unsigned long lastSendTime = 0;
float simAngle = 0.0; // Digunakan untuk mensimulasikan kurva tekanan sinus

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  // Inisialisasi WiFi
  Serial.println("\n--- Memulai Inisialisasi WiFi ---");
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\n✅ WiFi Terhubung!");
  Serial.print("IP Address ESP32: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // Mengecek apakah sudah masuk interval waktu kirim data
  if (millis() - lastSendTime >= sendIntervalMs) {
    lastSendTime = millis();
    
    float pressureBar = 0.0;

    if (SIMULATION_MODE) {
      // 1. MODE SIMULASI: Membuat nilai tekanan dinamis (bergelombang antara 0.2 Bar sampai 2.8 Bar)
      simAngle += 0.2;
      pressureBar = 1.5 + (sin(simAngle) * 1.3);
      if (pressureBar < 0.0) pressureBar = 0.0;
      
      Serial.print("[SIMULASI] Menghasilkan tekanan air: ");
      Serial.print(pressureBar);
      Serial.println(" Bar");
    } else {
      // 2. MODE AKTIF (SENSOR FISIK):
      int adcVal = analogRead(sensorPin);
      
      // Hitung tegangan yang masuk ke pin ESP32 (V_adc)
      float vAdc = (adcVal * adcMaxVoltage) / adcResolution;
      
      // Rekonstruksi tegangan asli keluaran sensor sebelum masuk ke pembagi tegangan (V_sensor)
      float vSensor = vAdc / dividerRatio;
      
      // Kalibrasi Tegangan ke Bar menggunakan linear mapping formula
      if (vSensor <= minSensorVoltage) {
        pressureBar = 0.0; // Tekanan 0 jika tegangan dibawah batas bawah
      } else {
        // Rumus: (V_sensor - V_min) * (Bar_max / (V_max - V_min))
        pressureBar = (vSensor - minSensorVoltage) * (maxPressureBar / (maxSensorVoltage - minSensorVoltage));
      }
      
      Serial.print("[SENSOR] ADC: ");
      Serial.print(adcVal);
      Serial.print(" | V_pin: ");
      Serial.print(vAdc);
      Serial.print("V | V_sensor: ");
      Serial.print(vSensor);
      Serial.print("V | Tekanan: ");
      Serial.print(pressureBar);
      Serial.println(" Bar");
    }
    
    // Kirim data ke database backend server via HTTP POST
    if (WiFi.status() == WL_CONNECTED) {
      sendPressureToServer(pressureBar);
    } else {
      Serial.println("⚠️ Koneksi WiFi terputus! Gagal mengirim data.");
      // Mencoba hubungkan ulang WiFi
      WiFi.disconnect();
      WiFi.begin(ssid, password);
    }
  }
}

// Fungsi pengiriman HTTP POST dengan payload JSON
void sendPressureToServer(float pressureVal) {
  HTTPClient http;
  
  // Membuka koneksi HTTP
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  
  // Membuat Payload JSON menggunakan ArduinoJson
  StaticJsonDocument<200> doc;
  doc["device_id"] = deviceId;
  // Membulatkan nilai tekanan ke 2 desimal belakang koma
  doc["pressure_bar"] = double(round(pressureVal * 100.0) / 100.0);
  
  String requestBody;
  serializeJson(doc, requestBody);
  
  Serial.print("Mengirim data JSON: ");
  Serial.println(requestBody);
  
  // Mengirim request POST
  int httpResponseCode = http.POST(requestBody);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("Respon Server [HTTP ");
    Serial.print(httpResponseCode);
    Serial.print("]: ");
    Serial.println(response);
  } else {
    Serial.print("❌ Gagal mengirim POST. Error code: ");
    Serial.println(http.errorToString(httpResponseCode).c_str());
  }
  
  // Menutup koneksi
  http.end();
}
