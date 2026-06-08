-- Skema Database Sistem Monitoring Tekanan Air PDAM
-- Import file ini ke phpMyAdmin (MySQL XAMPP)

CREATE DATABASE IF NOT EXISTS `pdam_monitoring` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `pdam_monitoring`;

-- 1. Tabel Admins
CREATE TABLE IF NOT EXISTS `admins` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Tabel Locations (Titik Rumah Terpasang)
CREATE TABLE IF NOT EXISTS `locations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `address` TEXT NOT NULL,
  `latitude` DECIMAL(10, 8) NOT NULL,
  `longitude` DECIMAL(11, 8) NOT NULL,
  `esp32_device_id` VARCHAR(50) NOT NULL UNIQUE,
  `min_threshold_bar` DECIMAL(4, 2) DEFAULT 0.50,
  `max_threshold_bar` DECIMAL(4, 2) DEFAULT 4.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Tabel Pressure Logs (Log Tekanan Air)
CREATE TABLE IF NOT EXISTS `pressure_logs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `location_id` INT NOT NULL,
  `pressure_bar` DECIMAL(5, 2) NOT NULL,
  `pressure_psi` DECIMAL(5, 2) NOT NULL,
  `recorded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Indeks untuk optimasi query pembacaan data realtime dan grafik
CREATE INDEX idx_location_recorded ON pressure_logs(location_id, recorded_at DESC);

-- Seeding Default Admin (username: admin, password: admin123)
-- Hash bcrypt untuk 'admin123' adalah: $2a$10$yXJO1yPnxs97YCuba3oYOO12YVM6IyIUqnPkuiSWW2ICbB3ZQSkNO
INSERT INTO `admins` (`username`, `password`) 
VALUES ('admin', '$2a$10$yXJO1yPnxs97YCuba3oYOO12YVM6IyIUqnPkuiSWW2ICbB3ZQSkNO')
ON DUPLICATE KEY UPDATE `username`=`username`;

-- Seeding Beberapa Contoh Lokasi Rumah (Kecamatan Karangpandan, Karanganyar)
INSERT INTO `locations` (`name`, `address`, `latitude`, `longitude`, `esp32_device_id`, `min_threshold_bar`, `max_threshold_bar`) VALUES
('Rumah Budi - Karangpandan', 'Jl. Lawu No. 12, Karangpandan, Karanganyar', -7.630500, 111.055000, 'ESP32-PDAM-001', 0.50, 4.00),
('Rumah Siti - Tohkuning', 'Dusun Tohkuning, Karangpandan, Karanganyar', -7.642000, 111.062000, 'ESP32-PDAM-002', 0.80, 4.00),
('Rumah Asep - Harjosari', 'Dusun Harjosari, Karangpandan, Karanganyar', -7.621000, 111.051000, 'ESP32-PDAM-003', 0.50, 3.50)
ON DUPLICATE KEY UPDATE `esp32_device_id`=`esp32_device_id`;

-- Seeding Beberapa Dummy Log Data awal untuk contoh grafik
-- Budi
INSERT INTO `pressure_logs` (`location_id`, `pressure_bar`, `pressure_psi`, `recorded_at`) VALUES
(1, 1.20, 17.40, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
(1, 1.15, 16.68, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(1, 1.30, 18.85, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(1, 1.25, 18.13, NOW());

-- Siti
INSERT INTO `pressure_logs` (`location_id`, `pressure_bar`, `pressure_psi`, `recorded_at`) VALUES
(2, 2.10, 30.45, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
(2, 2.20, 31.90, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(2, 1.95, 28.28, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(2, 2.05, 29.73, NOW());

-- Asep
INSERT INTO `pressure_logs` (`location_id`, `pressure_bar`, `pressure_psi`, `recorded_at`) VALUES
(3, 0.45, 6.53, DATE_SUB(NOW(), INTERVAL 3 HOUR)), -- Tekanan rendah
(3, 0.40, 5.80, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(3, 0.55, 7.98, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(3, 0.60, 8.70, NOW());
