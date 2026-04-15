import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { notifySlack } from '@/lib/github';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const owner = process.env.GITHUB_OWNER!;
const appRepo = process.env.GITHUB_APP_REPO || 'creator-kb-2';

const LEVEL_RANK: Record<string, number> = {
  open: 0, team: 1, limited: 2, restricted: 3, executive: 4, admin: 99,
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

function canAccess(sessionLevel: string, requiredLevel: string): boolean {
  if (sessionLevel === 'admin') return true;
  return LEVEL_RANK[sessionLevel] >= LEVEL_RANK[requiredLevel];
}

async function getJson(path: string) {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo: appRepo, path });
    if ('content' in data) return JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
  } catch (err) { console.error('tree error:', err); notifySlack(':warning: *KB tree error:* ' + String(err)); }
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const space = searchParams.get('space') ?? '';
  const sessionLevel = getSessionLevel(request);

  const [tree, access] = await Promise.all([
    getJson('public/tree.json'),
    getJson('public/access.json'),
  ]);

  if (!tree) return NextResponse.json({});

  const spaceAccess = access?.spaces ?? {};
  const docAccess = access?.docs ?? {};

  if (space === 'all') {
    const filtered: Record<string, unknown> = {};
    for (const [slug, pages] of Object.entries(tree)) {
      const sLevel = spaceAccess[slug] ?? 'open';
      if (!canAccess(sessionLevel, sLevel)) continue;
      const blocked = new Set<string>();
      for (const [file] of Object.entries(pages as Record<string, unknown>)) {
        const docLevel = docAccess[file] ?? sLevel;
        if (!canAccess(sessionLevel, docLevel)) blocked.add(file);
      }
      let changed = true;
      while (changed) {
        changed = false;
        for (const [file, page] of Object.entries(pages as Record<string, { parent: string | null }>)) {
          if (!blocked.has(file) && page.parent && blocked.has(page.parent)) {
            blocked.add(file);
            changed = true;
          }
        }
      }
      const filteredPages: Record<string, unknown> = {};
      for (const [file, page] of Object.entries(pages as Record<string, unknown>)) {
        if (!blocked.has(file)) filteredPages[file] = page;
      }
      filtered[slug] = filteredPages;
    }
    return NextResponse.json(filtered);
  }

  const spaceLevel = spaceAccess[space] ?? 'open';
  if (!canAccess(sessionLevel, spaceLevel)) return NextResponse.json({});

  const pages = tree[space] ?? {} as Record<string, { file: string; title: string; parent: string | null }>;

  // Step 1: Determine which pages are directly blocked
  const blocked = new Set<string>();
  for (const [file] of Object.entries(pages)) {
    const docLevel = docAccess[file] ?? spaceLevel;
    if (!canAccess(sessionLevel, docLevel)) blocked.add(file);
  }

  // Step 2: Cascade — if a parent is blocked, block all descendants
  let changed = true;
  while (changed) {
    changed = false;
    for (const [file, page] of Object.entries(pages as Record<string, { parent: string | null }>)) {
      if (!blocked.has(file) && page.parent && blocked.has(page.parent)) {
        blocked.add(file);
        changed = true;
      }
    }
  }

  // Step 3: Build filtered result
  const filtered: Record<string, unknown> = {};
  for (const [file, page] of Object.entries(pages)) {
    if (!blocked.has(file)) filtered[file] = page;
  }

  return NextResponse.json(filtered);
}
