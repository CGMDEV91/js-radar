import type { Finding, EmitFn } from '../types';
import axios from 'axios';

interface OsvVuln {
  id: string;
  summary?: string;
  severity?: Array<{ type: string; score: string }>;
  affected?: Array<{
    ranges?: Array<{
      type: string;
      events: Array<{ introduced?: string; fixed?: string }>;
    }>;
  }>;
}

interface OsvResponse {
  vulns?: OsvVuln[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractFixVersion(vuln: OsvVuln): string | null {
  for (const affected of vuln.affected ?? []) {
    for (const range of affected.ranges ?? []) {
      for (const event of range.events) {
        if (event.fixed) return event.fixed;
      }
    }
  }
  return null;
}

export async function osvScanner(
  existingFindings: Finding[],
  emit: EmitFn,
): Promise<Finding[]> {
  emit({ text: '🔬  Querying OSV.dev for additional CVEs...', type: 'info' });

  const seen = new Set<string>();
  const pairs: Array<{ library: string; version: string; file: string }> = [];

  for (const f of existingFindings) {
    const key = `${f.library}@${f.detectedVersion}`;
    if (!seen.has(key)) {
      seen.add(key);
      pairs.push({ library: f.library, version: f.detectedVersion, file: f.file });
    }
  }

  if (pairs.length === 0) {
    emit({ text: '🔬  OSV: no packages to check.', type: 'info' });
    return [];
  }

  const newFindings: Finding[] = [];
  const knownCves = new Set(existingFindings.flatMap((f) => f.cve));

  for (const { library, version, file } of pairs) {
    await sleep(200);

    try {
      const resp = await axios.post<OsvResponse>(
        'https://api.osv.dev/v1/query',
        { package: { name: library, ecosystem: 'npm' }, version },
        { timeout: 10000 },
      );

      const vulns = resp.data.vulns ?? [];

      for (const vuln of vulns) {
        if (knownCves.has(vuln.id)) continue;
        knownCves.add(vuln.id);

        const fixVersion = extractFixVersion(vuln);
        const description = vuln.summary ?? `Vulnerability ${vuln.id} in ${library} ${version}`;

        newFindings.push({
          scanner: 'osv.dev',
          file,
          library,
          detectedVersion: version,
          severity: 'high',
          cve: [vuln.id],
          status: 'vulnerable',
          fixVersion,
          downloadUrls: {},
          isEol: false,
          alternative: null,
          description,
        });

        emit({
          text: `⚠️  ${library} ${version} — ${vuln.id} (OSV) in ${file}`,
          type: 'warning',
        });
      }
    } catch {
      emit({
        text: `⚠ OSV query failed for ${library}@${version} — skipping`,
        type: 'warning',
      });
    }
  }

  if (newFindings.length === 0) {
    emit({ text: '✅  OSV.dev: no additional CVEs found.', type: 'success' });
  } else {
    emit({ text: `✅  OSV.dev: ${newFindings.length} additional CVE(s) found.`, type: 'warning' });
  }

  return newFindings;
}
