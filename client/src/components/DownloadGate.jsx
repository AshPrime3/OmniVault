import { useState } from 'react';

const DownloadGate = ({ fileInfo, onSubmit, loading }) => {
  const [passphrase, setPassphrase] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (passphrase.trim()) {
      onSubmit(passphrase);
    }
  };

  return (
    <div className="glass-card p-8 max-w-md mx-auto animate-fade-in">
      {/* File icon */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.15), rgba(139,92,246,0.15))' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="1.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Encrypted File</h2>
        <p className="text-sm text-slate-400">{fileInfo?.originalName || 'Protected file'}</p>
      </div>

      {/* File details */}
      <div className="space-y-2 mb-6 p-4 rounded-xl" style={{ background: 'rgba(15, 23, 42, 0.5)' }}>
        {fileInfo?.sizeBytes && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Size</span>
            <span className="text-slate-300">
              {(fileInfo.sizeBytes / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>
        )}
        {fileInfo?.remainingDownloads !== undefined && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Downloads left</span>
            <span className="text-slate-300">{fileInfo.remainingDownloads}</span>
          </div>
        )}
        {fileInfo?.expiresAt && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Expires</span>
            <span className="text-slate-300">{new Date(fileInfo.expiresAt).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Passphrase hint */}
      {fileInfo?.passphraseHint && (
        <div className="flex items-start gap-2 p-3 rounded-xl mb-4" style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
          <span className="text-amber-400 text-sm mt-0.5">💡</span>
          <div>
            <p className="text-xs font-medium text-amber-400">Passphrase Hint</p>
            <p className="text-xs text-amber-300/70 mt-0.5">{fileInfo.passphraseHint}</p>
          </div>
        </div>
      )}

      {/* Passphrase form */}
      <form onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Enter Passphrase to Decrypt
        </label>
        <div className="relative mb-4">
          <input
            type={showPass ? 'text' : 'password'}
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Enter the passphrase..."
            className="input-field pr-10"
            required
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
          >
            {showPass ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>

        <button type="submit" className="btn-primary w-full py-3" disabled={loading || !passphrase.trim()}>
          {loading ? (
            <>
              <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div>
              Decrypting...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Decrypt & Download
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default DownloadGate;
