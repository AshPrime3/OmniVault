import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import FileUploader from '../components/FileUploader';
import VaultLinkCard from '../components/VaultLinkCard';
import { encryptFile, ivToBase64 } from '../utils/crypto';
import api from '../api/axios';

// ─── Sensitivity config ───────────────────────────────────────────────────────
const SENSITIVITY_STYLES = {
  high: {
    border: 'rgba(239,68,68,0.35)',
    bg: 'rgba(239,68,68,0.08)',
    glow: '0 0 18px rgba(239,68,68,0.15)',
    icon: '🔴',
    label: 'High Sensitivity',
    color: '#f87171',
    dot: '#ef4444',
  },
  medium: {
    border: 'rgba(245,158,11,0.35)',
    bg: 'rgba(245,158,11,0.08)',
    glow: '0 0 18px rgba(245,158,11,0.12)',
    icon: '🟡',
    label: 'Medium Sensitivity',
    color: '#fbbf24',
    dot: '#f59e0b',
  },
  low: {
    border: 'rgba(16,185,129,0.35)',
    bg: 'rgba(16,185,129,0.08)',
    glow: '0 0 18px rgba(16,185,129,0.12)',
    icon: '🟢',
    label: 'Low Sensitivity',
    color: '#34d399',
    dot: '#10b981',
  },
};

const Upload = () => {
  const [file, setFile] = useState(null);
  const [passphrase, setPassphrase] = useState('');
  const [passphraseHint, setPassphraseHint] = useState('');
  const [downloadLimit, setDownloadLimit] = useState(5);
  const [expiresInMinutes, setExpiresInMinutes] = useState(60);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [vaultData, setVaultData] = useState(null);
  const [error, setError] = useState('');

  // ── AI states ──────────────────────────────────────────────────────────────
  const [aiSuggestion, setAiSuggestion] = useState(null);   // full suggestion object
  const [aiLoading, setAiLoading] = useState(false);         // spinner while fetching suggestion
  const [hintLoading, setHintLoading] = useState(false);     // spinner for hint generation
  const [aiApplied, setAiApplied] = useState(false);         // whether AI values are currently applied

  const navigate = useNavigate();

  // ── When user selects a file, immediately call AI for security suggestion ──
  const handleFileSelect = useCallback(async (selectedFile) => {
    setFile(selectedFile);
    setAiSuggestion(null);
    setAiApplied(false);

    if (!selectedFile) return;

    setAiLoading(true);
    try {
      const { data } = await api.post('/ai/security-suggest', {
        filename: selectedFile.name,
        sizeBytes: selectedFile.size,
      });
      setAiSuggestion(data);
      // Auto-apply the suggested values
      setDownloadLimit(data.downloadLimit);
      setExpiresInMinutes(data.expiresInMinutes);
      setAiApplied(true);
    } catch (err) {
      // Silently ignore — AI is a bonus feature, not critical
      console.warn('AI suggestion unavailable:', err.message);
    } finally {
      setAiLoading(false);
    }
  }, []);

  // ── Passphrase hint generator ──────────────────────────────────────────────
  const handleGenerateHint = async () => {
    if (!passphrase || passphrase.length < 3) return;
    setHintLoading(true);
    try {
      const { data } = await api.post('/ai/passphrase-hint', { passphrase });
      setPassphraseHint(data.hint);
    } catch (err) {
      console.warn('Hint generation unavailable:', err.message);
    } finally {
      setHintLoading(false);
    }
  };

  // ── Main upload flow ───────────────────────────────────────────────────────
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !passphrase) return;

    setLoading(true);
    setError('');
    setProgress('Reading file...');

    try {
      const fileBuffer = await file.arrayBuffer();

      setProgress('Encrypting file...');
      const salt = `securevault-${file.name}`;
      const { encrypted, iv } = await encryptFile(fileBuffer, passphrase, salt);
      const ivBase64 = ivToBase64(iv);

      setProgress('Uploading encrypted file...');
      const formData = new FormData();
      formData.append('file', new Blob([encrypted]), 'encrypted');
      formData.append('iv', ivBase64);
      formData.append('originalName', file.name);
      formData.append('mimeType', file.type || 'application/octet-stream');
      formData.append('sizeBytes', file.size.toString());
      formData.append('downloadLimit', downloadLimit.toString());
      formData.append('expiresInMinutes', expiresInMinutes.toString());
      formData.append('passphraseHint', passphraseHint);

      const uploadRes = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setProgress('Generating vault link...');
      const vaultRes = await api.post(`/vault/${uploadRes.data.fileId}/generate`, {
        downloadLimit,
        expiresInMinutes,
        passphraseHint,
      });

      setVaultData(vaultRes.data);
      setProgress('');
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ─────────────────────────────────────────────────────────
  if (vaultData) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="animated-bg" />
        <div className="text-center mb-8 animate-fade-in">
          <div
            className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-4"
            style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))' }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">File Encrypted &amp; Uploaded!</h1>
          <p className="text-sm text-slate-400">Share the vault link below. Recipients will need the passphrase to decrypt.</p>
        </div>

        <VaultLinkCard
          vaultLink={vaultData.vaultLink}
          expiresAt={vaultData.expiresAt}
          downloadLimit={vaultData.downloadLimit}
        />

        <div className="mt-6 flex gap-3 justify-center">
          <button
            onClick={() => { setVaultData(null); setFile(null); setPassphrase(''); setAiSuggestion(null); setAiApplied(false); }}
            className="btn-secondary"
          >
            Upload Another
          </button>
          <button onClick={() => navigate('/dashboard')} className="btn-primary">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Upload form ────────────────────────────────────────────────────────────
  const style = aiSuggestion ? SENSITIVITY_STYLES[aiSuggestion.sensitivity] : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="animated-bg" />

      <div className="animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold gradient-text mb-2">Upload &amp; Encrypt</h1>
          <p className="text-sm text-slate-400">
            Your file is encrypted in your browser before upload — zero-knowledge architecture
          </p>
        </div>

        <div className="glass-card p-8">
          {error && (
            <div
              className="mb-6 p-3 rounded-xl text-sm animate-slide-down"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-6">

            {/* ── File selector ── */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Select File</label>
              <FileUploader onFileSelect={handleFileSelect} disabled={loading} />
            </div>

            {/* ── AI Security Badge ── */}
            {aiLoading && (
              <div
                className="animate-slide-down flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}
              >
                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                <span className="text-sm text-slate-400">🤖 Analyzing file security…</span>
              </div>
            )}

            {aiSuggestion && !aiLoading && (
              <div
                className="animate-slide-down rounded-xl px-4 py-4 space-y-2"
                style={{
                  background: style.bg,
                  border: `1px solid ${style.border}`,
                  boxShadow: style.glow,
                }}
              >
                {/* Header row */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{style.icon}</span>
                    <span className="text-sm font-semibold" style={{ color: style.color }}>
                      🤖 AI Security Suggestion Applied
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: style.border, color: style.color }}
                    >
                      {style.label}
                    </span>
                  </div>
                  {/* Reset to manual */}
                  {aiApplied && (
                    <button
                      type="button"
                      onClick={() => setAiApplied(false)}
                      className="text-xs text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-2"
                    >
                      Override manually
                    </button>
                  )}
                </div>
                {/* Reason */}
                <p className="text-xs text-slate-400 leading-relaxed">{aiSuggestion.reason}</p>
                {/* Applied settings summary */}
                <div className="flex gap-4 text-xs text-slate-500">
                  <span>
                    <span style={{ color: style.color }}>↓</span>{' '}
                    {aiSuggestion.downloadLimit} download{aiSuggestion.downloadLimit !== 1 ? 's' : ''}
                  </span>
                  <span>
                    <span style={{ color: style.color }}>⏱</span>{' '}
                    {formatExpiry(aiSuggestion.expiresInMinutes)} expiry
                  </span>
                </div>
              </div>
            )}

            {/* ── Passphrase ── */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Encryption Passphrase <span className="text-red-400">*</span>
              </label>
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Strong passphrase for encryption"
                className="input-field"
                required
                disabled={loading}
              />
              <p className="text-xs text-slate-500 mt-1">Share this passphrase with the recipient separately</p>
            </div>

            {/* ── Passphrase Hint with AI Generator ── */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-slate-300">Passphrase Hint (optional)</label>
                {/* AI Hint Generator button — shown only when passphrase has content */}
                {passphrase.length >= 3 && (
                  <button
                    type="button"
                    onClick={handleGenerateHint}
                    disabled={hintLoading || loading}
                    style={{
                      background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15))',
                      border: '1px solid rgba(139,92,246,0.3)',
                      borderRadius: '8px',
                      padding: '4px 10px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: '#a78bfa',
                      cursor: hintLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.2s ease',
                      opacity: hintLoading ? 0.6 : 1,
                    }}
                  >
                    {hintLoading ? (
                      <>
                        <div className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }} />
                        Generating…
                      </>
                    ) : (
                      <>✨ AI Generate Hint</>
                    )}
                  </button>
                )}
              </div>
              <input
                type="text"
                value={passphraseHint}
                onChange={(e) => setPassphraseHint(e.target.value)}
                placeholder="A hint to help the recipient remember…"
                className="input-field"
                disabled={loading}
              />
              {passphraseHint && (
                <p className="text-xs mt-1" style={{ color: '#a78bfa' }}>
                  ✨ AI-generated hint — edit freely before uploading
                </p>
              )}
            </div>

            {/* ── Security Settings (Download limit + Expiry) ── */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Download Limit
                  {aiApplied && aiSuggestion && (
                    <span
                      className="ml-2 text-xs font-normal"
                      style={{ color: style?.color }}
                    >
                      🤖 suggested
                    </span>
                  )}
                </label>
                <select
                  value={downloadLimit}
                  onChange={(e) => { setDownloadLimit(parseInt(e.target.value)); setAiApplied(false); }}
                  className="input-field"
                  disabled={loading}
                >
                  {[1, 3, 5, 10, 25, 50].map((n) => (
                    <option key={n} value={n}>{n} download{n !== 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Link Expiry
                  {aiApplied && aiSuggestion && (
                    <span
                      className="ml-2 text-xs font-normal"
                      style={{ color: style?.color }}
                    >
                      🤖 suggested
                    </span>
                  )}
                </label>
                <select
                  value={expiresInMinutes}
                  onChange={(e) => { setExpiresInMinutes(parseInt(e.target.value)); setAiApplied(false); }}
                  className="input-field"
                  disabled={loading}
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={360}>6 hours</option>
                  <option value={1440}>24 hours</option>
                  <option value={10080}>7 days</option>
                </select>
              </div>
            </div>

            {/* ── Upload progress ── */}
            {progress && (
              <div
                className="flex items-center gap-3 p-3 rounded-xl animate-slide-down"
                style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)' }}
              >
                <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                <span className="text-sm text-primary-300">{progress}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full py-3"
              disabled={loading || !file || !passphrase}
            >
              {loading ? 'Processing…' : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Encrypt &amp; Upload
                </>
              )}
            </button>
          </form>
        </div>

        {/* ── How it works ── */}
        <div className="mt-6 glass-card p-5">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">How it works</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { step: '1', title: 'Encrypt', desc: 'File is encrypted in your browser using AES-256-GCM' },
              { step: '2', title: 'Upload', desc: 'Only the encrypted blob is sent to the server' },
              { step: '3', title: 'Share', desc: 'Get a secure vault link to share with anyone' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)', color: 'white' }}
                >
                  {step}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">{title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Helper ───────────────────────────────────────────────────────────────────
function formatExpiry(minutes) {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${minutes / 60}h`;
  if (minutes === 1440) return '24h';
  return `${minutes / 1440}d`;
}

export default Upload;
