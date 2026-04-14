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

const SPACE_LABELS: Record<string, string> = {
  'media-cube': 'Media Cube',
  'underscore-talent': 'Underscore Talent',
  'creator-services': 'Creator Services',
  'creator-services-project': 'Creator Services Project',
  'content-licensing': 'Content Licensing',
};

async function getAllFiles(): Promise<{ name: string; path: string; space: string; spaceLabel: string }[]> {
  const all = [];
  for (const [slug, folder] of Object.entries(SPACES)) {
    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path: folder });
      if (Array.isArray(data)) {
        for (const f of data) {
          if (f.type === 'file' && f.name.endsWith('.html')) {
            all.push({ name: f.name, path: f.path, space: slug, spaceLabel: SPACE_LABELS[slug] });
          }
        }
      }
    } catch { continue; }
  }
  return all;
}

async function getFileText(path: string): Promise<string> {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path });
    if ('content' in data) {
      const html = Buffer.from(data.content, 'base64').toString('utf-8');
      return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 3000);
    }
  } catch { }
  return '';
}

export async function POST(request: NextRequest) {
  const { query } = await request.json();
  if (!query) return NextResponse.json({ error: 'No query' }, { status: 400 });

  // Get all files
  const files = await getAllFiles();

  // Load titles
  let titles: Record<string, string> = {};
  try {
    const appRepo = process.env.GITHUB_APP_REPO || 'creator-kb-2';
    const { data } = await octokit.repos.getContent({ owner, repo: appRepo, path: 'public/titles.json' });
    if ('content' in data) {
      titles = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
    }
  } catch { }

  // First: fast title search across all files using titles.json
  const titleResults: {title: string; path: string; space: string; spaceLabel: string}[] = [];
  const queryLower = query.toLowerCase();
  for (const file of files) {
    const title = titles[file.name] || '';
    if (title.toLowerCase().includes(queryLower) || file.name.toLowerCase().includes(queryLower)) {
      titleResults.push({ title: title || file.name, path: file.path, space: file.space, spaceLabel: file.spaceLabel });
    }
  }
  if (titleResults.length > 0) {
    const results = titleResults.slice(0, 10).map(r => ({
      title: r.title.replace(/^[^:]+:\s*/, ''),
      path: r.path,
      space: r.space,
      spaceLabel: r.spaceLabel,
      reason: 'Title match',
    }));
    return NextResponse.json({ results });
  }

  // Fallback: Sample up to 60 files — fetch their content and pass to Claude
  const sample = files.slice(0, 60);
  const docs = await Promise.all(
    sample.map(async (f) => {
      const text = await getFileText(f.path);
      return {
        name: f.name,
        path: f.path,
        space: f.space,
        spaceLabel: f.spaceLabel,
        title: titles[f.name] || f.name,
        text,
      };
    })
  );

  // Call Claude API
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: `You are a knowledge base search assistant. Given a user query and a list of documents with their content, identify the most relevant documents. Return a JSON array of matches with fields: title, path, space, spaceLabel, reason (one sentence why it matches). Return only JSON, no markdown, no explanation. If nothing matches, return an empty array [].`,
      messages: [{
        role: 'user',
        content: `Query: "${query}"\n\nDocuments:\n${JSON.stringify(docs.map(d => ({ title: d.title, path: d.path, space: d.space, spaceLabel: d.spaceLabel, preview: d.text.slice(0, 500) })))}`,
      }],
    }),
  });

  const data = await response.json();
  const text = data.content?.[0]?.text || '[]';

  try {
    const results = JSON.parse(text);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
