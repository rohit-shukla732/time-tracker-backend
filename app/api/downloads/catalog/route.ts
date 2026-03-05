import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const filePath = join(process.cwd(), 'public', 'downloads', 'catalog.json');
    const data = readFileSync(filePath, 'utf-8');
    const catalog = JSON.parse(data);
    return NextResponse.json(catalog);
  } catch {
    return NextResponse.json({ error: 'Catalog not found' }, { status: 404 });
  }
}
 