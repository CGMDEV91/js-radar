export type Provider = 'github' | 'gitlab' | 'bitbucket' | 'publicUrl';

export type View = 'home' | 'disclaimer' | 'scanning' | 'results';

export interface ProviderConfig {
  provider: Provider;
  token?: string;
  repoUrl?: string;
  siteUrl?: string;
  additionalPaths?: string;  // newline-separated JS URLs to force-scan
  corsProxy?: boolean;       // route fetches through corsproxy.io
}

export type FetchStatus = 'ok' | 'cors_blocked' | 'cors_proxied' | 'error';

export interface ScannedFile {
  path: string;
  content: string;
  fetchStatus?: FetchStatus;
  fetchError?: string;
  originalUrl?: string;
}

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface Finding {
  scanner: string;
  file: string;
  library: string;
  detectedVersion: string;
  severity: Severity;
  cve: string[];
  status: 'vulnerable' | 'secure' | 'info';
  fixVersion: string | null;
  downloadUrls: { cdnjs?: string; jsdelivr?: string };
  isEol: boolean;
  alternative: string | null;
  description: string;
  hint?: string;       // contextual false-positive warning shown in the UI
}

export interface FileLibrary {
  name: string;
  version: string;
  safe: boolean | null;
}

export interface FileResult {
  url: string;
  name: string;
  status: FetchStatus;
  statusMessage?: string;
  libs: FileLibrary[];
}

export interface LogMessage {
  text: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export type EmitFn = (msg: LogMessage) => void;

export interface ScanProgress {
  pct: number;
  phase: string;
}
