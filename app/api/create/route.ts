import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

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
  const { space, title } = await request.json();
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
    return NextResponse.json({ success: true, fileName, path });
  } catch (err) {
    console.error('Create file error:', err);
    return NextResponse.json({ error: 'Failed to create file' }, { status: 500 });
  }
}
