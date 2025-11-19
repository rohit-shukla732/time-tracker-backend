import { NextRequest, NextResponse } from 'next/server';

interface LogRequest {
  message: string;
  level?: 'info' | 'warn' | 'error' | 'debug';
  timestamp?: string;
  source?: string;
}

interface LogResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: LogRequest = await request.json();
    
    // Validate required fields
    if (!body.message) {
      const response: LogResponse = {
        success: false,
        error: 'Message is required'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Set defaults
    const level = body.level || 'info';
    const timestamp = body.timestamp || new Date().toISOString();
    const source = body.source || 'API';

    // Format the log message
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] [${source}] ${body.message}`;

    // Log to console based on level
    switch (level) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'debug':
        console.debug(logMessage);
        break;
      case 'info':
      default:
        console.log(logMessage);
        break;
    }

    const response: LogResponse = {
      success: true,
      message: 'Log message recorded successfully'
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error processing log request:', error);
    
    const response: LogResponse = {
      success: false,
      error: 'Invalid request body'
    };
    
    return NextResponse.json(response, { status: 400 });
  }
}

export async function GET() {
  const response: LogResponse = {
    success: true,
    message: 'Logging API is running. Use POST to send log messages.'
  };

  return NextResponse.json(response);
}