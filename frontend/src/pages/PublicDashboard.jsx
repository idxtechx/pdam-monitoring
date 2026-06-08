import React, { useState, useEffect, useRef } from 'react';
import { Activity, MapPin, AlertTriangle, Droplet, Compass, Clock } from 'lucide-react';
import MapComponent from '../components/MapComponent';
import ChartComponent from '../components/ChartComponent';

const PublicDashboard = () => {
  const [locations, setLocations] = useState([]);
  const [selectedLoc, setSelectedLoc] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wsStatus, setWsStatus] = useState('connecting');
  const [stats, setStats] = useState({ total: 0, normal: 0, warning: 0 });

  const wsRef = useRef(null);

  // Fetch initial locations and latest pressures
  const fetchLocations = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/locations');
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
        calculateStats(data);
      }
    } catch (error) {
      console.error('Gagal mengambil data lokasi:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch historical chart data for the selected location
  const fetchHistory = async (locId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/pressure/history/${locId}?limit=15`);
      if (res.ok) {
        const data = await res.json();
        setChartData(data);
      }
    } catch (error) {
      console.error('Gagal mengambil data riwayat:', error);
    }
  };

  // Calculate statistics (Total, Normal, Low/High Pressure)
  const calculateStats = (locList) => {
    let total = locList.length;
    let normal = 0;
    let warning = 0;

    locList.forEach(loc => {
      const p = loc.latest_pressure_bar !== null ? parseFloat(loc.latest_pressure_bar) : 0;
      const min = parseFloat(loc.min_threshold_bar);
      const max = parseFloat(loc.max_threshold_bar);
      
      if (p >= min && p <= max) {
        normal++;
      } else {
        warning++;
      }
    });

    setStats({ total, normal, warning });
  };

  useEffect(() => {
    fetchLocations();

    // Establish WebSocket Connection for realtime updates
    const connectWS = () => {
      const socket = new WebSocket('ws://localhost:5000');
      wsRef.current = socket;

      socket.onopen = () => {
        setWsStatus('connected');
        console.log('Connected to WebSocket server');
      };

      socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'PRESSURE_UPDATE') {
          const updatedLog = msg.data;

          // 1. Update the locations list state with new pressure value
          setLocations(prev => {
            const nextList = prev.map(loc => {
              if (loc.id === updatedLog.location_id) {
                return {
                  ...loc,
                  latest_pressure_bar: updatedLog.pressure_bar,
                  latest_pressure_psi: updatedLog.pressure_psi,
                  latest_recorded_at: updatedLog.recorded_at
                };
              }
              return loc;
            });
            calculateStats(nextList);
            return nextList;
          });

          // 2. If this updated location is currently selected, add to chart data
          setSelectedLoc(current => {
            if (current && current.id === updatedLog.location_id) {
              setChartData(history => {
                const updatedHistory = [...history, {
                  pressure_bar: updatedLog.pressure_bar,
                  pressure_psi: updatedLog.pressure_psi,
                  recorded_at: updatedLog.recorded_at
                }];
                // Limit chart data to last 15 entries
                if (updatedHistory.length > 15) {
                  updatedHistory.shift();
                }
                return updatedHistory;
              });

              return {
                ...current,
                latest_pressure_bar: updatedLog.pressure_bar,
                latest_pressure_psi: updatedLog.pressure_psi,
                latest_recorded_at: updatedLog.recorded_at
              };
            }
            return current;
          });
        }
      };

      socket.onclose = () => {
        setWsStatus('disconnected');
        console.log('Disconnected from WebSocket. Attempting reconnection...');
        setTimeout(connectWS, 3000); // Auto-reconnect after 3 seconds
      };

      socket.onerror = (err) => {
        console.error('WebSocket Error:', err);
        socket.close();
      };
    };

    connectWS();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // When a user selects a location pin on map or list
  const handleSelectLocation = (loc) => {
    setSelectedLoc(loc);
    fetchHistory(loc.id);
  };

  // Helper to determine status color classes
  const getPressureStatus = (loc) => {
    if (!loc) return { text: 'Tidak Ada Data', class: 'danger', color: 'var(--text-muted)' };
    const p = loc.latest_pressure_bar !== null ? parseFloat(loc.latest_pressure_bar) : 0;
    const min = parseFloat(loc.min_threshold_bar);
    const max = parseFloat(loc.max_threshold_bar);

    if (p === 0 || p === null) return { text: 'Mati / Offline', class: 'danger', color: 'var(--text-muted)' };
    if (p < 0.3) return { text: 'Aliran Kritis', class: 'danger', color: 'var(--danger)' };
    if (p < min) return { text: 'Tekanan Rendah', class: 'warning', color: 'var(--warning)' };
    if (p > max) return { text: 'Tekanan Tinggi', class: 'danger', color: 'var(--danger)' };
    return { text: 'Normal', class: 'normal', color: 'var(--success)' };
  };

  const currentStatus = getPressureStatus(selectedLoc);

  return (
    <div className="main-content">
      {/* Realtime Status Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--dark-navy)' }}>
            Monitoring Tekanan Air PDAM
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Data tekanan air pipa distribusi rumah tangga secara langsung (realtime).
          </p>
        </div>
        
        {/* WS Connection Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          backgroundColor: wsStatus === 'connected' ? 'var(--success-light)' : 'var(--danger-light)',
          color: wsStatus === 'connected' ? 'var(--success)' : 'var(--danger)',
          padding: '0.5rem 1rem',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.8rem',
          fontWeight: 700
        }}>
          <Activity size={14} className={wsStatus === 'connected' ? 'pulse' : ''} />
          {wsStatus === 'connected' ? 'Sinkronisasi Realtime Aktif' : 'Terputus dari Server'}
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <Compass size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Rumah Terpasang</span>
            <span className="stat-value">{stats.total} Rumah</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <Droplet size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Alat Status Normal</span>
            <span className="stat-value">{stats.normal} Rumah</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon red">
            <AlertTriangle size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Peringatan Tekanan</span>
            <span className="stat-value">{stats.warning} Rumah</span>
          </div>
        </div>
      </div>

      {/* Map & Detail Cards */}
      <div className="dashboard-grid">
        {/* Peta Interactive Map */}
        <div className="map-container-box">
          <div className="map-header">
            <div className="section-title">
              <MapPin size={20} color="var(--primary)" />
              Peta Sebaran Alat Monitoring
            </div>
            <div className="map-legend">
              <div className="legend-item"><span className="legend-color legend-green"></span>Normal</div>
              <div className="legend-item"><span className="legend-color legend-yellow"></span>Rendah</div>
              <div className="legend-item"><span className="legend-color legend-red"></span>Mati/Tinggi</div>
            </div>
          </div>
          <div className="leaflet-container-wrapper">
            {loading ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Memuat Peta...
              </div>
            ) : (
              <MapComponent 
                locations={locations} 
                selectedLocation={selectedLoc} 
                onSelectLocation={handleSelectLocation}
              />
            )}
          </div>
        </div>

        {/* Sidebar Detail Air Rumah */}
        <div className="detail-panel">
          {!selectedLoc ? (
            <div className="empty-detail-state">
              <Droplet size={64} color="var(--primary)" style={{ strokeWidth: 1.5 }} />
              <div style={{ fontWeight: 700, color: 'var(--dark-navy)', fontSize: '1.1rem' }}>Pilih Rumah di Peta</div>
              <p style={{ fontSize: '0.85rem' }}>Klik salah satu marker pin air di peta untuk melihat tekanan air realtime dan analisis grafik.</p>
            </div>
          ) : (
            <>
              {/* House Title Header */}
              <div className="house-header">
                <div>
                  <h3 className="house-title">{selectedLoc.name}</h3>
                  <div className="house-address">
                    <MapPin size={14} />
                    {selectedLoc.address}
                  </div>
                </div>
                <span className={`status-badge ${currentStatus.class}`}>
                  {currentStatus.text}
                </span>
              </div>

              {/* Digital Gauges */}
              <div className="pressure-readings-wrapper">
                <div className="pressure-gauge-card bar">
                  <span className="gauge-unit">Bar (Tekanan)</span>
                  <div className="gauge-value pulse">
                    {selectedLoc.latest_pressure_bar !== null 
                      ? parseFloat(selectedLoc.latest_pressure_bar).toFixed(2) 
                      : '0.00'}
                  </div>
                </div>
                <div className="pressure-gauge-card psi">
                  <span className="gauge-unit">PSI (Tekanan)</span>
                  <div className="gauge-value">
                    {selectedLoc.latest_pressure_psi !== null 
                      ? parseFloat(selectedLoc.latest_pressure_psi).toFixed(1) 
                      : '0.0'}
                  </div>
                </div>
              </div>

              {/* Device Metadata */}
              <div className="device-meta-info">
                <div className="meta-row">
                  <span className="meta-label">ID Alat ESP32</span>
                  <span className="meta-value">{selectedLoc.esp32_device_id}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Batas Normal</span>
                  <span className="meta-value">
                    {selectedLoc.min_threshold_bar} - {selectedLoc.max_threshold_bar} Bar
                  </span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Pembacaan Terakhir</span>
                  <span className="meta-value" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={12} />
                    {selectedLoc.latest_recorded_at 
                      ? new Date(selectedLoc.latest_recorded_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                      : 'Belum ada data'}
                  </span>
                </div>
              </div>

              {/* Realtime Pressure Chart */}
              <div className="chart-box-wrapper">
                <h4 className="chart-title">Grafik Tren Tekanan Air (Realtime)</h4>
                <div className="chart-container">
                  <ChartComponent data={chartData} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicDashboard;
