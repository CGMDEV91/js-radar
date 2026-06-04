import { useEffect, useState } from 'react';
import type { ProviderConfig, LogMessage, ScanProgress } from '../../types';
import { ProgressBar } from '../shared/ProgressBar';
import { TerminalLog } from '../shared/TerminalLog';

interface Props {
  config: ProviderConfig;
  logs: LogMessage[];
  progress: ScanProgress;
  onStartOver: () => void;
  onViewResults: () => void;
  onStop: () => void;
}

const PROVIDER_ICONS: Record<ProviderConfig['provider'], string> = {
  github: 'GH',
  gitlab: 'GL',
  bitbucket: 'BB',
  publicUrl: '🌐',
};

export function ScanningView({ config, logs, progress, onStartOver, onViewResults, onStop }: Props) {
  const isComplete = progress.pct >= 100;
  const displayUrl = config.repoUrl ?? config.siteUrl ?? '';
  const [showStopModal, setShowStopModal] = useState(false);

  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(onViewResults, 1500);
      return () => clearTimeout(timer);
    }
  }, [isComplete, onViewResults]);

  function handleConfirmStop() {
    setShowStopModal(false);
    onStop();
  }

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
      {/* Stop confirmation modal */}
      {showStopModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '28px 28px 24px',
            maxWidth: '420px',
            width: '100%',
          }}>
            <div style={{ fontSize: '22px', marginBottom: '10px' }}>🛑</div>
            <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 10px' }}>
              Stop scan?
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 24px', lineHeight: 1.65 }}>
              The scan will stop after the current phase finishes. You will see a partial report with the findings collected so far. You can retry the full scan at any time.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowStopModal(false)}
                style={{
                  background: 'none', border: '1px solid var(--border)',
                  borderRadius: '7px', color: 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: '13px', padding: '8px 16px',
                  transition: 'border-color 150ms',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                Continue scanning
              </button>
              <button
                onClick={handleConfirmStop}
                style={{
                  background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.35)',
                  borderRadius: '7px', color: 'var(--accent-red)',
                  cursor: 'pointer', fontSize: '13px', fontWeight: 600, padding: '8px 16px',
                  transition: 'background 150ms',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.20)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(248,113,113,0.12)'}
              >
                Stop and show results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
        <button
          onClick={onStartOver}
          style={{
            background: 'none', border: 'none', color: 'var(--text-secondary)',
            cursor: 'pointer', fontSize: '14px', padding: '0',
            display: 'flex', alignItems: 'center', gap: '6px', transition: 'color 150ms ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
        >
          ← Start over
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px', color: 'var(--text-secondary)', overflow: 'hidden' }}>
          <span style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', color: 'var(--text-muted)' }}>
            {PROVIDER_ICONS[config.provider]}
          </span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayUrl}
          </span>
        </div>

        {/* Stop button — only while scanning */}
        {!isComplete && (
          <button
            onClick={() => setShowStopModal(true)}
            style={{
              background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)',
              borderRadius: '7px', color: 'var(--accent-red)',
              cursor: 'pointer', fontSize: '13px', fontWeight: 500,
              padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'background 150ms ease, border-color 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.15)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.50)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.25)'; }}
          >
            ■ Stop scan
          </button>
        )}
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
          <button className="btn-primary" onClick={onViewResults} style={{ padding: '14px 32px', fontSize: '15px' }}>
            View full report →
          </button>
        </div>
      )}
    </div>
  );
}
