import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const owner = process.env.GITHUB_OWNER!;
const appRepo = process.env.GITHUB_APP_REPO || 'creator-kb-2';

const LEVEL_RANK: Record<string, number> = {
  open: 0,
  team: 1,
  limited: 2,
  restricted: 3,
  executive: 4,
  admin: 99,
};

function getSessionLevel(request: NextRequest): string {
  const password = request.cookies.get('kb_session')?.value ?? '';
  if (password === process.env.PASS_ADMIN) return 'admin';
  if (password === process.env.PASS_EXECUTIVE) return 'executive';
  if (password === process.env.PASS_RESTRICTED) return 'restricted';
  if (password === process.env.PASS_LIMITED) return 'limited';
  if (password === process.env.PASS_TEAM) return 'team';
  return 'open';
}

async function getAccess() {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo: appRepo, path: 'public/access.json' });
    if ('content' in data) {
      return JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
    }
  } catch {}
  return { spaces: {}, docs: {} };
}

export async function GET(request: NextRequest) {
  const sessionLevel = getSessionLevel(request);
  const access = await getAccess();
  return NextResponse.json({ sessionLevel, access });
}

export async function PUT(request: NextRequest) {
  const sessionLevel = getSessionLevel(request);
  if (sessionLevel !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const { spaces, docs } = await request.json();

  const current = await getAccess();
  const updated = {
    spaces: { ...current.spaces, ...spaces },
    docs: { ...current.docs, ...docs },
  };

  try {
    const { data: existing } = await octokit.repos.getContent({ owner, repo: appRepo, path: 'public/access.json' });
    const sha = 'sha' in existing ? existing.sha : '';
    await octokit.repos.createOrUpdateFileContents({
      owner, repo: appRepo, path: 'public/access.json',
      message: 'Update access control',
      content: Buffer.from(JSON.stringify(updated, null, 2)).toString('base64'),
      sha,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
