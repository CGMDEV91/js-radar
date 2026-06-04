import type { ProviderConfig, Finding, EmitFn, ScanProgress, ScannedFile, FileResult, FileLibrary } from '../types';
import { fetchFiles } from '../providers/index';
import { retireScanner } from './retireScanner';
import { gsapScanner } from './gsapScanner';
import { osvScanner } from './osvScanner';
import { sriChecker } from './sriChecker';
import { secretsScanner } from './secretsScanner';
import { enrichWithFix } from '../fixEngine';

type ProgressFn = (progress: ScanProgress) => void;

function dedup(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.scanner}:${f.file}:${f.library}:${f.detectedVersion}:${f.cve.join(',')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function basename(path: string): string {
  try {
    const u = new URL(path);
    const parts = u.pathname.split('/');
    return parts[parts.length - 1] || path;
  } catch {
    return path.split('/').pop() ?? path;
  }
}

function buildFileResults(files: ScannedFile[], findings: Finding[]): FileResult[] {
  // Group findings by file path
  const findingsByFile = new Map<string, Finding[]>();
  for (const f of findings) {
    const list = findingsByFile.get(f.file) ?? [];
    list.push(f);
    findingsByFile.set(f.file, list);
  }

  return files
    .filter((f) => f.path !== '__html__')
    .map((f) => {
      const url = f.originalUrl ?? f.path;
      const filefindings = findingsByFile.get(url) ?? findingsByFile.get(f.path) ?? [];

      // Build library list from findings + detect versions from content
      const libMap = new Map<string, FileLibrary>();
      for (const finding of filefindings) {
        if (!finding.library) continue;
        const key = `${finding.library}@${finding.detectedVersion}`;
        libMap.set(key, {
          name: finding.library,
          version: finding.detectedVersion,
          safe: finding.status !== 'vulnerable',
        });
      }

      // Also extract GSAP versions from content even when safe (no finding)
      if (f.content) {
        const versionRe = /version="(\d+\.\d+\.\d+)"/g;
        const gsapRe = /TweenLite|TweenMax|gsap\.|GSAPConfig|_gsap|ScrollTrigger/;
        if (gsapRe.test(f.content)) {
          let m: RegExpExecArray | null;
          versionRe.lastIndex = 0;
          while ((m = versionRe.exec(f.content)) !== null) {
            const ver = m[1];
            if (!ver.startsWith('0.')) {
              const key = `gsap@${ver}`;
              if (!libMap.has(key)) {
                libMap.set(key, { name: 'gsap', version: ver, safe: true });
              }
            }
          }
        }
      }

      return {
        url,
        name: basename(url),
        status: f.fetchStatus ?? 'ok',
        statusMessage: f.fetchError,
        libs: Array.from(libMap.values()),
      };
    });
}

export async function runScan(
  config: ProviderConfig,
  onLog: EmitFn,
  onProgress: ProgressFn,
): Promise<{ findings: Finding[]; filesScanned: number; fileResults: FileResult[] }> {
  const allFindings: Finding[] = [];

  onProgress({ pct: 0, phase: `Connecting to ${config.provider}...` });
  onLog({ text: `🔍 Connecting to ${config.provider} API...`, type: 'info' });

  onProgress({ pct: 5, phase: 'Reading repository file tree...' });
  onLog({ text: '📂 Reading repository structure...', type: 'info' });

  let files: ScannedFile[];
  try {
    files = await fetchFiles(config, (msg) => onLog({ text: msg, type: 'info' }));
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.startsWith('CORS_BLOCKED:')) {
      onLog({ text: `🚫 CORS: The browser was blocked from fetching this page directly.`, type: 'warning' });
      onLog({ text: `ℹ Same request works with curl — this is a browser security restriction, not a server error.`, type: 'info' });
    } else if (msg.startsWith('PROXY_413:')) {
      onLog({ text: `⚠ PROXY_413: Page is too large for corsproxy.io (HTTP 413).`, type: 'warning' });
      onLog({ text: `ℹ Paste specific JS file URLs (e.g. from DevTools or curl) in the "Additional JS paths" field.`, type: 'info' });
    } else if (msg.startsWith('CLOUDFLARE_')) {
      const code = msg.split(':')[0].split('_')[1];
      onLog({ text: `🛡 CLOUDFLARE_${code}: Cloudflare blocked the proxy from accessing this site.`, type: 'warning' });
      onLog({ text: `ℹ HTTP ${code} is a Cloudflare WAF/bot-protection response — not an attack against you.`, type: 'info' });
      onLog({ text: `ℹ The proxy IP (corsproxy.io) is likely flagged. Try pasting direct JS file URLs, or the site may require VPN/intranet access.`, type: 'info' });
    } else if (msg.startsWith('HTTP_AUTH_')) {
      const code = msg.split(':')[0].split('_')[2];
      onLog({ text: `🔒 HTTP ${code}: Authentication required — this site blocks public access.`, type: 'warning' });
      onLog({ text: `ℹ Try using GitHub/GitLab/Bitbucket mode if the source code is in a repo.`, type: 'info' });
    } else if (msg.startsWith('HTTP_404:')) {
      onLog({ text: `❌ HTTP 404: Page not found — check the URL is correct.`, type: 'error' });
    } else if (msg.includes('PROXY_TIMEOUT') || msg.includes('408')) {
      onLog({ text: `⏱ Proxy timeout (HTTP 408): All proxies timed out trying to reach this site.`, type: 'warning' });
      onLog({ text: `ℹ This usually means the site actively blocks automated/proxy requests (common on Atlassian, Salesforce, and enterprise portals).`, type: 'info' });
      onLog({ text: `ℹ Options: (1) Paste specific JS file URLs from browser DevTools into "Additional JS paths". (2) Use GitHub/GitLab mode if the source is in a repo. (3) The site may require VPN or corporate network access.`, type: 'info' });
    } else {
      onLog({ text: `❌ ${msg}`, type: 'error' });
    }
    onProgress({ pct: 100, phase: 'Scan complete (0 files fetched)' });
    return { findings: [], filesScanned: 0, fileResults: [] };
  }

  const jsFiles = files.filter((f) => f.path !== '__html__');
  const fetchableFiles = jsFiles.filter((f) => f.fetchStatus !== 'cors_blocked' && f.fetchStatus !== 'error' && f.content);
  const blockedFiles = jsFiles.filter((f) => f.fetchStatus === 'cors_blocked');
  const errorFiles = jsFiles.filter((f) => f.fetchStatus === 'error');

  onProgress({ pct: 15, phase: `Analyzing ${fetchableFiles.length} JS file(s)...` });

  if (config.provider === 'publicUrl') {
    onLog({
      text: `📦 ${jsFiles.length} JS file(s) found — ${fetchableFiles.length} fetched, ${blockedFiles.length} CORS blocked, ${errorFiles.length} errors`,
      type: fetchableFiles.length < jsFiles.length ? 'warning' : 'success',
    });
  } else {
    onLog({ text: `📦 Found ${fetchableFiles.length} JavaScript files to analyze`, type: 'info' });
  }

  if (fetchableFiles.length === 0 && jsFiles.length > 0) {
    onLog({ text: `⚠ No files could be read — all ${jsFiles.length} file(s) were blocked or errored.`, type: 'warning' });
    onLog({ text: `ℹ Enable "CORS proxy" to route requests through corsproxy.io, or paste explicit JS file URLs.`, type: 'info' });
    onProgress({ pct: 100, phase: `Scan complete (${blockedFiles.length} CORS blocked)` });
    return {
      findings: [],
      filesScanned: 0,
      fileResults: buildFileResults(files, []),
    };
  }

  onProgress({ pct: 30, phase: 'Running retire.js...' });
  try {
    const retireFindings = await retireScanner(fetchableFiles, onLog);
    allFindings.push(...retireFindings);
  } catch (e) {
    onLog({ text: `⚠ retire.js scanner error: ${(e as Error).message}`, type: 'warning' });
  }

  onProgress({ pct: 45, phase: 'Scanning for GSAP vulnerabilities...' });
  try {
    const gsapFindings = await gsapScanner(fetchableFiles, onLog);
    allFindings.push(...gsapFindings);
  } catch (e) {
    onLog({ text: `⚠ GSAP scanner error: ${(e as Error).message}`, type: 'warning' });
  }

  onProgress({ pct: 55, phase: 'Querying OSV.dev for additional CVEs...' });
  try {
    const osvFindings = await osvScanner(allFindings, onLog);
    allFindings.push(...osvFindings);
  } catch (e) {
    onLog({ text: `⚠ OSV scanner error: ${(e as Error).message}`, type: 'warning' });
  }

  onProgress({ pct: 70, phase: 'Checking Subresource Integrity...' });
  if (config.provider === 'publicUrl') {
    const htmlFile = files.find((f) => f.path === '__html__');
    if (htmlFile) {
      try {
        const sriFindings = sriChecker(htmlFile.content, config.siteUrl ?? 'page', onLog);
        allFindings.push(...sriFindings);
      } catch (e) {
        onLog({ text: `⚠ SRI checker error: ${(e as Error).message}`, type: 'warning' });
      }
    } else {
      onLog({ text: '🔗  SRI check: skipped (HTML page not fetched).', type: 'info' });
    }
  } else {
    onLog({ text: '🔗  SRI check: skipped (applies to Public URL mode only).', type: 'info' });
  }

  onProgress({ pct: 80, phase: 'Scanning for hardcoded secrets...' });
  try {
    const secretFindings = await secretsScanner(fetchableFiles, onLog);
    allFindings.push(...secretFindings);
  } catch (e) {
    onLog({ text: `⚠ Secrets scanner error: ${(e as Error).message}`, type: 'warning' });
  }

  onProgress({ pct: 90, phase: 'Enriching findings with fix suggestions...' });
  const enriched = dedup(allFindings).map(enrichWithFix);

  const phaseLabel = blockedFiles.length > 0
    ? `Scan complete — ${blockedFiles.length} file(s) could not be read (CORS)`
    : 'Scan complete!';

  onProgress({ pct: 100, phase: phaseLabel });
  onLog({
    text: `✨  Scan complete! ${enriched.length} issue(s) found in ${fetchableFiles.length} file(s) scanned.`,
    type: enriched.length === 0 ? 'success' : 'warning',
  });
  if (blockedFiles.length > 0) {
    onLog({
      text: `⚠ ${blockedFiles.length} file(s) could not be scanned due to CORS — results may be incomplete.`,
      type: 'warning',
    });
  }

  const fileResults = buildFileResults(files, enriched);

  return { findings: enriched, filesScanned: fetchableFiles.length, fileResults };
}
