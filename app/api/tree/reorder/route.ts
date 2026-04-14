import { NextRequest, NextResponse } from 'next/server';
import { getAppFileContent, updateAppFileContent } from '@/lib/github';

function getSessionLevel(request: NextRequest): string {
  const password = request.cookies.get('kb_session')?.value ?? '';
  if (password === process.env.PASS_ADMIN) return 'admin';
  return 'other';
}

export async function POST(request: NextRequest) {
  if (getSessionLevel(request) !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { space, file, newParent } = await request.json();

  if (!space || !file) {
    return NextResponse.json({ error: 'Missing space or file' }, { status: 400 });
  }

  if (file === newParent) {
    return NextResponse.json({ error: 'Cannot set a node as its own parent' }, { status: 400 });
  }

  const treeFile = await getAppFileContent('public/tree.json');
  if (!treeFile) {
    return NextResponse.json({ error: 'Could not read tree.json' }, { status: 500 });
  }

  const tree = JSON.parse(treeFile.content);
  const spaceTree = tree[space];
  if (!spaceTree || !spaceTree[file]) {
    return NextResponse.json({ error: 'Node not found in space' }, { status: 404 });
  }

  if (newParent) {
    let current = newParent;
    while (current && spaceTree[current]) {
      if (current === file) {
        return NextResponse.json({ error: 'Circular reference: target is a descendant of the moved node' }, { status: 400 });
      }
      current = spaceTree[current].parent;
    }
  }

  spaceTree[file].parent = newParent || null;
  tree[space] = spaceTree;

  const success = await updateAppFileContent(
    'public/tree.json',
    JSON.stringify(tree, null, 2),
    treeFile.sha,
    `Move ${file} to ${newParent || 'root'} in ${space}`
  );

  if (!success) {
    return NextResponse.json({ error: 'Failed to update tree.json' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
