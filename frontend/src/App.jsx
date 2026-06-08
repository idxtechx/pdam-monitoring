import React, { useState, useEffect } from 'react';
import { Droplet, LayoutDashboard, Settings, LogIn, LogOut } from 'lucide-react';
import PublicDashboard from './pages/PublicDashboard';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  const [currentView, setCurrentView] = useState('public'); // 'public', 'login', 'admin'
  const [isAdmin, setIsAdmin] = useState(false);

  // Check authentication status on mount
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      setIsAdmin(true);
    }
  }, []);

  const handleLoginSuccess = () => {
    setIsAdmin(true);
    setCurrentView('admin');
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setIsAdmin(false);
    setCurrentView('public');
  };

  const navigateToAdmin = () => {
    if (isAdmin) {
      setCurrentView('admin');
    } else {
      setCurrentView('login');
    }
  };

  return (
    <div className="app-container">
      {/* Header/Navbar */}
      {currentView !== 'login' && (
        <header className="navbar">
          <div className="nav-brand">
            <Droplet size={26} strokeWidth={2.5} />
            <span>PDAM Monitor</span>
          </div>

          <nav className="nav-links">
            <button 
              className={`nav-link ${currentView === 'public' ? 'active' : ''}`}
              onClick={() => setCurrentView('public')}
            >
              <LayoutDashboard size={16} />
              Dashboard Publik
            </button>
            
            <button 
              className={`nav-link ${currentView === 'admin' ? 'active' : ''}`}
              onClick={navigateToAdmin}
            >
              <Settings size={16} />
              Dashboard Admin
            </button>

            {isAdmin ? (
              <button className="btn-logout" onClick={handleLogout}>
                <LogOut size={16} />
                Keluar Admin
              </button>
            ) : (
              <button className="btn-login" onClick={() => setCurrentView('login')}>
                <LogIn size={16} />
                Login Admin
              </button>
            )}
          </nav>
        </header>
      )}

      {/* Main View Renders */}
      <main style={{ flex: 1, backgroundColor: 'var(--bg-primary)' }}>
        {currentView === 'public' && <PublicDashboard />}
        {currentView === 'login' && (
          <AdminLogin 
            onLoginSuccess={handleLoginSuccess} 
            onBackToPublic={() => setCurrentView('public')} 
          />
        )}
        {currentView === 'admin' && (
          isAdmin ? <AdminDashboard /> : <AdminLogin onLoginSuccess={handleLoginSuccess} onBackToPublic={() => setCurrentView('public')} />
        )}
      </main>

      {/* Modern Compact Footer */}
      {currentView !== 'login' && (
        <footer style={{
          textAlign: 'center',
          padding: '1.5rem',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          backgroundColor: 'white',
          borderTop: '1px solid var(--border-color)',
          marginTop: 'auto'
        }}>
          &copy; {new Date().getFullYear()} PDAM Water Pressure Realtime Monitoring System. All rights reserved.
        </footer>
      )}
    </div>
  );
}

export default App;
