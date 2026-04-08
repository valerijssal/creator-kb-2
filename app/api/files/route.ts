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
    const files = await getSpaceFiles(space);
    return NextResponse.json(files);
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
