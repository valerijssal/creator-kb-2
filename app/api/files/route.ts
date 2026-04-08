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
