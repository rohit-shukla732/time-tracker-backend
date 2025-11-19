import { NextRequest, NextResponse } from 'next/server';
import { Project, ApiResponse } from '@ace-ems/shared';

// In-memory storage for demo purposes
let projects: Project[] = [
  {
    id: 'proj-1',
    name: 'ACE EMS Development',
    description: 'Building the Enterprise Management System',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'proj-2',
    name: 'Client Portal',
    description: 'Customer-facing web portal',
    clientId: 'client-1',
    isActive: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  }
];

export async function GET() {
  const response: ApiResponse<Project[]> = {
    success: true,
    data: projects.filter(p => p.isActive)
  };

  return NextResponse.json(response);
}

export async function POST(request: NextRequest) {
  try {
    const body: Partial<Project> = await request.json();
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json({
        success: false,
        error: { message: 'Project name is required' }
      } as ApiResponse, { status: 400 });
    }

    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name: body.name,
      description: body.description,
      clientId: body.clientId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    projects.push(newProject);

    const response: ApiResponse<Project> = {
      success: true,
      data: newProject
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