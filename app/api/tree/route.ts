import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const owner = process.env.GITHUB_OWNER!;
const appRepo = process.env.GITHUB_APP_REPO || 'creator-kb-2';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const space = searchParams.get('space');
  if (!space) return NextResponse.json({ error: 'Missing space' }, { status: 400 });

  try {
    const { data } = await octokit.repos.getContent({ owner, repo: appRepo, path: 'public/tree.json' });
    if ('content' in data) {
      const tree = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
      return NextResponse.json(tree[space] || {});
    }
  } catch (err) {
    console.error('Tree API error:', err);
  }

  return NextResponse.json({});
}
