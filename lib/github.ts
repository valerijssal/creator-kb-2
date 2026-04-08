import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const owner = process.env.GITHUB_OWNER!;
const repo = process.env.GITHUB_REPO!;

export const SPACES: Record<string, string> = {
  'media-cube': 'Confluence Export - MediaCube',
  'underscore-talent': 'Confluence Export - Underscore Talent',
  'creator-services': 'Confluence Export - Creator Services (main)',
  'creator-services-project': 'Confluence Export - Creator Services Project',
  'content-licensing': 'Confluence Export - Content Licensing',
};

export const SPACE_LABELS: Record<string, string> = {
  'media-cube': 'Media Cube',
  'underscore-talent': 'Underscore Talent',
  'creator-services': 'Creator Services',
  'creator-services-project': 'Creator Services Project',
  'content-licensing': 'Content Licensing',
};

export async function getSpaceFiles(spaceSlug: string): Promise<{ name: string; path: string; title: string }[]> {
  const folder = SPACES[spaceSlug];
  if (!folder) return [];

  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path: folder });
    if (!Array.isArray(data)) return [];

    return data
      .filter((f) => f.type === 'file' && f.name.endsWith('.html') && f.name !== 'index.html')
      .map((f) => ({
        name: f.name,
        path: f.path,
        title: fileNameToTitle(f.name),
      }))
      .sort((a, b) => a.title.localeCompare(b.title));
  } catch (err) {
    console.error('GitHub API error:', err);
    return [];
  }
}

export async function getFileContent(path: string): Promise<{ content: string; sha: string } | null> {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path });
    if ('content' in data) {
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return { content, sha: data.sha };
    }
    return null;
  } catch {
    return null;
  }
}

export async function updateFileContent(path: string, content: string, sha: string, message: string): Promise<boolean> {
  try {
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: Buffer.from(content).toString('base64'),
      sha,
    });
    return true;
  } catch {
    return false;
  }
}

export async function deleteFile(path: string, sha: string): Promise<boolean> {
  try {
    await octokit.repos.deleteFile({
      owner,
      repo,
      path,
      message: `Delete ${path}`,
      sha,
    });
    return true;
  } catch {
    return false;
  }
}

export async function moveFile(oldPath: string, newPath: string, sha: string): Promise<boolean> {
  try {
    const file = await getFileContent(oldPath);
    if (!file) return false;

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: newPath,
      message: `Move ${oldPath} to ${newPath}`,
      content: Buffer.from(file.content).toString('base64'),
    });

    await octokit.repos.deleteFile({
      owner,
      repo,
      path: oldPath,
      message: `Remove original after move`,
      sha,
    });

    return true;
  } catch {
    return false;
  }
}

export function fileNameToTitle(fileName: string): string {
  return fileName
    .replace(/\.html$/, '')
    .replace(/_\d+$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function slugToPath(spaceSlug: string, fileName: string): string {
  return `${SPACES[spaceSlug]}/${fileName}`;
}
