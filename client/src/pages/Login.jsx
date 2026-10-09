import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="animated-bg"></div>

      <div className="w-full max-w-md animate-fade-in">
        {/* Header — centered */}
        <div className="text-center mb-10">
          {/* Shield icon */}
          <div className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-6 relative" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M9 12l2 2 4-4" strokeWidth="2.5"/>
            </svg>
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-3xl" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', filter: 'blur(20px)', opacity: 0.3, zIndex: -1 }}></div>
          </div>
          <h1 className="text-4xl font-extrabold mb-3" style={{
            background: 'linear-gradient(135deg, #c4b5fd, #e9d5ff, #f5d0fe)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>Welcome Back</h1>
          <p className="text-base text-slate-400">Sign in to access your encrypted vault</p>
        </div>

        {/* Form */}
        <div className="glass-card p-8" style={{ background: 'rgba(15, 18, 40, 0.6)', border: '1px solid rgba(139, 92, 246, 0.12)' }}>
          {error && (
            <div className="mb-5 p-3.5 rounded-xl text-sm animate-slide-down" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input-field pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="login-submit"
              className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-all duration-300"
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? (
                <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }}></div> Signing in...</>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold no-underline" style={{ color: '#a78bfa' }}>
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
