import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: authResult.error || "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    
    // Employee should also be able to see it, perhaps with a specific project filter, but let's just make it general.
    const events = await prisma.projectCalendarEvent.findMany({
      where: { clientProjectId: id },
      orderBy: { date: 'asc' }
    });

    return NextResponse.json({ success: true, events });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.user || authResult.user.role === "EMPLOYEE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { date, type, description } = body;

    if (!date || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const projectCount = await prisma.clientProject.count({ where: { id } });
    if (projectCount === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const event = await prisma.projectCalendarEvent.create({
      data: {
        clientProjectId: id,
        date: new Date(date),
        type,
        description
      }
    });

    return NextResponse.json({ success: true, event });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
