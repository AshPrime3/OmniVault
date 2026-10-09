import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5" style={{ background: 'rgba(8, 10, 28, 0.85)', backdropFilter: 'blur(24px)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-18" style={{ height: '72px' }}>
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 no-underline group">
            {/* Shield Logo */}
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)' }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, #818cf8, #c084fc, #f472b6)' }}></div>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4" strokeWidth="2.5"/>
              </svg>
            </div>
            <span className="text-2xl font-extrabold tracking-tight" style={{
              background: 'linear-gradient(135deg, #818cf8, #c084fc, #f0abfc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.02em',
            }}>OmniVault</span>
          </Link>

          {/* Desktop nav */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center gap-1">
              {[
                { path: '/dashboard', label: 'Dashboard', icon: '📊' },
                { path: '/upload', label: 'Upload', icon: '📤' },
              ].map(({ path, label, icon }) => (
                <Link
                  key={path}
                  to={path}
                  className="px-4 py-2 rounded-lg text-sm font-medium no-underline transition-all duration-200"
                  style={{
                    color: isActive(path) ? '#a78bfa' : '#94a3b8',
                    background: isActive(path) ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                  }}
                >
                  <span className="mr-1.5">{icon}</span>
                  {label}
                </Link>
              ))}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <div className="hidden md:flex items-center gap-2.5 px-4 py-2 rounded-xl" style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(148, 163, 184, 0.08)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-slate-300 font-medium">{user?.name}</span>
                </div>
                <button onClick={handleLogout} className="btn-secondary text-sm py-2 px-4">
                  Logout
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="no-underline text-sm font-semibold py-2.5 px-6 rounded-xl transition-all duration-300"
                  style={{
                    color: '#c4b5fd',
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.25)',
                  }}
                  onMouseEnter={(e) => { e.target.style.background = 'rgba(139, 92, 246, 0.2)'; e.target.style.borderColor = 'rgba(139, 92, 246, 0.4)'; }}
                  onMouseLeave={(e) => { e.target.style.background = 'rgba(139, 92, 246, 0.1)'; e.target.style.borderColor = 'rgba(139, 92, 246, 0.25)'; }}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="no-underline text-sm font-semibold py-2.5 px-6 rounded-xl transition-all duration-300"
                  style={{
                    color: 'white',
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                    boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
                  }}
                  onMouseEnter={(e) => { e.target.style.boxShadow = '0 6px 30px rgba(139, 92, 246, 0.45)'; e.target.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => { e.target.style.boxShadow = '0 4px 20px rgba(99, 102, 241, 0.3)'; e.target.style.transform = 'translateY(0)'; }}
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            {isAuthenticated && (
              <button
                className="md:hidden p-2 text-slate-400"
                onClick={() => setMobileOpen(!mobileOpen)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {mobileOpen ? (
                    <path d="M6 18L18 6M6 6l12 12"/>
                  ) : (
                    <path d="M3 12h18M3 6h18M3 18h18"/>
                  )}
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && isAuthenticated && (
          <div className="md:hidden pb-4 animate-slide-down">
            {[
              { path: '/dashboard', label: 'Dashboard' },
              { path: '/upload', label: 'Upload' },
            ].map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                className="block px-4 py-2.5 rounded-lg text-sm no-underline transition-all"
                style={{
                  color: isActive(path) ? '#a78bfa' : '#94a3b8',
                  background: isActive(path) ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                }}
                onClick={() => setMobileOpen(false)}
              >
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
