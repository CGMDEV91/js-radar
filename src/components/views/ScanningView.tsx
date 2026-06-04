import { useEffect } from 'react';
import type { ProviderConfig, LogMessage, ScanProgress } from '../../types';
import { ProgressBar } from '../shared/ProgressBar';
import { TerminalLog } from '../shared/TerminalLog';

interface Props {
  config: ProviderConfig;
  logs: LogMessage[];
  progress: ScanProgress;
  onStartOver: () => void;
  onViewResults: () => void;
}

const PROVIDER_ICONS: Record<ProviderConfig['provider'], string> = {
  github: 'GH',
  gitlab: 'GL',
  bitbucket: 'BB',
  publicUrl: '🌐',
};

export function ScanningView({ config, logs, progress, onStartOver, onViewResults }: Props) {
  const isComplete = progress.pct >= 100;
  const displayUrl = config.repoUrl ?? config.siteUrl ?? '';

  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(onViewResults, 1500);
      return () => clearTimeout(timer);
    }
  }, [isComplete, onViewResults]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '40px 20px',
        maxWidth: '760px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* Top nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
        <button
          onClick={onStartOver}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '14px',
            padding: '0',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'color 150ms ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
        >
          ← Start over
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            overflow: 'hidden',
          }}
        >
          <span
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '11px',
              color: 'var(--text-muted)',
            }}
          >
            {PROVIDER_ICONS[config.provider]}
          </span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayUrl}
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <ProgressBar pct={progress.pct} phase={progress.phase} />
      </div>

      {/* Terminal */}
      <TerminalLog messages={logs} />

      {/* View results button */}
      {isComplete && (
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            className="btn-primary"
            onClick={onViewResults}
            style={{ padding: '14px 32px', fontSize: '15px' }}
          >
            View full report →
          </button>
        </div>
      )}
    </div>
  );
}
