import type { ScannedFile, ProviderConfig } from '../types';

const SCRIPT_SRC_RE = /<script[^>]+src=["']([^"']+)["'][^>]*>/gi;

// Ordered list of CORS proxy builders — tried in sequence on failure
const PROXY_BUILDERS: Array<{ name: string; build: (u: string) => string }> = [
  {
    name: 'corsproxy.io',
    build: (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  },
  {
    name: 'allorigins.win',
    build: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  },
  {
    name: 'codetabs.com',
    build: (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  },
  {
    name: 'thingproxy',
    build: (u) => `https://thingproxy.freeboard.io/fetch/${u}`,
  },
  {
    name: 'htmldriven',
    build: (u) => `https://cors-proxy.htmldriven.com/?url=${encodeURIComponent(u)}`,
  },
];

function resolveUrl(src: string, baseUrl: string): string {
  try {
    return new URL(src, baseUrl).href;
  } catch {
    return src;
  }
}

function basename(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/');
    return parts[parts.length - 1] || u.hostname;
  } catch {
    return url.split('/').pop() ?? url;
  }
}

function classifyHttpError(status: number, proxyName?: string): string {
  if (status === 401 || status === 403) return `HTTP_AUTH_${status}`;
  if (status === 404) return `HTTP_404`;
  if (status === 408) return proxyName ? `PROXY_TIMEOUT via ${proxyName}` : `HTTP_408`;
  if (status === 413) return `PROXY_413`;
  if (status >= 520 && status <= 530) return `CLOUDFLARE_${status}`;
  if (status >= 500) return `HTTP_SERVER_${status}`;
  return proxyName ? `HTTP_${status} via ${proxyName}` : `HTTP_${status}`;
}

async function tryFetch(
  url: string,
  corsProxy: boolean,
  onProxyAttempt?: (msg: string) => void,
  signal?: AbortSignal,
): Promise<{ content: string; proxied: boolean; proxyName?: string }> {
  // 1. Try direct fetch first
  try {
    const resp = await fetch(url, { signal });
    if (!resp.ok) throw new Error(classifyHttpError(resp.status));
    return { content: await resp.text(), proxied: false };
  } catch (directErr) {
    if (!corsProxy) throw directErr;
  }

  // 2. Try each proxy in order
  let lastErr: Error = new Error('All proxies failed');
  for (const proxy of PROXY_BUILDERS) {
    try {
      onProxyAttempt?.(`↪ Trying ${proxy.name}...`);
      const proxyUrl = proxy.build(url);
      const resp = await fetch(proxyUrl, { signal });
      if (!resp.ok) {
        lastErr = new Error(classifyHttpError(resp.status, proxy.name));
        // On these codes, try the next proxy instead of giving up
        if ([400, 403, 408, 413, 429, 500, 502, 503, 504].includes(resp.status)) continue;
        throw lastErr;
      }
      return { content: await resp.text(), proxied: true, proxyName: proxy.name };
    } catch (e) {
      const raw = (e as Error).message ?? '';
      // Network-level failure (no HTTP response at all) — classify clearly
      const isNetworkErr =
        raw.toLowerCase().includes('failed to fetch') ||
        raw.toLowerCase().includes('network') ||
        raw.toLowerCase().includes('load failed');
      if (isNetworkErr) {
        lastErr = new Error(
          `Proxy could not reach the file (${proxy.name}). The asset may be on a CDN that blocks proxy IPs, requires session cookies, or is protected by a WAF.`,
        );
      } else {
        lastErr = e as Error;
      }
    }
  }

  throw lastErr;
}

export async function fetchFromPublicUrl(
  config: ProviderConfig,
  onProgress: (msg: string) => void,
  onFileProgress?: (fetched: number, total: number) => void,
): Promise<ScannedFile[]> {
  const siteUrl = config.siteUrl ?? '';
  const useCorsProxy = config.corsProxy ?? false;

  // Parse additional manual paths (one URL or path per line)
  const manualUrls: string[] = (config.additionalPaths ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((u) => resolveUrl(u, siteUrl));

  const files: ScannedFile[] = [];
  let htmlContent = '';

  // Step 1: fetch the HTML page (if siteUrl looks like a page, not a JS file)
  const looksLikePage = !siteUrl.endsWith('.js') && !siteUrl.endsWith('.css');
  if (looksLikePage && siteUrl) {
    onProgress(`🌐 Fetching page: ${siteUrl}`);
    try {
      const { content, proxied, proxyName } = await tryFetch(siteUrl, useCorsProxy, onProgress);
      htmlContent = content;
      onProgress(
        proxied
          ? `✅ Page fetched via ${proxyName}`
          : `✅ Page fetched successfully`,
      );
      files.push({
        path: '__html__',
        content: htmlContent,
        fetchStatus: proxied ? 'cors_proxied' : 'ok',
        originalUrl: siteUrl,
      });
    } catch (e) {
      const msg = (e as Error).message;
      const isCors =
        msg.toLowerCase().includes('failed to fetch') ||
        msg.toLowerCase().includes('cors') ||
        msg.toLowerCase().includes('network');

      if (msg.startsWith('PROXY_413')) {
        onProgress(`⚠ Page too large for CORS proxy (HTTP 413)`);
        if (!manualUrls.length) throw new Error(`PROXY_413: ${siteUrl}`);
      } else if (msg.startsWith('CLOUDFLARE_')) {
        const code = msg.split('_')[1];
        onProgress(`🛡 Cloudflare blocked proxy access (HTTP ${code})`);
        if (!manualUrls.length) throw new Error(`CLOUDFLARE_${code}: ${siteUrl}`);
      } else if (msg.startsWith('HTTP_AUTH_')) {
        const code = msg.split('_')[2];
        onProgress(`🔒 Access denied (HTTP ${code}) — site requires authentication`);
        if (!manualUrls.length) throw new Error(`HTTP_AUTH_${code}: ${siteUrl}`);
      } else if (msg.startsWith('HTTP_404')) {
        onProgress(`❌ Page not found (HTTP 404)`);
        if (!manualUrls.length) throw new Error(`HTTP_404: ${siteUrl}`);
      } else if (isCors) {
        onProgress(`⚠ Page blocked by CORS — will try JS files directly${useCorsProxy ? ' via proxy' : ''}`);
        if (!manualUrls.length && !useCorsProxy) throw new Error(`CORS_BLOCKED: ${siteUrl}`);
      } else {
        onProgress(`⚠ Could not fetch page: ${msg}`);
        if (!manualUrls.length) throw new Error(`Could not fetch ${siteUrl}: ${msg}`);
      }
    }
  }

  // Step 2: collect script URLs from HTML
  const scriptUrls: string[] = [];
  if (htmlContent) {
    SCRIPT_SRC_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = SCRIPT_SRC_RE.exec(htmlContent)) !== null) {
      const src = match[1];
      if (!src.startsWith('data:') && (src.endsWith('.js') || src.includes('.js?'))) {
        scriptUrls.push(resolveUrl(src, siteUrl));
      }
    }
    onProgress(`📦 Found ${scriptUrls.length} <script> tags in page HTML`);
  }

  // Step 3: merge script URLs + manual paths, deduplicate
  const allUrls = [...new Set([...scriptUrls, ...manualUrls])];
  if (allUrls.length === 0 && !htmlContent) {
    throw new Error(
      `Could not fetch ${siteUrl} (CORS). Add JS file URLs in the "Additional JS paths" field, or enable the CORS proxy.`,
    );
  }

  onProgress(`🔎 Will attempt to fetch ${allUrls.length} JS file(s)...`);

  // Step 4: fetch each JS file, track status per file
  let okCount = 0;
  let corsCount = 0;
  let errCount = 0;
  const total = allUrls.length;

  for (let idx = 0; idx < allUrls.length; idx++) {
    const url = allUrls[idx];
    const name = basename(url);
    try {
      const { content, proxied, proxyName } = await tryFetch(url, useCorsProxy, onProgress);
      okCount++;
      onFileProgress?.(idx + 1, total);
      onProgress(
        proxied
          ? `🔁 [${proxyName}] ${name}`
          : `✅ ${name}`,
      );
      files.push({
        path: url,
        content,
        fetchStatus: proxied ? 'cors_proxied' : 'ok',
        originalUrl: url,
      });
    } catch (e) {
      const msg = (e as Error).message;
      const isCors =
        msg.toLowerCase().includes('failed to fetch') ||
        msg.toLowerCase().includes('cors') ||
        msg.toLowerCase().includes('network');

      onFileProgress?.(idx + 1, total);
      if (isCors && !useCorsProxy) {
        corsCount++;
        onProgress(`🚫 CORS blocked: ${name}`);
        files.push({
          path: url,
          content: '',
          fetchStatus: 'cors_blocked',
          fetchError: 'Blocked by CORS policy',
          originalUrl: url,
        });
      } else {
        errCount++;
        onProgress(`❌ ${name}: ${msg}`);
        files.push({
          path: url,
          content: '',
          fetchStatus: 'error',
          fetchError: msg,
          originalUrl: url,
        });
      }
    }
  }

  onProgress(
    `📊 Fetch complete — ✅ ${okCount} fetched, 🚫 ${corsCount} CORS blocked, ❌ ${errCount} errors`,
  );

  return files;
}
