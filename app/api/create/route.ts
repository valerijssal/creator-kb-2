import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { notifySlack } from '@/lib/github';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const owner = process.env.GITHUB_OWNER!;
const repo = process.env.GITHUB_REPO!;

const SPACES: Record<string, string> = {
  'media-cube': 'Confluence Export - MediaCube',
  'underscore-talent': 'Confluence Export - Underscore Talent',
  'creator-services': 'Confluence Export - Creator Services (main)',
  'creator-services-project': 'Confluence Export - Creator Services Project',
  'content-licensing': 'Confluence Export - Content Licensing',
};

export async function POST(request: NextRequest) {
  const { space, title, parentFile } = await request.json();
  if (!space || !title) return NextResponse.json({ error: 'Missing space or title' }, { status: 400 });

  const folder = SPACES[space];
  if (!folder) return NextResponse.json({ error: 'Invalid space' }, { status: 400 });

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const timestamp = Date.now();
  const fileName = `${slug}_${timestamp}.html`;
  const path = `${folder}/${fileName}`;

  const htmlContent = `<!DOCTYPE html>
<html>
<head><title>${title}</title></head>
<body>
<div id="main-content" class="wiki-content group">
<p></p>
</div>
</body>
</html>`;

  try {
    await octokit.repos.createOrUpdateFileContents({
      owner, repo, path,
      message: `Create new page: ${title}`,
      content: Buffer.from(htmlContent).toString('base64'),
    });
    // Update tree.json with new file entry
    const appRepo = process.env.GITHUB_APP_REPO || 'creator-kb-2';
    try {
      const { data: treeData } = await octokit.repos.getContent({ owner, repo: appRepo, path: 'public/tree.json' });
      if ('content' in treeData) {
        const tree = JSON.parse(Buffer.from(treeData.content, 'base64').toString('utf-8'));
        if (!tree[space]) tree[space] = {};
        tree[space][fileName] = { file: fileName, title, parent: parentFile || null };
        await octokit.repos.createOrUpdateFileContents({
          owner, repo: appRepo, path: 'public/tree.json',
          message: `Add ${fileName} to tree`,
          content: Buffer.from(JSON.stringify(tree, null, 2)).toString('base64'),
          sha: treeData.sha,
        });
      }
    } catch (err) { console.error('create error:', err); notifySlack(':warning: *KB create error:* ' + String(err)); }
    // Update titles.json
    try {
      const { data: titlesData } = await octokit.repos.getContent({ owner, repo: appRepo, path: 'public/titles.json' });
      if ('content' in titlesData) {
        const titles = JSON.parse(Buffer.from(titlesData.content, 'base64').toString('utf-8'));
        titles[fileName] = title;
        await octokit.repos.createOrUpdateFileContents({
          owner, repo: appRepo, path: 'public/titles.json',
          message: `Add ${fileName} to titles`,
          content: Buffer.from(JSON.stringify(titles, null, 2)).toString('base64'),
          sha: titlesData.sha,
        });
      }
    } catch (err) { console.error('create error:', err); notifySlack(':warning: *KB create error:* ' + String(err)); }
    return NextResponse.json({ success: true, fileName, path });
  } catch (err) {
    console.error('Create file error:', err);
    return NextResponse.json({ error: 'Failed to create file' }, { status: 500 });
  }
}
