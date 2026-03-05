import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join, basename } from 'path';

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name');

  // Reject empty or path-traversal attempts
  if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }

  // Only the bare filename — keeps it locked to the downloads folder
  const safe = basename(name);
  const filePath = join(process.cwd(), 'public', 'downloads', safe);

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const buffer = readFileSync(filePath);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${safe}"`,
      'Content-Length': String(buffer.length),
    },
  });
}
