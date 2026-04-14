import { NextRequest, NextResponse } from 'next/server';
import { getAppFileContent, updateAppFileContent } from '@/lib/github';

function getSessionLevel(request: NextRequest): string {
  const password = request.cookies.get('kb_session')?.value ?? '';
  if (password === process.env.PASS_ADMIN) return 'admin';
  return 'other';
}

export async function GET() {
  const file = await getAppFileContent('public/order.json');
  if (!file) return NextResponse.json({});
  return NextResponse.json(JSON.parse(file.content));
}

export async function POST(request: NextRequest) {
  if (getSessionLevel(request) !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const { space, parentKey, orderedFiles } = await request.json();
  if (!space || !Array.isArray(orderedFiles)) {
    return NextResponse.json({ error: 'Missing space or orderedFiles' }, { status: 400 });
  }
  const file = await getAppFileContent('public/order.json');
  if (!file) {
    return NextResponse.json({ error: 'Could not read order.json' }, { status: 500 });
  }
  const order = JSON.parse(file.content);
  if (!order[space]) order[space] = {};
  const key = parentKey || '__root__';
  order[space][key] = orderedFiles;
  const success = await updateAppFileContent(
    'public/order.json',
    JSON.stringify(order, null, 2),
    file.sha,
    'Update order for ' + space + '/' + key
  );
  if (!success) {
    return NextResponse.json({ error: 'Failed to save order' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
