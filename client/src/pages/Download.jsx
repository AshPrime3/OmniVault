import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import DownloadGate from '../components/DownloadGate';
import { decryptFile } from '../utils/crypto';
import api from '../api/axios';

const Download = () => {
  const { vaultToken } = useParams();
  const [fileInfo, setFileInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchFileInfo = async () => {
      try {
        const res = await api.get(`/vault/${vaultToken}`);
        setFileInfo(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Invalid or expired vault link');
      } finally {
        setLoading(false);
      }
    };

    if (!success) {
      fetchFileInfo();
    }
  }, [vaultToken, success]);

  const handleDownload = async (passphrase) => {
    setDownloading(true);
    setError('');

    try {
      // Download encrypted blob
      const res = await api.post(`/vault/${vaultToken}/download`, {}, {
        responseType: 'arraybuffer',
      });

      const ivBase64 = res.headers['x-file-iv'];
      const originalName = decodeURIComponent(res.headers['x-original-name'] || 'download');

      if (!ivBase64) {
        throw new Error('Missing encryption IV from server');
      }

      // Use the same deterministic salt as the upload page
      const salt = `securevault-${originalName}`;

      let decrypted;
      try {
        decrypted = await decryptFile(res.data, passphrase, salt, ivBase64);
      } catch {
        throw new Error('Decryption failed. Wrong passphrase or corrupted file.');
      }

      // Trigger download
      const blob = new Blob([decrypted]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animated-bg"></div>
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-sm text-slate-400">Loading vault...</p>
        </div>
      </div>
    );
  }

  if (error && !fileInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="animated-bg"></div>
        <div className="glass-card p-8 max-w-md mx-auto text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(239,68,68,0.1)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Link Unavailable</h2>
          <p className="text-sm text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="animated-bg"></div>
        <div className="glass-card p-8 max-w-md mx-auto text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(16,185,129,0.1)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">File Decrypted!</h2>
          <p className="text-sm text-slate-400">Your file has been decrypted and downloaded successfully.</p>

          <button onClick={() => setSuccess(false)} className="btn-secondary mt-6">
            Download Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="animated-bg"></div>
      
      <div className="w-full">
        {error && (
          <div className="max-w-md mx-auto mb-4 p-3 rounded-xl text-sm animate-slide-down" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
            {error}
          </div>
        )}
        <DownloadGate fileInfo={fileInfo} onSubmit={handleDownload} loading={downloading} />
      </div>
    </div>
  );
};

export default Download;
