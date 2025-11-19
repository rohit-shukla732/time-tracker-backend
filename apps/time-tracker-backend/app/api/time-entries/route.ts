import { NextRequest, NextResponse } from 'next/server';
import { TimeEntry, TimeEntryCreateRequest, ApiResponse } from '@ace-ems/shared';

// In-memory storage for demo purposes
// In production, you'd use a database
let timeEntries: TimeEntry[] = [];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const projectId = searchParams.get('projectId');
  const isRunning = searchParams.get('isRunning');

  let filteredEntries = timeEntries;

  if (userId) {
    filteredEntries = filteredEntries.filter(entry => entry.userId === userId);
  }

  if (projectId) {
    filteredEntries = filteredEntries.filter(entry => entry.projectId === projectId);
  }

  if (isRunning !== null) {
    const running = isRunning === 'true';
    filteredEntries = filteredEntries.filter(entry => entry.isRunning === running);
  }

  const response: ApiResponse<TimeEntry[]> = {
    success: true,
    data: filteredEntries
  };

  return NextResponse.json(response);
}

export async function POST(request: NextRequest) {
  try {
    const body: TimeEntryCreateRequest = await request.json();
    
    // Validate required fields
    if (!body.projectId) {
      return NextResponse.json({
        success: false,
        error: { message: 'Project ID is required' }
      } as ApiResponse, { status: 400 });
    }

    // For demo purposes, we'll use a hardcoded user ID
    const userId = 'user-1';

    const newTimeEntry: TimeEntry = {
      id: `entry-${Date.now()}`,
      userId,
      projectId: body.projectId,
      description: body.description,
      startTime: body.startTime ? new Date(body.startTime) : new Date(),
      isRunning: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    timeEntries.push(newTimeEntry);

    const response: ApiResponse<TimeEntry> = {
      success: true,
      data: newTimeEntry
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: { message: 'Invalid request body' }
    };
    
    return NextResponse.json(response, { status: 400 });
  }
}