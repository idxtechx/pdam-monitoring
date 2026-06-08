import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Send, Terminal, Settings, MapPin, AlertCircle, RefreshCw } from 'lucide-react';
import MapComponent from '../components/MapComponent';

const AdminDashboard = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [currentId, setCurrentId] = useState(null);
  
  // Form State
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formLat, setFormLat] = useState('');
  const [formLng, setFormLng] = useState('');
  const [formDeviceId, setFormDeviceId] = useState('');
  const [formMinBar, setFormMinBar] = useState(0.50);
  const [formMaxBar, setFormMaxBar] = useState(4.00);
  
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  // Simulator State
  const [simDevice, setSimDevice] = useState('');
  const [simPressure, setSimPressure] = useState(1.5);
  const [simLogs, setSimLogs] = useState([]);
  const [simulating, setSimulating] = useState(false);

  // Fetch Locations
  const fetchLocations = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/locations');
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
        // Default simulator selection if not set
        if (data.length > 0 && !simDevice) {
          setSimDevice(data[0].esp32_device_id);
        }
      }
    } catch (err) {
      console.error(err);
      alert('Gagal menyambung ke server API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const getHeaders = () => {
    const token = localStorage.getItem('adminToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Open Modal for Add
  const handleOpenAdd = () => {
    setModalMode('add');
    setCurrentId(null);
    setFormName('');
    setFormAddress('');
    setFormLat('');
    setFormLng('');
    setFormDeviceId('');
    setFormMinBar(0.50);
    setFormMaxBar(4.00);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (loc) => {
    setModalMode('edit');
    setCurrentId(loc.id);
    setFormName(loc.name);
    setFormAddress(loc.address);
    setFormLat(parseFloat(loc.latitude));
    setFormLng(parseFloat(loc.longitude));
    setFormDeviceId(loc.esp32_device_id);
    setFormMinBar(parseFloat(loc.min_threshold_bar));
    setFormMaxBar(parseFloat(loc.max_threshold_bar));
    setErrorMsg('');
    setIsModalOpen(true);
  };

  // Click handler on map inside modal to auto-populate coordinates
  const handleMapCoordsSelected = (lat, lng) => {
    setFormLat(parseFloat(lat.toFixed(6)));
    setFormLng(parseFloat(lng.toFixed(6)));
  };

  // Save changes (Create or Update)
  const handleSaveLocation = async (e) => {
    e.preventDefault();
    if (!formName || !formAddress || formLat === '' || formLng === '' || !formDeviceId) {
      setErrorMsg('Semua kolom wajib diisi.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    const payload = {
      name: formName,
      address: formAddress,
      latitude: parseFloat(formLat),
      longitude: parseFloat(formLng),
      esp32_device_id: formDeviceId,
      min_threshold_bar: parseFloat(formMinBar),
      max_threshold_bar: parseFloat(formMaxBar)
    };

    try {
      const url = modalMode === 'add' 
        ? 'http://localhost:5000/api/locations' 
        : `http://localhost:5000/api/locations/${currentId}`;
        
      const method = modalMode === 'add' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        setIsModalOpen(false);
        fetchLocations();
      } else {
        setErrorMsg(data.message || 'Gagal menyimpan lokasi.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal menyambung ke server.');
    } finally {
      setSaving(false);
    }
  };

  // Delete Location
  const handleDeleteLocation = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus lokasi monitoring ini? Semua data log terkait akan ikut terhapus.')) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/locations/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (res.ok) {
        fetchLocations();
      } else {
        const data = await res.json();
        alert(data.message || 'Gagal menghapus lokasi.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan koneksi.');
    }
  };

  // Send Simulation Data
  const handleSendSimulation = async () => {
    if (!simDevice) {
      alert('Tidak ada device terpilih untuk simulasi.');
      return;
    }

    setSimulating(true);
    try {
      const res = await fetch('http://localhost:5000/api/pressure/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: simDevice,
          pressure_bar: parseFloat(simPressure)
        })
      });

      const data = await res.json();

      if (res.ok) {
        const logMsg = `[${new Date().toLocaleTimeString()}] SUKSES - Mengirim ${data.log.pressure_bar} Bar (${data.log.pressure_psi} PSI) ke ${data.log.name}`;
        setSimLogs(prev => [logMsg, ...prev].slice(0, 5));
      } else {
        const logMsg = `[${new Date().toLocaleTimeString()}] GAGAL - ${data.message}`;
        setSimLogs(prev => [logMsg, ...prev].slice(0, 5));
      }
    } catch (err) {
      const logMsg = `[${new Date().toLocaleTimeString()}] ERROR - Koneksi backend gagal`;
      setSimLogs(prev => [logMsg, ...prev].slice(0, 5));
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-grid">
        
        {/* Top Header Controls */}
        <div className="admin-top-bar">
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--dark-navy)' }}>
              Manajemen Titik Monitoring
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Tambah, edit, atau hapus lokasi pemasangan alat sensor tekanan air.
            </p>
          </div>
          <button className="btn-add" onClick={handleOpenAdd}>
            <Plus size={18} />
            Tambah Titik Baru
          </button>
        </div>

        {/* Data Table */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="section-title">
              <Settings size={18} color="var(--primary)" />
              Daftar Lokasi Alat PDAM
            </h3>
            <button 
              onClick={fetchLocations}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.8rem',
                fontWeight: 700
              }}
            >
              <RefreshCw size={14} /> Refresh Data
            </button>
          </div>

          <div className="table-responsive">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                Memuat data lokasi...
              </div>
            ) : locations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                Belum ada lokasi monitoring terdaftar. Silakan tambahkan titik baru.
              </div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nama Lokasi / Rumah</th>
                    <th>Alamat</th>
                    <th>Device ID (ESP32)</th>
                    <th>Koordinat (Lat, Lng)</th>
                    <th>Batas Normal (Bar)</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((loc) => (
                    <tr key={loc.id}>
                      <td style={{ fontWeight: 700, color: 'var(--dark-navy)' }}>{loc.name}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{loc.address}</td>
                      <td>
                        <span style={{ 
                          fontFamily: 'monospace', 
                          backgroundColor: 'var(--bg-tertiary)', 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}>
                          {loc.esp32_device_id}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {parseFloat(loc.latitude).toFixed(5)}, {parseFloat(loc.longitude).toFixed(5)}
                      </td>
                      <td>{loc.min_threshold_bar} - {loc.max_threshold_bar} Bar</td>
                      <td className="actions-cell">
                        <button className="btn-edit" onClick={() => handleOpenEdit(loc)}>
                          <Edit size={12} /> Edit
                        </button>
                        <button className="btn-delete" onClick={() => handleDeleteLocation(loc.id)}>
                          <Trash2 size={12} /> Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Simulator Panel */}
        <div className="simulator-panel">
          <h3 className="simulator-header">
            <Terminal size={18} />
            IoT Device Simulator (ESP32 POST)
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '-0.5rem' }}>
            Simulasikan pengiriman data dari alat ESP32 untuk memvalidasi pembaruan grafik dan peta secara realtime.
          </p>
          <div className="simulator-body">
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Pilih Alat Sensor (ESP32 ID)</label>
              <select 
                className="select-input"
                value={simDevice}
                onChange={(e) => setSimDevice(e.target.value)}
              >
                {locations.map(loc => (
                  <option key={loc.id} value={loc.esp32_device_id}>
                    {loc.name} ({loc.esp32_device_id})
                  </option>
                ))}
                {locations.length === 0 && <option value="">Belum ada lokasi terdaftar</option>}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.75rem' }}>
                Nilai Tekanan Air: <strong style={{ color: 'var(--primary)' }}>{simPressure} Bar</strong>
              </label>
              <input 
                type="range"
                min="0"
                max="5"
                step="0.05"
                style={{ width: '100%', height: '38px', cursor: 'pointer' }}
                value={simPressure}
                onChange={(e) => setSimPressure(parseFloat(e.target.value))}
              />
            </div>

            <button 
              className="btn-add" 
              style={{ width: '100%', height: '42px', justifyContent: 'center' }}
              onClick={handleSendSimulation}
              disabled={simulating || locations.length === 0}
            >
              <Send size={14} /> {simulating ? 'Mengirim...' : 'Kirim Data Simulasi'}
            </button>
          </div>

          <div style={{ marginTop: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Simulator Console Output:
            </div>
            <div className="simulator-log">
              {simLogs.length === 0 ? (
                <div style={{ opacity: 0.5 }}>console idle... data simulator belum dikirim.</div>
              ) : (
                simLogs.map((log, i) => <div key={i}>{log}</div>)
              )}
            </div>
          </div>
        </div>

      </div>

      {/* CRUD MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontWeight: 800, color: 'var(--dark-navy)' }}>
                {modalMode === 'add' ? 'Tambah Titik Monitoring Baru' : 'Edit Titik Monitoring'}
              </h3>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveLocation}>
              <div className="modal-body">
                {errorMsg && (
                  <div className="error-banner">
                    <AlertCircle size={16} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Nama Pemilik / Lokasi</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ paddingLeft: '1rem' }}
                      placeholder="Contoh: Rumah Budi"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">ID Device ESP32 (Unique Key)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ paddingLeft: '1rem' }}
                      placeholder="Contoh: ESP32-PDAM-001"
                      value={formDeviceId}
                      onChange={(e) => setFormDeviceId(e.target.value)}
                      disabled={modalMode === 'edit'} // Lock device ID on edit
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Alamat Lengkap</label>
                  <textarea 
                    className="form-input" 
                    style={{ paddingLeft: '1rem', minHeight: '60px', resize: 'vertical' }}
                    placeholder="Masukkan alamat lengkap"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                  />
                </div>

                {/* Coordinate Fields */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Latitude</label>
                    <input 
                      type="number" 
                      step="0.000001"
                      className="form-input" 
                      style={{ paddingLeft: '1rem' }}
                      placeholder="-6.9175"
                      value={formLat}
                      onChange={(e) => setFormLat(e.target.value)}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Longitude</label>
                    <input 
                      type="number" 
                      step="0.000001"
                      className="form-input" 
                      style={{ paddingLeft: '1rem' }}
                      placeholder="107.6191"
                      value={formLng}
                      onChange={(e) => setFormLng(e.target.value)}
                    />
                  </div>
                </div>

                {/* Threshold limits */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Batas Min Tekanan Normal (Bar)</label>
                    <input 
                      type="number" 
                      step="0.05"
                      className="form-input" 
                      style={{ paddingLeft: '1rem' }}
                      value={formMinBar}
                      onChange={(e) => setFormMinBar(e.target.value)}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Batas Maks Tekanan Normal (Bar)</label>
                    <input 
                      type="number" 
                      step="0.05"
                      className="form-input" 
                      style={{ paddingLeft: '1rem' }}
                      value={formMaxBar}
                      onChange={(e) => setFormMaxBar(e.target.value)}
                    />
                  </div>
                </div>

                {/* Interactive Map Picker inside Modal */}
                <div className="form-group">
                  <label className="form-label">
                    Pilih Koordinat via Peta <span className="map-picker-help">(Klik di peta untuk mengisi otomatis)</span>
                  </label>
                  <div style={{ height: '200px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                    <MapComponent 
                      isAdminSelect={true}
                      onCoordsSelected={handleMapCoordsSelected}
                      tempCoords={formLat && formLng ? { latitude: parseFloat(formLat), longitude: parseFloat(formLng) } : null}
                    />
                  </div>
                </div>

              </div>

              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn-add" disabled={saving}>
                  {saving ? 'Menyimpan...' : 'Simpan Lokasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
