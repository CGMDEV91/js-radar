import type { Finding } from '../../types';

interface Props {
  finding: Finding;
}

export function FixPanel({ finding }: Props) {
  if (!finding.fixVersion && !finding.isEol) return null;

  return (
    <div
      style={{
        marginTop: '12px',
        padding: '12px',
        background: 'var(--bg-base)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        fontSize: '13px',
      }}
    >
      {finding.fixVersion && (
        <div style={{ marginBottom: '8px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Fix: </span>
          <span style={{ color: 'var(--accent-green)', fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace' }}>
            update to {finding.fixVersion}
          </span>
        </div>
      )}

      {finding.fixVersion && (Object.keys(finding.downloadUrls).length > 0) && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: finding.isEol ? '8px' : '0' }}>
          {finding.downloadUrls.cdnjs && (
            <a
              href={finding.downloadUrls.cdnjs}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                textDecoration: 'none',
                transition: 'border-color 150ms ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              ↓ cdnjs
            </a>
          )}
          {finding.downloadUrls.jsdelivr && (
            <a
              href={finding.downloadUrls.jsdelivr}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                textDecoration: 'none',
                transition: 'border-color 150ms ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              ↓ jsDelivr
            </a>
          )}
        </div>
      )}

      {finding.isEol && finding.alternative && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '6px',
            color: 'var(--accent-amber)',
            fontSize: '12px',
          }}
        >
          <span>⚠</span>
          <span>EOL — consider migrating to {finding.alternative}</span>
        </div>
      )}
    </div>
  );
}
