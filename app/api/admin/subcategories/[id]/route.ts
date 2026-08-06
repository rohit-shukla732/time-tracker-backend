import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";

// PATCH /api/admin/subcategories/[id] - Update a subcategory (Admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  const { id } = await params;

  try {
    const data = await req.json();
    const updateData: any = {};

    if (typeof data.name === 'string' && data.name.trim()) {
      updateData.name = data.name.trim();
    }
    if (typeof data.active === 'boolean') {
      updateData.active = data.active;
    }
    if (typeof data.sortOrder === 'number') {
      updateData.sortOrder = data.sortOrder;
    }
    if (typeof data.categoryId === 'string' && data.categoryId.trim()) {
      const category = await prisma.ticketCategory.findUnique({
        where: { id: data.categoryId },
      });
      if (!category) {
        return NextResponse.json({ error: "Category not found" }, { status: 404 });
      }
      updateData.categoryId = data.categoryId;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const subcategory = await prisma.ticketSubcategory.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(subcategory);
  } catch (error: any) {
    console.error("Error updating subcategory:", error);
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: "A subcategory with this name already exists" },
        { status: 409 }
      );
    }
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: "Subcategory not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update subcategory" }, { status: 500 });
  }
}

// DELETE /api/admin/subcategories/[id] - Delete a subcategory (Admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  const { id } = await params;

  try {
    // Unlink tickets from this subcategory first (FK is ON DELETE SET NULL)
    await prisma.ticket.updateMany({
      where: { subcategoryId: id },
      data: { subcategoryId: null },
    });

    await prisma.ticketSubcategory.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Subcategory deleted" });
  } catch (error: any) {
    console.error("Error deleting subcategory:", error);
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: "Subcategory not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete subcategory" }, { status: 500 });
  }
}
