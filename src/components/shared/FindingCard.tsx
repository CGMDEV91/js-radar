import type { Finding } from '../../types';
import { SeverityBadge } from './SeverityBadge';
import { FixPanel } from './FixPanel';

interface Props {
  finding: Finding;
}

export function FindingCard({ finding }: Props) {
  return (
    <div className="card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
        <SeverityBadge severity={finding.severity} />

        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <span
              style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              {finding.library}
            </span>
            {finding.detectedVersion && (
              <span
                style={{
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                }}
              >
                {finding.detectedVersion}
              </span>
            )}
            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                background: 'var(--bg-elevated)',
                padding: '1px 6px',
                borderRadius: '4px',
                flexShrink: 0,
              }}
            >
              {finding.scanner}
            </span>
          </div>

          {finding.cve.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
              {finding.cve.map((cve) => (
                <a
                  key={cve}
                  href={`https://osv.dev/vulnerability/${cve}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '12px',
                    color: 'var(--accent-blue)',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  {cve}
                </a>
              ))}
            </div>
          )}

          {finding.file && (
            <div className="finding-file-path">{finding.file}</div>
          )}

          <p className="finding-description">{finding.description}</p>

          {finding.hint && (
            <div style={{
              marginTop: '10px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              background: 'rgba(251,191,36,0.07)',
              border: '1px solid rgba(251,191,36,0.22)',
              borderRadius: '7px',
              padding: '9px 12px',
            }}>
              <span style={{ fontSize: '13px', flexShrink: 0, lineHeight: 1 }}>⚠️</span>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-amber)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '3px' }}>
                  Possible false positive
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {finding.hint}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <FixPanel finding={finding} />
    </div>
  );
}
