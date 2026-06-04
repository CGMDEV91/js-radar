import { useState } from 'react';
import type { ReactNode } from 'react';
import type { Finding, ProviderConfig, FileResult, LogMessage } from '../../types';
import { SeverityBadge } from '../shared/SeverityBadge';
import { FindingCard } from '../shared/FindingCard';
import { generateTeamsReport } from '../../utils/export';
import { Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  config: ProviderConfig;
  findings: Finding[];
  filesScanned: number;
  fileResults: FileResult[];
  logs: LogMessage[];
  cancelled?: boolean;
  onScanAnother: () => void;
  onRetry: (config: ProviderConfig) => void;
}

type SeverityFilter = 'all' | Finding['severity'];

const SEVERITY_ORDER: Finding['severity'][] = ['critical', 'high', 'medium', 'low', 'info'];

function getOverallStatus(findings: Finding[], filesScanned: number) {
  if (filesScanned === 0) return 'unknown';
  if (findings.length === 0) return 'clean';
  if (findings.some((f) => f.severity === 'critical' || f.severity === 'high')) return 'vulnerable';
  return 'review';
}

function AllClearIllustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <circle cx="60" cy="60" r="56" fill="rgba(110,231,183,0.06)" stroke="rgba(110,231,183,0.2)" strokeWidth="1.5" />
      <circle cx="60" cy="60" r="40" fill="rgba(110,231,183,0.08)" stroke="rgba(110,231,183,0.3)" strokeWidth="1.5" />
      <path d="M42 61l12 12 24-26" stroke="#6ee7b7" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface BlockedCardProps {
  icon: string;
  color: string;
  bg: string;
  border: string;
  title: string;
  body: ReactNode;
  hint: ReactNode;
  action: ReactNode;
  footer?: string;
}

function BlockedCard({ icon, color, bg, border, title, body, hint, action, footer }: BlockedCardProps) {
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: '12px',
        padding: '28px 24px',
        textAlign: 'left',
        maxWidth: '520px',
        margin: '0 auto',
      }}
    >
      <div style={{ fontSize: '28px', marginBottom: '10px' }}>{icon}</div>
      <p style={{ fontSize: '17px', fontWeight: 700, color, margin: '0 0 10px' }}>{title}</p>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: '1.7' }}>
        {body}
      </p>
      <div
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '12px 14px',
          marginBottom: '16px',
          fontSize: '12px',
          color: 'var(--text-secondary)',
          lineHeight: '1.7',
        }}
      >
        {hint}
      </div>
      {action}
      {footer && (
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px', textAlign: 'center' }}>
          {footer}
        </p>
      )}
    </div>
  );
}

const LOG_COLORS: Record<LogMessage['type'], string> = {
  info: 'var(--text-secondary)',
  success: 'var(--accent-green)',
  warning: 'var(--accent-amber)',
  error: 'var(--accent-red)',
};

function ScanLogCollapsible({ logs }: { logs: LogMessage[] }) {
  const [open, setOpen] = useState(false);
  if (logs.length === 0) return null;

  const hasWarnings = logs.some((l) => l.type === 'warning' || l.type === 'error');

  return (
    <div
      className="card"
      style={{ padding: '14px 20px', marginBottom: '24px' }}
    >
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '0',
          color: 'var(--text-primary)',
        }}
      >
        {open
          ? <ChevronDown size={15} color="var(--text-muted)" />
          : <ChevronRight size={15} color="var(--text-muted)" />}
        <span style={{ fontSize: '13px', fontWeight: 600 }}>
          Scan log
        </span>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {logs.length} entries
        </span>
        {hasWarnings && !open && (
          <span style={{ fontSize: '11px', color: 'var(--accent-amber)', marginLeft: 'auto' }}>
            ⚠ contains warnings
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            marginTop: '12px',
            background: 'var(--bg-base)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '14px 16px',
            maxHeight: '320px',
            overflowY: 'auto',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '12px',
            lineHeight: '1.7',
          }}
        >
          {logs.map((msg, i) => (
            <div key={i} style={{ color: LOG_COLORS[msg.type] }}>
              {msg.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const STATUS_ICON: Record<FileResult['status'], string> = {
  ok: '✅',
  cors_proxied: '🔁',
  cors_blocked: '🚫',
  error: '❌',
};

const STATUS_LABEL: Record<FileResult['status'], string> = {
  ok: 'Fetched',
  cors_proxied: 'Via proxy',
  cors_blocked: 'CORS blocked',
  error: 'Error',
};

const STATUS_COLOR: Record<FileResult['status'], string> = {
  ok: 'var(--accent-green)',
  cors_proxied: 'var(--accent-blue)',
  cors_blocked: 'var(--accent-amber)',
  error: 'var(--accent-red)',
};

function FileResultsTable({ fileResults }: { fileResults: FileResult[] }) {
  const [open, setOpen] = useState(false);
  if (fileResults.length === 0) return null;

  const okCount = fileResults.filter((f) => f.status === 'ok' || f.status === 'cors_proxied').length;
  const blockedCount = fileResults.filter((f) => f.status === 'cors_blocked').length;
  const errCount = fileResults.filter((f) => f.status === 'error').length;

  return (
    <div
      className="card"
      style={{ padding: '16px 20px', marginBottom: '24px' }}
    >
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0',
          color: 'var(--text-primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {open ? <ChevronDown size={16} color="var(--text-muted)" /> : <ChevronRight size={16} color="var(--text-muted)" />}
          <span style={{ fontSize: '13px', fontWeight: 600 }}>
            Files attempted ({fileResults.length})
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            ✅ {okCount} fetched
            {blockedCount > 0 && <span style={{ color: 'var(--accent-amber)' }}>  🚫 {blockedCount} CORS</span>}
            {errCount > 0 && <span style={{ color: 'var(--accent-red)' }}>  ❌ {errCount} error</span>}
          </span>
        </div>
      </button>

      {open && (
        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {fileResults.map((fr, i) => {
            const hasVuln = fr.libs.some((l) => l.safe === false);
            return (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '20px 1fr auto',
                  gap: '8px',
                  alignItems: 'flex-start',
                  padding: '8px 10px',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                  borderRadius: '6px',
                }}
              >
                {/* Status icon */}
                <span title={STATUS_LABEL[fr.status]} style={{ fontSize: '14px' }}>
                  {STATUS_ICON[fr.status]}
                </span>

                {/* File info */}
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: '12px',
                      color: fr.status === 'cors_blocked' || fr.status === 'error'
                        ? 'var(--text-muted)'
                        : 'var(--accent-blue)',
                      wordBreak: 'break-all',
                      lineHeight: '1.4',
                    }}
                    title={fr.url}
                  >
                    {fr.name}
                  </div>
                  {fr.statusMessage && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {fr.statusMessage}
                    </div>
                  )}
                  {fr.libs.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {fr.libs.map((lib, j) => (
                        <span
                          key={j}
                          style={{
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: '11px',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: lib.safe === false
                              ? 'rgba(248,113,113,0.12)'
                              : 'rgba(110,231,183,0.08)',
                            color: lib.safe === false
                              ? 'var(--accent-red)'
                              : 'var(--accent-green)',
                            border: `1px solid ${lib.safe === false ? 'rgba(248,113,113,0.25)' : 'rgba(110,231,183,0.20)'}`,
                          }}
                        >
                          {lib.name} {lib.version}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right badge */}
                <span
                  style={{
                    fontSize: '11px',
                    color: STATUS_COLOR[fr.status],
                    whiteSpace: 'nowrap',
                    fontWeight: hasVuln ? 600 : 400,
                  }}
                >
                  {hasVuln ? '✗ Vulnerable' : STATUS_LABEL[fr.status]}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UpgradesSection({ findings }: { findings: Finding[] }) {
  // Collect unique upgrades: one entry per library+fixVersion combination
  const upgradeMap = new Map<string, {
    library: string;
    fromVersions: string[];
    fixVersion: string;
    cdnjs?: string;
    jsdelivr?: string;
  }>();

  for (const f of findings) {
    if (!f.fixVersion) continue;
    const key = `${f.library.toLowerCase()}@${f.fixVersion}`;
    const existing = upgradeMap.get(key);
    if (existing) {
      if (!existing.fromVersions.includes(f.detectedVersion)) {
        existing.fromVersions.push(f.detectedVersion);
      }
    } else {
      upgradeMap.set(key, {
        library: f.library,
        fromVersions: f.detectedVersion ? [f.detectedVersion] : [],
        fixVersion: f.fixVersion,
        cdnjs: f.downloadUrls.cdnjs,
        jsdelivr: f.downloadUrls.jsdelivr,
      });
    }
  }

  const upgrades = Array.from(upgradeMap.values());
  if (upgrades.length === 0) return null;

  return (
    <div style={{ marginTop: '32px' }}>
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Recommended upgrades
        </span>
        <span style={{
          fontSize: '11px',
          background: 'rgba(110,231,183,0.10)',
          border: '1px solid rgba(110,231,183,0.25)',
          color: 'var(--accent-green)',
          borderRadius: '4px',
          padding: '1px 7px',
          fontWeight: 600,
        }}>
          {upgrades.length} {upgrades.length === 1 ? 'library' : 'libraries'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {upgrades.map((u, i) => (
          <div key={i} style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: '12px',
            alignItems: 'center',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '14px 16px',
          }}>
            {/* Left: library info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', minWidth: 0 }}>
              <span style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                flexShrink: 0,
              }}>
                {u.library}
              </span>
              {u.fromVersions.length > 0 && (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0 }}>
                  {u.fromVersions.join(', ')}
                </span>
              )}
              <span style={{ color: 'var(--text-muted)', fontSize: '12px', flexShrink: 0 }}>→</span>
              <span style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--accent-green)',
                flexShrink: 0,
              }}>
                {u.fixVersion}
              </span>
            </div>

            {/* Right: download buttons */}
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              {u.cdnjs && (
                <a
                  href={u.cdnjs}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  title={`Download ${u.library} ${u.fixVersion} from cdnjs`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 12px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: 500,
                    textDecoration: 'none',
                    transition: 'border-color 150ms ease, color 150ms ease',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-green)'; e.currentTarget.style.color = 'var(--accent-green)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  ↓ cdnjs
                </a>
              )}
              {u.jsdelivr && (
                <a
                  href={u.jsdelivr}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  title={`Download ${u.library} ${u.fixVersion} from jsDelivr`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 12px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: 500,
                    textDecoration: 'none',
                    transition: 'border-color 150ms ease, color 150ms ease',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.color = 'var(--accent-blue)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  ↓ jsDelivr
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ResultsView({ config, findings, filesScanned, fileResults, logs, cancelled, onScanAnother, onRetry }: Props) {
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<SeverityFilter>('all');

  const displayUrl = config.repoUrl ?? config.siteUrl ?? '';
  const overallStatus = getOverallStatus(findings, filesScanned);

  const isCorsBlocked =
    filesScanned === 0 &&
    config.provider === 'publicUrl' &&
    !config.corsProxy &&
    logs.some((l) => l.text.includes('CORS_BLOCKED:') || (l.text.includes('CORS') && l.type === 'warning'));

  const isProxy413 =
    filesScanned === 0 &&
    config.provider === 'publicUrl' &&
    logs.some((l) => l.text.includes('PROXY_413:'));

  const isCloudflareBlocked =
    filesScanned === 0 &&
    config.provider === 'publicUrl' &&
    logs.some((l) => l.text.includes('CLOUDFLARE_'));

  const isAuthBlocked =
    filesScanned === 0 &&
    config.provider === 'publicUrl' &&
    logs.some((l) => l.text.includes('HTTP_AUTH_') || l.text.includes('HTTP 401') || l.text.includes('HTTP 403'));

  const isDynamicApp =
    filesScanned === 0 &&
    config.provider === 'publicUrl' &&
    !isCorsBlocked &&
    !isProxy413 &&
    !isCloudflareBlocked &&
    !isAuthBlocked &&
    logs.some((l) => l.text.includes('0 <script> tags'));

  const counts: Record<Finding['severity'], number> = {
    critical: 0, high: 0, medium: 0, low: 0, info: 0,
  };
  for (const f of findings) counts[f.severity]++;

  const filtered = filter === 'all' ? findings : findings.filter((f) => f.severity === filter);
  const sorted = [...filtered].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  );

  async function handleCopy() {
    const report = generateTeamsReport(displayUrl, findings, filesScanned);
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const overallBadge = {
    unknown:   { color: 'var(--text-secondary)', bg: 'rgba(136,136,170,0.08)', border: 'rgba(136,136,170,0.20)', icon: '–', text: 'NOT SCANNED' },
    clean:     { color: 'var(--accent-green)', bg: 'rgba(110,231,183,0.10)', border: 'rgba(110,231,183,0.25)', icon: '✓', text: 'CLEAN' },
    review:    { color: 'var(--accent-amber)', bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.25)', icon: '⚠', text: 'REVIEW NEEDED' },
    vulnerable: { color: 'var(--accent-red)', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.25)', icon: '✗', text: 'VULNERABLE' },
  }[overallStatus];

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '40px 20px',
        maxWidth: '800px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={onScanAnother}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px', padding: '0', transition: 'color 150ms ease' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            ← Scan another repo
          </button>
          <button
            onClick={() => onRetry(config)}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--accent-green)', cursor: 'pointer', fontSize: '13px', padding: '5px 12px', transition: 'border-color 150ms ease, opacity 150ms ease', display: 'flex', alignItems: 'center', gap: '5px' }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-green)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            ↺ Retry scan
          </button>
        </div>

        <button
          onClick={handleCopy}
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy report'}
        </button>
      </div>

      {/* Cancelled banner */}
      {cancelled && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '10px',
          background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.25)',
          borderRadius: '10px', padding: '14px 16px', marginBottom: '16px',
        }}>
          <span style={{ fontSize: '16px', flexShrink: 0 }}>🛑</span>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-amber)', margin: '0 0 3px' }}>
              Scan cancelled — partial results
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
              The scan was stopped before completing all phases. The findings below are from the scanners that finished. Run a full scan to get complete results.
            </p>
          </div>
          <button
            onClick={() => onRetry(config)}
            style={{
              flexShrink: 0, marginLeft: 'auto', background: 'rgba(251,191,36,0.12)',
              border: '1px solid rgba(251,191,36,0.30)', borderRadius: '6px',
              color: 'var(--accent-amber)', cursor: 'pointer', fontSize: '12px',
              fontWeight: 600, padding: '5px 12px', whiteSpace: 'nowrap',
            }}
          >
            ↺ Full scan
          </button>
        </div>
      )}

      {/* Scan log — top */}
      <ScanLogCollapsible logs={logs} />

      {/* Files attempted — below scan log */}
      {fileResults.length > 0 && <FileResultsTable fileResults={fileResults} />}

      {/* Repo + badge */}
      <div className="results-header-row">
        <span className="url-label">{displayUrl}</span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 14px',
            background: overallBadge.bg,
            border: `1px solid ${overallBadge.border}`,
            borderRadius: '6px',
            color: overallBadge.color,
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '0.5px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
          role="status"
          aria-label={`Scan result: ${overallBadge.text}`}
        >
          {overallBadge.icon} {overallBadge.text}
        </span>
      </div>

      {/* Summary badges */}
      <div className="summary-badges">
        {SEVERITY_ORDER.map((sev) => (
          <SeverityBadge key={sev} severity={sev} />
        ))}
      </div>

      {/* Summary count cards */}
      <div className="summary-grid">
        {SEVERITY_ORDER.map((sev) => (
          <div
            key={sev}
            className="card"
            onClick={() => setFilter(filter === sev ? 'all' : sev)}
            style={{
              padding: '16px 8px',
              textAlign: 'center',
              cursor: 'pointer',
              borderColor: filter === sev ? 'var(--accent-green)' : undefined,
            }}
            role="button"
            tabIndex={0}
            aria-pressed={filter === sev}
            onKeyDown={(e) => e.key === 'Enter' && setFilter(filter === sev ? 'all' : sev)}
          >
            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                fontFamily: 'IBM Plex Mono, monospace',
                color: counts[sev] > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                lineHeight: 1,
                marginBottom: '4px',
              }}
            >
              {counts[sev]}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              {sev}
            </div>
          </div>
        ))}
      </div>


      {/* Filter indicator */}
      {filter !== 'all' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Showing {filter} only
          </span>
          <button
            onClick={() => setFilter('all')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-blue)',
              cursor: 'pointer',
              fontSize: '13px',
              padding: '0',
            }}
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Results */}
      {findings.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
          }}
        >
          {filesScanned === 0 ? (
            isCorsBlocked ? (
              /* ── CORS blocked (no proxy attempted) ── */
              <BlockedCard
                icon="🚫"
                color="var(--accent-amber)"
                bg="rgba(251,191,36,0.06)"
                border="rgba(251,191,36,0.25)"
                title="Blocked by CORS"
                body={
                  <>
                    The browser was blocked from fetching{' '}
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                      {config.siteUrl}
                    </span>{' '}
                    directly. This is a browser security restriction; the same request works fine with{' '}
                    <code style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: 'var(--accent-amber)' }}>curl</code>.
                  </>
                }
                hint="Routes JS fetches through corsproxy.io. Your file URLs are public, no credentials are exposed."
                action={
                  <button className="btn-primary" style={{ width: '100%', fontSize: '14px', padding: '12px' }}
                    onClick={() => onRetry({ ...config, corsProxy: true })}>
                    🔁  Retry with CORS proxy (corsproxy.io)
                  </button>
                }
                footer="Or go back and paste specific JS file URLs in the Advanced options."
              />
            ) : isProxy413 ? (
              /* ── Proxy returned 413 (page too large) ── */
              <BlockedCard
                icon="📄"
                color="var(--accent-amber)"
                bg="rgba(251,191,36,0.06)"
                border="rgba(251,191,36,0.25)"
                title="Page too large for CORS proxy"
                body={
                  <>
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                      {config.siteUrl}
                    </span>{' '}
                    returned HTTP 413. The page is too large for corsproxy.io to forward.
                    This is common on complex web apps (Gmail, dashboards, etc.).
                  </>
                }
                hint={
                  <>
                    Instead of scanning the full page, paste specific JS file URLs in the{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>Additional JS paths</strong>{' '}
                    field. Find them with browser DevTools (Network tab → filter by JS) or{' '}
                    <code style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px' }}>curl -s URL | grep script</code>.
                  </>
                }
                action={
                  <button className="btn-secondary" style={{ width: '100%', fontSize: '14px', padding: '12px' }}
                    onClick={onScanAnother}>
                    ← Go back and paste JS file URLs
                  </button>
                }
              />
            ) : isCloudflareBlocked ? (
              /* ── Cloudflare WAF / bot protection ── */
              <BlockedCard
                icon="🛡"
                color="var(--accent-amber)"
                bg="rgba(251,191,36,0.06)"
                border="rgba(251,191,36,0.25)"
                title="Blocked by Cloudflare"
                body={
                  <>
                    Cloudflare returned HTTP 5xx and blocked the CORS proxy from reaching{' '}
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                      {config.siteUrl}
                    </span>.
                    This is <strong style={{ color: 'var(--text-primary)' }}>not an attack against you</strong>.
                    Cloudflare's bot detection flagged the proxy's IP address.
                  </>
                }
                hint={
                  <>
                    <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                      What Cloudflare 5xx errors mean:
                    </strong>
                    <span style={{ color: 'var(--accent-amber)' }}>520-527</span>: origin server error or unreachable<br />
                    <span style={{ color: 'var(--accent-amber)' }}>530</span>: origin DNS failure or Cloudflare blocked the request<br />
                    <br />
                    The site may also require VPN / intranet access (e.g. internal corporate tools).
                    If you have direct access, paste specific JS file URLs instead.
                  </>
                }
                action={
                  <button className="btn-secondary" style={{ width: '100%', fontSize: '14px', padding: '12px' }}
                    onClick={onScanAnother}>
                    ← Go back and paste specific JS file URLs
                  </button>
                }
              />
            ) : isAuthBlocked ? (
              /* ── 401 / 403 authentication required ── */
              <BlockedCard
                icon="🔒"
                color="var(--accent-red)"
                bg="rgba(248,113,113,0.06)"
                border="rgba(248,113,113,0.20)"
                title="Authentication required"
                body={
                  <>
                    The server returned 401 or 403 — access to{' '}
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                      {config.siteUrl}
                    </span>{' '}
                    requires a login or valid session. This is not a vulnerability, it is the site working correctly.
                  </>
                }
                hint={
                  <>
                    If the source code is in a repository, use{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>GitHub / GitLab / Bitbucket mode</strong> with
                    an access token instead. If you have session access to the site, find the JS file URLs via
                    browser DevTools and paste them in <strong style={{ color: 'var(--text-primary)' }}>Additional JS paths</strong>.
                  </>
                }
                action={
                  <button className="btn-secondary" style={{ width: '100%', fontSize: '14px', padding: '12px' }}
                    onClick={onScanAnother}>
                    ← Use a different scan method
                  </button>
                }
              />
            ) : isDynamicApp ? (
              /* ── Page fetched but no static scripts found ── */
              <BlockedCard
                icon="⚡"
                color="var(--accent-blue)"
                bg="rgba(96,165,250,0.06)"
                border="rgba(96,165,250,0.20)"
                title="No static scripts found"
                body={
                  <>
                    The page was fetched successfully but contains{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>no static {'<script src>'} tags</strong>.
                    This app loads JavaScript dynamically at runtime (common in Gmail, React/Vue apps, SPAs).
                  </>
                }
                hint={
                  <>
                    Find the actual script URLs in{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>browser DevTools</strong>{' '}
                    → Network tab → filter by <code style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px' }}>JS</code>,
                    then reload the page. Copy the URLs and paste them in the{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>Additional JS paths</strong> field.
                    You can also use:{' '}
                    <code style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: 'var(--accent-blue)', display: 'block', marginTop: '6px' }}>
                      curl -s {config.siteUrl} | grep -oP 'src="[^"]+\.js[^"]*"'
                    </code>
                  </>
                }
                action={
                  <button className="btn-secondary" style={{ width: '100%', fontSize: '14px', padding: '12px' }}
                    onClick={onScanAnother}>
                    ← Go back and paste JS file URLs
                  </button>
                }
              />
            ) : (
              /* ── Generic empty state ── */
              <>
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
                  <circle cx="40" cy="40" r="36" fill="rgba(136,136,170,0.06)" stroke="rgba(136,136,170,0.2)" strokeWidth="1.5" />
                  <path d="M26 40h28M40 26v28" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
                </svg>
                <p style={{ marginTop: '20px', fontSize: '18px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  No files scanned
                </p>
                <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '13px' }}>
                  Check the scan log below for details.
                </p>
              </>
            )
          ) : (
            <>
              <AllClearIllustration />
              <p
                style={{
                  marginTop: '24px',
                  fontSize: '20px',
                  fontWeight: 600,
                  color: 'var(--accent-green)',
                }}
              >
                ✓ All clear
              </p>
              <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                No known vulnerabilities found in {filesScanned} file{filesScanned !== 1 ? 's' : ''} scanned.
              </p>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sorted.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>
              No {filter} findings.
            </p>
          ) : (
            sorted.map((finding, i) => <FindingCard key={i} finding={finding} />)
          )}
        </div>
      )}

      <UpgradesSection findings={findings} />

      <p
        style={{
          textAlign: 'center',
          fontSize: '12px',
          color: 'var(--text-muted)',
          marginTop: '32px',
        }}
      >
        {filesScanned} file{filesScanned !== 1 ? 's' : ''} scanned · {findings.length} finding{findings.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
