import type { ScannedFile, Finding, EmitFn } from '../types';
import { versionLt } from '../utils/semver';

const GSAP_FINGERPRINT =
  /TweenLite|TweenMax|gsap\.|GSAPConfig|_gsap|ScrollTrigger|TimelineLite|TimelineMax/;

const VERSION_PATTERN = /version="(\d+\.\d+\.\d+)"/g;

const SAFE_VERSION = '3.6.0';
const CVE = 'CVE-2020-28478';

export async function gsapScanner(
  files: ScannedFile[],
  emit: EmitFn,
): Promise<Finding[]> {
  emit({ text: `🔎  Scanning for GSAP ${CVE}...`, type: 'info' });

  const findings: Finding[] = [];
  let gsapFiles = 0;

  for (const file of files) {
    if (!GSAP_FINGERPRINT.test(file.content)) continue;

    const versions: string[] = [];
    VERSION_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = VERSION_PATTERN.exec(file.content)) !== null) {
      const v = match[1];
      if (!v.startsWith('0.') && !versions.includes(v)) {
        versions.push(v);
      }
    }

    if (versions.length === 0) continue;

    gsapFiles++;
    const vulnerableVersions = versions.filter((v) => versionLt(v, SAFE_VERSION));

    for (const ver of vulnerableVersions) {
      findings.push({
        scanner: 'gsap-scanner',
        file: file.path,
        library: 'gsap',
        detectedVersion: ver,
        severity: 'high',
        cve: [CVE],
        status: 'vulnerable',
        fixVersion: SAFE_VERSION,
        downloadUrls: {},
        isEol: false,
        alternative: null,
        description: `GSAP ${ver} is vulnerable to ${CVE} — prototype pollution via the gsap.set() function.`,
      });

      emit({
        text: `⚠️  gsap ${ver} — ${CVE} found in ${file.path}`,
        type: 'warning',
      });
    }
  }

  if (gsapFiles === 0) {
    emit({ text: '✅  No GSAP files found.', type: 'success' });
  } else if (findings.length === 0) {
    emit({ text: `✅  GSAP scan: all ${gsapFiles} file(s) use safe versions.`, type: 'success' });
  }

  return findings;
}
