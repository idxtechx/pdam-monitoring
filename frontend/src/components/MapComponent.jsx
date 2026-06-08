import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix for default Leaflet icon pathing issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper component to recenter map when selected location changes
const RecenterMap = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.setView(coords, 15, { animate: true });
    }
  }, [coords, map]);
  return null;
};

// Component to handle map clicks for coordinate selection in admin view
const MapClickHandler = ({ enabled, onSelect }) => {
  useMapEvents({
    click(e) {
      if (enabled && onSelect) {
        onSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

// Custom Marker Pin with dynamic color based on water pressure
const createDropletIcon = (pressure, min, max) => {
  let color = 'hsl(217, 91%, 56%)'; // Default blue (normal)
  
  if (pressure === 0 || pressure === null || pressure === undefined) {
    color = 'hsl(215, 16%, 47%)'; // Slate gray (offline/no data)
  } else if (pressure < 0.30) {
    color = 'hsl(346, 84%, 48%)'; // Rose red (no flow / critical low)
  } else if (pressure < min) {
    color = 'hsl(38, 92%, 50%)'; // Amber (warning low pressure)
  } else if (pressure > max) {
    color = 'hsl(346, 84%, 48%)'; // Rose red (danger high pressure)
  } else {
    color = 'hsl(142, 72%, 40%)'; // Emerald green (healthy pressure)
  }

  return L.divIcon({
    html: `
      <div class="marker-pin" style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #ffffff;
        box-shadow: 0 4px 10px rgba(0,0,0,0.15);
      ">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(45deg); width: 14px; height: 14px;">
          <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z"/>
        </svg>
      </div>
    `,
    className: 'custom-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

const MapComponent = ({ 
  locations = [], 
  selectedLocation = null, 
  onSelectLocation = null,
  isAdminSelect = false,
  onCoordsSelected = null,
  tempCoords = null
}) => {
  // Center of map defaults to Karangpandan, Karanganyar area
  const defaultCenter = [-7.6315, 111.0592]; 
  const defaultZoom = 14;

  const activeCenter = selectedLocation 
    ? [parseFloat(selectedLocation.latitude), parseFloat(selectedLocation.longitude)]
    : (tempCoords ? [tempCoords.latitude, tempCoords.longitude] : defaultCenter);

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '400px' }}>
      <MapContainer 
        center={activeCenter} 
        zoom={defaultZoom} 
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Recenter helper */}
        {selectedLocation && (
          <RecenterMap coords={[parseFloat(selectedLocation.latitude), parseFloat(selectedLocation.longitude)]} />
        )}

        {/* Click handler for selecting coordinates in admin panel */}
        <MapClickHandler enabled={isAdminSelect} onSelect={onCoordsSelected} />

        {/* Temporary marker when admin is adding/editing location */}
        {isAdminSelect && tempCoords && (
          <Marker 
            position={[tempCoords.latitude, tempCoords.longitude]}
            icon={L.icon({
              iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41]
            })}
          >
            <Popup>
              <div style={{ textAlign: 'center' }}>
                <strong>Lokasi Baru Terpilih</strong><br />
                Lat: {tempCoords.latitude.toFixed(6)}<br />
                Lng: {tempCoords.longitude.toFixed(6)}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Render normal locations markers */}
        {!isAdminSelect && locations.map((loc) => {
          const lat = parseFloat(loc.latitude);
          const lng = parseFloat(loc.longitude);
          
          if (isNaN(lat) || isNaN(lng)) return null;

          const isSelected = selectedLocation && selectedLocation.id === loc.id;
          const currentPressure = loc.latest_pressure_bar !== undefined ? parseFloat(loc.latest_pressure_bar) : 0;

          return (
            <Marker
              key={loc.id}
              position={[lat, lng]}
              icon={createDropletIcon(currentPressure, parseFloat(loc.min_threshold_bar), parseFloat(loc.max_threshold_bar))}
              eventHandlers={{
                click: () => {
                  if (onSelectLocation) onSelectLocation(loc);
                },
              }}
            >
              <Popup>
                <div style={{ fontFamily: 'sans-serif' }}>
                  <div class="map-popup-title">{loc.name}</div>
                  <div class="map-popup-text">{loc.address}</div>
                  <div style={{ marginTop: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Tekanan:</span>
                    <span style={{ 
                      color: currentPressure >= parseFloat(loc.min_threshold_bar) && currentPressure <= parseFloat(loc.max_threshold_bar)
                        ? 'var(--success)'
                        : (currentPressure < 0.30 ? 'var(--danger)' : 'var(--warning)'),
                      fontSize: '0.85rem'
                    }}>
                      {currentPressure.toFixed(2)} Bar ({ (currentPressure * 14.5038).toFixed(1) } PSI)
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default MapComponent;
