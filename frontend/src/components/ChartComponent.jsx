import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const timeString = new Date(data.recorded_at).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    return (
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '0.75rem 1rem',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-sm)',
        boxShadow: 'var(--shadow-md)',
        fontSize: '0.8rem'
      }}>
        <div style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Waktu: {timeString}</div>
        <div style={{ color: 'var(--primary)', fontWeight: 700 }}>
          Tekanan: {data.pressure_bar.toFixed(2)} Bar
        </div>
        <div style={{ color: '#6366f1', fontWeight: 600 }}>
          Tekanan: {data.pressure_psi.toFixed(1)} PSI
        </div>
      </div>
    );
  }
  return null;
};

const ChartComponent = ({ data = [] }) => {
  if (data.length === 0) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifycontent: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.85rem',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-md)',
        border: '1px dashed var(--border-color)',
        height: '180px'
      }}>
        Belum ada riwayat data untuk ditampilkan.
      </div>
    );
  }

  // Format the time strings for X-axis labels
  const formattedData = data.map(log => ({
    ...log,
    formattedTime: new Date(log.recorded_at).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    }),
    // Ensure numerical representation for charting
    pressure_bar: parseFloat(log.pressure_bar),
    pressure_psi: parseFloat(log.pressure_psi)
  }));

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart
          data={formattedData}
          margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorPressure" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
          <XAxis 
            dataKey="formattedTime" 
            tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 500 }}
            axisLine={{ stroke: 'var(--border-color)' }}
            tickLine={false}
          />
          <YAxis 
            domain={[0, 'dataMax + 0.5']}
            tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="pressure_bar" 
            stroke="var(--primary)" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorPressure)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ChartComponent;
