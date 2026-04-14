import { NextRequest, NextResponse } from 'next/server';
import { getSpaceFiles, getFileContent, updateFileContent, deleteFile, moveFile, SPACES } from '@/lib/github';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const space = searchParams.get('space');
  const path = searchParams.get('path');

  if (path) {
    const file = await getFileContent(path);
    if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(file);
  }

  if (space) {
    try {
      const files = await getSpaceFiles(space);
      return NextResponse.json(files);
    } catch (err) {
      console.error('getSpaceFiles error:', err);
      return NextResponse.json({ error: String(err) }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Missing params' }, { status: 400 });
}

export async function PUT(request: NextRequest) {
  const { path, content, sha } = await request.json();
  const success = await updateFileContent(path, content, sha, `Update ${path}`);
  if (!success) return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { path, sha } = await request.json();
  const success = await deleteFile(path, sha);
  if (!success) return NextResponse.json({ error: 'Delete failed' }, { status: 500 });

  // Remove from titles.json
  const fileName = path.split('/').pop() ?? '';
  try {
    const titlesData = await octokit.repos.getContent({ owner, repo: appRepo, path: 'public/titles.json' });
    if ('content' in titlesData.data) {
      const titles = JSON.parse(Buffer.from(titlesData.data.content, 'base64').toString('utf-8'));
      if (titles[fileName]) {
        delete titles[fileName];
        await octokit.repos.createOrUpdateFileContents({
          owner, repo: appRepo, path: 'public/titles.json',
          message: `Remove ${fileName} from titles`,
          content: Buffer.from(JSON.stringify(titles, null, 2)).toString('base64'),
          sha: titlesData.data.sha,
        });
      }
    }
  } catch {}

  // Remove from tree.json
  try {
    const treeData = await octokit.repos.getContent({ owner, repo: appRepo, path: 'public/tree.json' });
    if ('content' in treeData.data) {
      const tree = JSON.parse(Buffer.from(treeData.data.content, 'base64').toString('utf-8'));
      let changed = false;
      for (const space of Object.keys(tree)) {
        if (tree[space][fileName]) {
          delete tree[space][fileName];
          changed = true;
        }
      }
      if (changed) {
        await octokit.repos.createOrUpdateFileContents({
          owner, repo: appRepo, path: 'public/tree.json',
          message: `Remove ${fileName} from tree`,
          content: Buffer.from(JSON.stringify(tree, null, 2)).toString('base64'),
          sha: treeData.data.sha,
        });
      }
    }
  } catch {}

  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest) {
  const { oldPath, newSpaceSlug, sha, fileName } = await request.json();
  const newFolder = SPACES[newSpaceSlug];
  if (!newFolder) return NextResponse.json({ error: 'Invalid space' }, { status: 400 });
  const newPath = `${newFolder}/${fileName}`;
  const success = await moveFile(oldPath, newPath, sha);
  if (!success) return NextResponse.json({ error: 'Move failed' }, { status: 500 });
  return NextResponse.json({ success: true });
}
