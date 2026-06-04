import axios from 'axios';
import type { ScannedFile, ProviderConfig } from '../types';

interface BitbucketEntry {
  path: string;
  type: 'commit_file' | 'commit_directory';
  size?: number;
}

interface BitbucketResponse {
  values: BitbucketEntry[];
  next?: string;
}

function parseBitbucketUrl(url: string): { workspace: string; repo: string } {
  const match = url.match(/bitbucket\.org\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (!match) throw new Error('Invalid Bitbucket URL. Expected: https://bitbucket.org/workspace/repo');
  return { workspace: match[1], repo: match[2] };
}

function isSkipped(path: string, size?: number): boolean {
  if (size && size > 500_000) return true;
  const lower = path.toLowerCase();
  return (
    lower.includes('node_modules/') ||
    lower.includes('.git/') ||
    lower.includes('/vendor/') ||
    lower.includes('/test/') ||
    lower.includes('/tests/') ||
    lower.includes('/spec/')
  );
}

async function walkDirectory(
  workspace: string,
  repo: string,
  headers: Record<string, string>,
  path: string = '',
  onProgress: (msg: string) => void,
): Promise<BitbucketEntry[]> {
  const url = path
    ? `https://api.bitbucket.org/2.0/repositories/${workspace}/${repo}/src/HEAD/${path}?pagelen=100`
    : `https://api.bitbucket.org/2.0/repositories/${workspace}/${repo}/src/?pagelen=100`;

  const allEntries: BitbucketEntry[] = [];
  let pageUrl: string = url;
  let hasMore = true;

  while (hasMore) {
    const resp = await axios.get<BitbucketResponse>(pageUrl, { headers, timeout: 30000 });
    const entries = resp.data.values ?? [];
    allEntries.push(...entries);
    if (resp.data.next) {
      pageUrl = resp.data.next;
    } else {
      hasMore = false;
    }
  }

  const files: BitbucketEntry[] = [];
  for (const entry of allEntries) {
    if (entry.type === 'commit_file') {
      files.push(entry);
    } else if (entry.type === 'commit_directory') {
      onProgress(`📂 Reading ${entry.path}...`);
      const subFiles = await walkDirectory(workspace, repo, headers, entry.path, onProgress);
      files.push(...subFiles);
    }
  }

  return files;
}

export async function fetchFromBitbucket(
  config: ProviderConfig,
  onProgress: (msg: string) => void,
  onFileProgress?: (fetched: number, total: number) => void,
  shouldStop?: () => boolean,
): Promise<ScannedFile[]> {
  const { workspace, repo } = parseBitbucketUrl(config.repoUrl ?? '');

  const headers: Record<string, string> = {};
  if (config.token) {
    headers['Authorization'] = `Bearer ${config.token}`;
  }

  onProgress(`📂 Fetching repository structure for ${workspace}/${repo}...`);

  let allEntries: BitbucketEntry[];
  try {
    allEntries = await walkDirectory(workspace, repo, headers, '', onProgress);
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const status = e.response?.status;
      if (status === 401) throw new Error('Invalid token — check your App Password has Repositories read permission.');
      if (status === 403) throw new Error('Access denied. Check your token permissions.');
      if (status === 404) throw new Error('Repository not found. Check the URL is correct.');
    }
    throw new Error(`Network error fetching repository: ${(e as Error).message}`);
  }

  const jsFiles = allEntries.filter(
    (e) => e.path.endsWith('.js') && !isSkipped(e.path, e.size),
  );

  onProgress(`📦 Found ${jsFiles.length} JavaScript files to download...`);

  const files: ScannedFile[] = [];
  const total = jsFiles.length;

  for (let i = 0; i < jsFiles.length; i++) {
    if (shouldStop?.()) { onProgress('🛑 Fetch interrupted by user.'); break; }
    const entry = jsFiles[i];
    try {
      const resp = await axios.get<string>(
        `https://api.bitbucket.org/2.0/repositories/${workspace}/${repo}/src/HEAD/${entry.path}`,
        { headers, responseType: 'text', timeout: 15000 },
      );
      files.push({ path: entry.path, content: resp.data, fetchStatus: 'ok' });
      onFileProgress?.(i + 1, total);

      if ((i + 1) % 10 === 0) {
        onProgress(`⬇ Downloaded ${i + 1}/${jsFiles.length} files...`);
      }
    } catch (e) {
      const msg = (e as Error).message;
      onProgress(`⚠ Could not fetch ${entry.path} — skipping`);
      onFileProgress?.(i + 1, total);
      files.push({ path: entry.path, content: '', fetchStatus: 'error', fetchError: msg });
    }
  }

  return files;
}
