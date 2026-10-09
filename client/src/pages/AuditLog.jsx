import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AuditLogTable from '../components/AuditLogTable';
import api from '../api/axios';

const AuditLog = () => {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get(`/files/${fileId}/audit`);
        setLogs(res.data.logs);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load audit logs');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [fileId]);

  const filteredLogs = filter === 'ALL' ? logs : logs.filter(l => l.action === filter);
  const actions = ['ALL', 'UPLOADED', 'DOWNLOADED', 'LINK_ACCESSED', 'LINK_EXPIRED', 'LINK_REVOKED', 'FAILED_ATTEMPT'];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="animated-bg"></div>

      <div className="animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-secondary p-2"
            style={{ minWidth: 'auto' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold gradient-text">Audit Log</h1>
            <p className="text-sm text-slate-400">{logs.length} total events</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {actions.map(action => (
            <button
              key={action}
              onClick={() => setFilter(action)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: filter === action ? 'rgba(14,165,233,0.15)' : 'rgba(30,41,59,0.5)',
                color: filter === action ? '#38bdf8' : '#94a3b8',
                border: `1px solid ${filter === action ? 'rgba(14,165,233,0.3)' : 'rgba(148,163,184,0.1)'}`,
                cursor: 'pointer',
              }}
            >
              {action === 'ALL' ? 'All Events' : action.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="spinner"></div>
          </div>
        ) : error ? (
          <div className="glass-card p-8 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <AuditLogTable logs={filteredLogs} />
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLog;
