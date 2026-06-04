import { useState } from 'react';
import type { Finding } from '../../types';

interface Props {
  finding: Finding;
}

type ActionState = 'idle' | 'loading' | 'done' | 'error';

async function fetchText(url: string): Promise<string> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.text();
}

async function doDownload(url: string, filename: string, setState: (s: ActionState) => void) {
  setState('loading');
  try {
    const text = await fetchText(url);
    const blob = new Blob([text], { type: 'application/javascript' });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
    setState('done');
  } catch { setState('error'); }
  setTimeout(() => setState('idle'), 2500);
}

async function doCopy(url: string, setState: (s: ActionState) => void) {
  setState('loading');
  try {
    const text = await fetchText(url);
    await navigator.clipboard.writeText(text);
    setState('done');
  } catch { setState('error'); }
  setTimeout(() => setState('idle'), 2500);
}

async function doViewSource(url: string, filename: string, setState: (s: ActionState) => void) {
  setState('loading');
  try {
    const text = await fetchText(url);
    const blob = new Blob([text], { type: 'text/plain' });
    const objectUrl = URL.createObjectURL(blob);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`<html><head><title>${filename}</title><style>
        body{margin:0;background:#0a0a0f;color:#e8e8f0;font-family:'IBM Plex Mono',monospace;font-size:13px;line-height:1.6;padding:20px;white-space:pre-wrap;word-break:break-all}
      </style></head><body>${text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</body></html>`);
      win.document.close();
    } else {
      // fallback: open blob URL
      window.open(objectUrl, '_blank');
    }
    URL.revokeObjectURL(objectUrl);
    setState('done');
  } catch { setState('error'); }
  setTimeout(() => setState('idle'), 2500);
}

function ActionBtn({
  label, idleLabel, loadingLabel = '...', doneLabel = '✓', errorLabel = '✗ error',
  accent = 'var(--border-hover)', onClick,
}: {
  label: string; idleLabel: string; loadingLabel?: string; doneLabel?: string; errorLabel?: string;
  accent?: string; onClick: (setState: (s: ActionState) => void) => Promise<void>;
}) {
  const [state, setState] = useState<ActionState>('idle');

  const displayText =
    state === 'loading' ? loadingLabel :
    state === 'done' ? doneLabel :
    state === 'error' ? errorLabel :
    idleLabel;

  const color =
    state === 'done' ? 'var(--accent-green)' :
    state === 'error' ? 'var(--accent-red)' :
    'var(--text-secondary)';

  const borderColor =
    state === 'done' ? 'rgba(110,231,183,0.4)' :
    state === 'error' ? 'rgba(248,113,113,0.4)' :
    'var(--border)';

  return (
    <button
      type="button"
      disabled={state === 'loading'}
      title={label}
      onClick={() => onClick(setState)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
        padding: '4px 10px', background: 'var(--bg-elevated)',
        border: `1px solid ${borderColor}`, borderRadius: '6px',
        color, fontSize: '12px', cursor: state === 'loading' ? 'wait' : 'pointer',
        transition: 'border-color 150ms ease, color 150ms ease',
        fontFamily: 'inherit', minWidth: '72px',
      }}
      onMouseEnter={(e) => { if (state === 'idle') { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent; } }}
      onMouseLeave={(e) => { if (state === 'idle') { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
    >
      {displayText}
    </button>
  );
}

function LibraryActions({ url, label, filename }: { url: string; label: string; filename: string }) {
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: '2px' }}>{label}</span>
      <ActionBtn
        label="Download file"
        idleLabel="↓ download"
        doneLabel="✓ saved"
        accent="var(--accent-green)"
        onClick={(setState) => doDownload(url, filename, setState)}
      />
      <ActionBtn
        label="Copy source code to clipboard"
        idleLabel="⎘ copy"
        doneLabel="✓ copied"
        accent="var(--accent-blue)"
        onClick={(setState) => doCopy(url, setState)}
      />
      <ActionBtn
        label="View source in browser"
        idleLabel="&lt;/&gt; view"
        doneLabel="✓ opened"
        accent="var(--accent-purple)"
        onClick={(setState) => doViewSource(url, filename, setState)}
      />
    </div>
  );
}

export function FixPanel({ finding }: Props) {
  if (!finding.fixVersion && !finding.isEol) return null;

  const libName = finding.library.toLowerCase();
  const filename = `${libName}-${finding.fixVersion}.min.js`;

  return (
    <div style={{
      marginTop: '12px', padding: '12px',
      background: 'var(--bg-base)', border: '1px solid var(--border)',
      borderRadius: '8px', fontSize: '13px',
    }}>
      {finding.fixVersion && (
        <div style={{ marginBottom: '10px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Fix: </span>
          <span style={{ color: 'var(--accent-green)', fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace' }}>
            update to {finding.fixVersion}
          </span>
        </div>
      )}

      {finding.fixVersion && Object.keys(finding.downloadUrls).length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: finding.isEol ? '10px' : '0' }}>
          {finding.downloadUrls.cdnjs && (
            <LibraryActions url={finding.downloadUrls.cdnjs} label="cdnjs" filename={filename} />
          )}
          {finding.downloadUrls.jsdelivr && (
            <LibraryActions url={finding.downloadUrls.jsdelivr} label="jsDelivr" filename={filename} />
          )}
        </div>
      )}

      {finding.isEol && finding.alternative && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', color: 'var(--accent-amber)', fontSize: '12px' }}>
          <span>⚠</span>
          <span>EOL: consider migrating to {finding.alternative}</span>
        </div>
      )}
    </div>
  );
}
