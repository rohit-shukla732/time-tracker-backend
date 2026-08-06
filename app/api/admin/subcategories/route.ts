import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";

// POST /api/admin/subcategories - Create a subcategory (Admin only)
export async function POST(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const body = await req.json();
    const name = (body.name || '').toString().trim();
    const categoryId = (body.categoryId || '').toString().trim();

    if (!name) {
      return NextResponse.json({ error: "Subcategory name is required" }, { status: 400 });
    }
    if (!categoryId) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }

    const category = await prisma.ticketCategory.findUnique({ where: { id: categoryId } });
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const subcategory = await prisma.ticketSubcategory.create({
      data: {
        name,
        categoryId,
        active: body.active !== false,
        sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : 0,
      },
    });

    return NextResponse.json(subcategory, { status: 201 });
  } catch (error: any) {
    console.error("Error creating subcategory:", error);
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: "A subcategory with this name already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Failed to create subcategory" }, { status: 500 });
  }
}
