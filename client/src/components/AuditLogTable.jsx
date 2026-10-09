const AuditLogTable = ({ logs }) => {
  const getActionColor = (action) => {
    switch (action) {
      case 'UPLOADED': return { bg: 'rgba(14,165,233,0.1)', text: '#38bdf8' };
      case 'DOWNLOADED': return { bg: 'rgba(16,185,129,0.1)', text: '#34d399' };
      case 'LINK_ACCESSED': return { bg: 'rgba(139,92,246,0.1)', text: '#a78bfa' };
      case 'LINK_EXPIRED': return { bg: 'rgba(245,158,11,0.1)', text: '#fbbf24' };
      case 'LINK_REVOKED': return { bg: 'rgba(239,68,68,0.1)', text: '#f87171' };
      case 'FAILED_ATTEMPT': return { bg: 'rgba(239,68,68,0.1)', text: '#f87171' };
      default: return { bg: 'rgba(100,116,139,0.1)', text: '#94a3b8' };
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'UPLOADED': return '📤';
      case 'DOWNLOADED': return '📥';
      case 'LINK_ACCESSED': return '🔗';
      case 'LINK_EXPIRED': return '⏰';
      case 'LINK_REVOKED': return '🚫';
      case 'FAILED_ATTEMPT': return '⚠️';
      default: return '📋';
    }
  };

  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto mb-3 opacity-50">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        <p className="text-sm">No audit logs yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700/50">
            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Action</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">IP Address</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Time</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, i) => {
            const color = getActionColor(log.action);
            return (
              <tr key={log._id || i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: color.bg, color: color.text }}>
                    <span>{getActionIcon(log.action)}</span>
                    {log.action}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-400">
                  {log.performedBy?.name || log.performedBy?.email || 'Anonymous'}
                </td>
                <td className="py-3 px-4 text-slate-500 font-mono text-xs">{log.ipAddress || '—'}</td>
                <td className="py-3 px-4 text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default AuditLogTable;
