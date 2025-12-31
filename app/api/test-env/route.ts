import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    AZURE_TENANT_ID: process.env.AZURE_TENANT_ID ? 'Exists' : 'Not found',
    AZURE_CLIENT_ID: process.env.AZURE_CLIENT_ID ? 'Exists' : 'Not found',
    AZURE_CLIENT_SECRET: process.env.AZURE_CLIENT_SECRET ? 'Exists' : 'Not found',
    HELPDESK_EMAIL: process.env.HELPDESK_EMAIL ? 'Exists' : 'Not found',
    DATABASE_URL: process.env.DATABASE_URL ? 'Exists' : 'Not found',
  });
}
