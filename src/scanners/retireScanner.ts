import type { ScannedFile, Finding, EmitFn } from '../types';
import { scanFileContent } from 'retire/lib/retire';
import type { Repository } from 'retire/lib/types';

const DB_URL =
  'https://raw.githubusercontent.com/RetireJS/retire.js/master/repository/jsrepository-v5.json';

let cachedDb: Repository | null = null;

async function loadDb(): Promise<Repository> {
  if (cachedDb) return cachedDb;
  const resp = await fetch(DB_URL);
  if (!resp.ok) throw new Error(`Failed to fetch retire.js DB: ${resp.status}`);
  const text = await resp.text();
  cachedDb = JSON.parse(text) as Repository;
  return cachedDb;
}

const SEVERITY_MAP: Record<string, Finding['severity']> = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
  none: 'info',
};

function mapSeverity(s: string): Finding['severity'] {
  return SEVERITY_MAP[s.toLowerCase()] ?? 'medium';
}

export async function retireScanner(
  files: ScannedFile[],
  emit: EmitFn,
): Promise<Finding[]> {
  emit({ text: '🛡️  Loading retire.js vulnerability database...', type: 'info' });

  let db: Repository;
  try {
    db = await loadDb();
  } catch (e) {
    emit({ text: `⚠ Could not load retire.js DB: ${(e as Error).message}`, type: 'warning' });
    return [];
  }

  emit({ text: '🛡️  Running retire.js vulnerability database check...', type: 'info' });

  const findings: Finding[] = [];
  let fileHits = 0;

  const hasher = {
    sha1: (_data: string) => '',
  };

  for (const file of files) {
    let results;
    try {
      results = scanFileContent(file.content, db, hasher);
    } catch {
      continue;
    }

    const vulnerable = results.filter(
      (r) => r.vulnerabilities && r.vulnerabilities.length > 0,
    );

    for (const component of vulnerable) {
      fileHits++;
      const vulns = component.vulnerabilities ?? [];

      for (const vuln of vulns) {
        const cves = vuln.identifiers?.CVE ?? [];
        const summary =
          vuln.identifiers?.summary ??
          vuln.details ??
          `Known vulnerability in ${component.component} ${component.version}`;

        findings.push({
          scanner: 'retire.js',
          file: file.path,
          library: component.component,
          detectedVersion: component.version,
          severity: mapSeverity(vuln.severity),
          cve: cves,
          status: 'vulnerable',
          fixVersion: vuln.below ?? null,
          downloadUrls: {},
          isEol: false,
          alternative: null,
          description: summary,
        });

        emit({
          text: `⚠️  ${component.component} ${component.version} — ${cves.join(', ') || 'vulnerability found'} in ${file.path}`,
          type: 'warning',
        });
      }
    }
  }

  if (fileHits === 0) {
    emit({ text: '✅  retire.js: no known vulnerabilities found.', type: 'success' });
  } else {
    emit({ text: `✅  retire.js: ${fileHits} vulnerable component(s) found.`, type: 'warning' });
  }

  return findings;
}
