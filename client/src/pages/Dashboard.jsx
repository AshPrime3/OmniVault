import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatFileSize } from '../utils/crypto';
import api from '../api/axios';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [toast, setToast] = useState(null);
  const [vaultModal, setVaultModal] = useState(null);
  const [vaultSettings, setVaultSettings] = useState({ downloadLimit: 5, expiresInMinutes: 60, passphraseHint: '' });

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await api.get('/files');
        setFiles(res.data.files);
      } catch {
        showToast('Failed to load files', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [showToast]);

  const handleDelete = async (fileId) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    setActionLoading(fileId);
    try {
      await api.delete(`/files/${fileId}`);
      setFiles(files.filter(f => f._id !== fileId));
      showToast('File deleted successfully');
    } catch {
      showToast('Failed to delete file', 'error');
    } finally {
      setActionLoading('');
    }
  };

  const handleRevoke = async (fileId) => {
    setActionLoading(fileId);
    try {
      await api.patch(`/files/${fileId}/revoke`);
      setFiles(files.map(f => f._id === fileId ? { ...f, isRevoked: true } : f));
      showToast('Vault link revoked');
    } catch {
      showToast('Failed to revoke link', 'error');
    } finally {
      setActionLoading('');
    }
  };

  const handleGenerateLink = async (fileId) => {
    setActionLoading(fileId);
    try {
      const res = await api.post(`/vault/${fileId}/generate`, vaultSettings);
      setFiles(files.map(f => f._id === fileId ? { ...f, vaultToken: res.data.vaultToken, isRevoked: false, downloadCount: 0, downloadLimit: vaultSettings.downloadLimit, expiresAt: res.data.expiresAt } : f));
      
      // Copy link
      await navigator.clipboard.writeText(res.data.vaultLink);
      showToast('Vault link generated & copied to clipboard!');
      setVaultModal(null);
    } catch {
      showToast('Failed to generate vault link', 'error');
    } finally {
      setActionLoading('');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="animated-bg"></div>

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.message}
        </div>
      )}

      {/* Vault link generation modal */}
      {vaultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="glass-card p-6 w-full max-w-md animate-fade-in" style={{ background: 'rgba(22, 32, 50, 0.95)' }}>
            <h3 className="text-lg font-bold text-white mb-4">Generate Vault Link</h3>
            <p className="text-sm text-slate-400 mb-4">For: <span className="text-slate-200">{vaultModal.originalName}</span></p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Download Limit</label>
                <select value={vaultSettings.downloadLimit} onChange={e => setVaultSettings({...vaultSettings, downloadLimit: parseInt(e.target.value)})} className="input-field">
                  {[1,3,5,10,25,50].map(n => <option key={n} value={n}>{n} downloads</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Link Expiry</label>
                <select value={vaultSettings.expiresInMinutes} onChange={e => setVaultSettings({...vaultSettings, expiresInMinutes: parseInt(e.target.value)})} className="input-field">
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={360}>6 hours</option>
                  <option value={1440}>24 hours</option>
                  <option value={10080}>7 days</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Passphrase Hint</label>
                <input type="text" value={vaultSettings.passphraseHint} onChange={e => setVaultSettings({...vaultSettings, passphraseHint: e.target.value})} placeholder="Optional hint for receiver" className="input-field" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setVaultModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleGenerateLink(vaultModal._id)} className="btn-primary flex-1" disabled={actionLoading === vaultModal._id}>
                {actionLoading === vaultModal._id ? 'Generating...' : 'Generate Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">Welcome back, {user?.name}</p>
        </div>
        <button onClick={() => navigate('/upload')} className="btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Upload File
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Files', value: files.length, icon: '📁', color: '#0ea5e9' },
          { label: 'Active Links', value: files.filter(f => f.vaultToken && !f.isRevoked).length, icon: '🔗', color: '#8b5cf6' },
          { label: 'Storage Used', value: formatFileSize(files.reduce((acc, f) => acc + (f.sizeBytes || 0), 0)), icon: '💾', color: '#10b981' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="glass-card glass-card-hover p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">{label}</p>
                <p className="text-2xl font-bold text-white mt-1">{value}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: `${color}15` }}>
                {icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Files list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="spinner"></div>
        </div>
      ) : files.length === 0 ? (
        <div className="glass-card p-12 text-center animate-fade-in">
          <div className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-4" style={{ background: 'rgba(14,165,233,0.08)' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-300 mb-1">No files yet</h3>
          <p className="text-sm text-slate-500 mb-4">Upload your first file to start securing data</p>
          <button onClick={() => navigate('/upload')} className="btn-primary">Upload Your First File</button>
        </div>
      ) : (
        <div className="space-y-3">
          {files.map((file, i) => (
            <div key={file._id} className="glass-card glass-card-hover p-5 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* File info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(14,165,233,0.1)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{file.originalName}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-slate-500">{formatFileSize(file.sizeBytes)}</span>
                      <span className="text-xs text-slate-600">•</span>
                      <span className="text-xs text-slate-500">{new Date(file.createdAt).toLocaleDateString()}</span>
                      {file.vaultToken && !file.isRevoked && (
                        <>
                          <span className="text-xs text-slate-600">•</span>
                          <span className="text-xs text-emerald-400">{file.downloadCount}/{file.downloadLimit} downloads</span>
                        </>
                      )}
                      {file.isRevoked && (
                        <>
                          <span className="text-xs text-slate-600">•</span>
                          <span className="text-xs text-red-400">Revoked</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setVaultModal(file)}
                    className="btn-secondary text-xs py-1.5 px-3"
                    disabled={actionLoading === file._id}
                  >
                    🔗 Share
                  </button>
                  {file.vaultToken && !file.isRevoked && (
                    <button
                      onClick={() => handleRevoke(file._id)}
                      className="btn-secondary text-xs py-1.5 px-3"
                      style={{ color: '#fbbf24', borderColor: 'rgba(245,158,11,0.2)' }}
                      disabled={actionLoading === file._id}
                    >
                      Revoke
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/audit/${file._id}`)}
                    className="btn-secondary text-xs py-1.5 px-3"
                  >
                    📋 Audit
                  </button>
                  <button
                    onClick={() => handleDelete(file._id)}
                    className="btn-danger text-xs py-1.5 px-3"
                    disabled={actionLoading === file._id}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
