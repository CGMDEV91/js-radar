import axios from 'axios';
import type { ScannedFile, ProviderConfig } from '../types';

interface TreeEntry {
  id: string;
  name: string;
  type: 'blob' | 'tree';
  path: string;
  mode: string;
}

function parseGitlabUrl(url: string): { projectPath: string } {
  const match = url.match(/gitlab\.com\/(.+?)(?:\.git)?\/?$/);
  if (!match) throw new Error('Invalid GitLab URL. Expected: https://gitlab.com/namespace/project');
  return { projectPath: match[1] };
}

function isSkipped(path: string): boolean {
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

async function fetchTree(
  projectId: string,
  headers: Record<string, string>,
  page: number = 1,
): Promise<TreeEntry[]> {
  const resp = await axios.get<TreeEntry[]>(
    `https://gitlab.com/api/v4/projects/${projectId}/repository/tree?recursive=true&per_page=100&page=${page}`,
    { headers, timeout: 30000 },
  );

  const items = resp.data;
  const nextPage = resp.headers['x-next-page'];
  if (nextPage && parseInt(nextPage, 10) > page) {
    const more = await fetchTree(projectId, headers, parseInt(nextPage, 10));
    return [...items, ...more];
  }
  return items;
}

export async function fetchFromGitlab(
  config: ProviderConfig,
  onProgress: (msg: string) => void,
  onFileProgress?: (fetched: number, total: number) => void,
): Promise<ScannedFile[]> {
  const { projectPath } = parseGitlabUrl(config.repoUrl ?? '');
  const projectId = encodeURIComponent(projectPath);

  const headers: Record<string, string> = {};
  if (config.token) {
    headers['PRIVATE-TOKEN'] = config.token;
  }

  onProgress(`📂 Fetching file tree for ${projectPath}...`);

  let tree: TreeEntry[];
  try {
    tree = await fetchTree(projectId, headers);
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const status = e.response?.status;
      if (status === 401) throw new Error('Invalid token — check your access token has read_repository scope.');
      if (status === 403) throw new Error('Access denied. Check your token permissions.');
      if (status === 404) throw new Error('Repository not found. Check the URL is correct.');
    }
    throw new Error(`Network error fetching repository: ${(e as Error).message}`);
  }

  const jsFiles = tree.filter(
    (item) => item.type === 'blob' && item.path.endsWith('.js') && !isSkipped(item.path),
  );

  onProgress(`📦 Found ${jsFiles.length} JavaScript files to download...`);

  const files: ScannedFile[] = [];
  const total = jsFiles.length;

  for (let i = 0; i < jsFiles.length; i++) {
    const item = jsFiles[i];
    const encodedPath = encodeURIComponent(item.path);

    try {
      const resp = await axios.get<string>(
        `https://gitlab.com/api/v4/projects/${projectId}/repository/files/${encodedPath}/raw?ref=main`,
        { headers, responseType: 'text', timeout: 15000 },
      );
      files.push({ path: item.path, content: resp.data, fetchStatus: 'ok' });
      onFileProgress?.(i + 1, total);

      if ((i + 1) % 10 === 0) {
        onProgress(`⬇ Downloaded ${i + 1}/${jsFiles.length} files...`);
      }
    } catch {
      try {
        const resp = await axios.get<string>(
          `https://gitlab.com/api/v4/projects/${projectId}/repository/files/${encodedPath}/raw?ref=master`,
          { headers, responseType: 'text', timeout: 15000 },
        );
        files.push({ path: item.path, content: resp.data, fetchStatus: 'ok' });
        onFileProgress?.(i + 1, total);
      } catch (e2) {
        const msg = (e2 as Error).message;
        onProgress(`⚠ Could not fetch ${item.path} — skipping`);
        onFileProgress?.(i + 1, total);
        files.push({ path: item.path, content: '', fetchStatus: 'error', fetchError: msg });
      }
    }
  }

  return files;
}
