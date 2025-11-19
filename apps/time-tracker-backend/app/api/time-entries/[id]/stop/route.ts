import { NextRequest, NextResponse } from 'next/server';
import { TimeEntry, TimeEntryStopRequest, ApiResponse } from '@ace-ems/shared';
import { calculateDuration } from '@ace-ems/shared';

// This would come from the main route file in production
// For now, we'll simulate it
let timeEntries: TimeEntry[] = [];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body: TimeEntryStopRequest = await request.json();

    const entryIndex = timeEntries.findIndex(entry => entry.id === id);
    
    if (entryIndex === -1) {
      return NextResponse.json({
        success: false,
        error: { message: 'Time entry not found' }
      } as ApiResponse, { status: 404 });
    }

    const entry = timeEntries[entryIndex];

    if (!entry.isRunning) {
      return NextResponse.json({
        success: false,
        error: { message: 'Time entry is not currently running' }
      } as ApiResponse, { status: 400 });
    }

    const endTime = body.endTime ? new Date(body.endTime) : new Date();
    const duration = calculateDuration(entry.startTime, endTime);

    const updatedEntry: TimeEntry = {
      ...entry,
      endTime,
      duration,
      isRunning: false,
      updatedAt: new Date()
    };

    timeEntries[entryIndex] = updatedEntry;

    const response: ApiResponse<TimeEntry> = {
      success: true,
      data: updatedEntry
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: { message: 'Invalid request body' }
    };
    
    return NextResponse.json(response, { status: 400 });
  }
}