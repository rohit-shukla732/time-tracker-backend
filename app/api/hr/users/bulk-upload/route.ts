import { NextRequest, NextResponse } from "next/server";
import { requireHR, unauthorizedResponse } from "@/lib/roleAuth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/hash";
import * as XLSX from 'xlsx';
import type { Role } from "@prisma/client";

const MANAGER_ROLES: Role[] = ["ADMIN", "SENIOR_MANAGER", "MANAGER", "HR"];
const VALID_ROLES: Role[] = ["ADMIN", "SENIOR_MANAGER", "MANAGER", "HR", "EMPLOYEE"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ExcelRow {
  empCode?: unknown;
  employeeCode?: unknown;
  emp_code?: unknown;
  code?: unknown;
  name?: unknown;
  email?: unknown;
  role?: unknown;
  managerCode?: unknown;
  manager_code?: unknown;
  manager?: unknown;
  shiftGroup?: unknown;
  shift_group?: unknown;
  password?: unknown;
  probation?: unknown;
  isProbation?: unknown;
  onProbation?: unknown;
}

function readCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function toBool(value: unknown): boolean {
  const v = readCell(value).toLowerCase();
  return ["yes", "y", "true", "1", "probation", "on"].includes(v);
}

// POST /api/hr/users/bulk-upload - Bulk create and/or update employees from Excel (HR/ADMIN)
// Form fields: file (required), mode ("create" | "update" | "upsert", default "create")
// Columns: empCode (required in update/upsert; optional in create, auto ACE###),
//          name, email, role, managerCode, shiftGroup, password, probation
// Update mode only touches columns present in the Excel header; empty managerCode/shiftGroup
// clears the value, empty name/email/role/password/probation are skipped.
export async function POST(req: NextRequest) {
  const authResult = await requireHR(req);
  if (authResult.error || !authResult.user) {
    return unauthorizedResponse(authResult.error);
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const mode = String(formData.get("mode") || "create").trim() as "create" | "update" | "upsert";

    if (!["create", "update", "upsert"].includes(mode)) {
      return NextResponse.json({ error: "Invalid mode (use create, update or upsert)" }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const workbook = XLSX.read(buffer, { type: "buffer" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
    const headerRow = (XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][])[0] || [];
    const headerCols = new Set(headerRow.map((h) => String(h).trim().toLowerCase()));

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Excel file is empty" }, { status: 400 });
    }

    const hasCol = (...aliases: string[]) =>
      aliases.some((a) => headerCols.has(a.trim().toLowerCase()));

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; empCode: string; error: string }>,
    };

    const existingIds = new Set(
      (await prisma.user.findMany({ select: { id: true } })).map((u) => u.id)
    );
    let maxNum = Array.from(existingIds)
      .map((id) => id.match(/^ACE(\d+)$/i)?.[1])
      .filter(Boolean)
      .map((n) => parseInt(n!, 10))
      .reduce((a, b) => Math.max(a, b), 0);

    const nextAutoId = (): string => {
      let n = maxNum + 1;
      while (existingIds.has(`ACE${String(n).padStart(3, "0")}`)) {
        n++;
      }
      maxNum = n;
      const id = `ACE${String(n).padStart(3, "0")}`;
      existingIds.add(id);
      return id;
    };

    const managerCache = new Map<string, string | null>();
    const resolveManager = async (code: string): Promise<string | null | undefined> => {
      const normalized = code.toUpperCase();
      if (managerCache.has(normalized)) return managerCache.get(normalized);
      const manager = await prisma.user.findFirst({
        where: { id: normalized, role: { in: MANAGER_ROLES }, isArchived: false },
        select: { id: true },
      });
      managerCache.set(normalized, manager?.id ?? null);
      return managerCache.get(normalized);
    };

    const shiftGroupCache = new Map<string, string | null>();
    const resolveShiftGroup = async (name: string): Promise<string | null | undefined> => {
      const normalized = name.trim();
      if (shiftGroupCache.has(normalized)) return shiftGroupCache.get(normalized);
      const group = await prisma.shiftGroup.findUnique({
        where: { name: normalized },
        select: { id: true },
      });
      shiftGroupCache.set(normalized, group?.id ?? null);
      return shiftGroupCache.get(normalized);
    };

    const fail = (rowNumber: number, empCode: string, error: string) => {
      results.failed++;
      results.errors.push({ row: rowNumber, empCode: empCode || "N/A", error });
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2;

      const empCode = (
        row.empCode || row.employeeCode || row.emp_code || row.code || ""
      ).toString().trim().toUpperCase();
      const name = readCell(row.name);
      const email = readCell(row.email).toLowerCase();
      const roleRaw = readCell(row.role).toUpperCase();
      const password = readCell(row.password);

      const existingUser = empCode
        ? await prisma.user.findUnique({ where: { id: empCode }, select: { id: true } })
        : null;

      // ---- UPDATE branch ----
      if (existingUser) {
        if (mode === "create") {
          fail(rowNumber, empCode, "Employee code already exists");
          continue;
        }

        try {
          const updateData: any = {};

          if (hasCol("name")) {
            const v = readCell(row.name);
            if (v) updateData.name = v;
          }

          if (hasCol("email")) {
            const v = readCell(row.email).toLowerCase();
            if (v) {
              if (!EMAIL_REGEX.test(v)) {
                fail(rowNumber, empCode, "Invalid email format");
                continue;
              }
              const taken = await prisma.user.findFirst({
                where: { email: v, id: { not: empCode } },
                select: { id: true },
              });
              if (taken) {
                fail(rowNumber, empCode, "Email already exists");
                continue;
              }
              updateData.email = v;
            }
          }

          if (hasCol("role")) {
            const v = readCell(row.role).toUpperCase();
            if (v) {
              if (!VALID_ROLES.includes(v as Role)) {
                fail(rowNumber, empCode, `Invalid role "${v}" (use ${VALID_ROLES.join(", ")})`);
                continue;
              }
              updateData.role = v;
            }
          }

          if (hasCol("managerCode", "manager_code", "manager")) {
            const v = readCell(row.managerCode ?? row.manager_code ?? row.manager);
            if (v) {
              const managerId = (await resolveManager(v)) ?? null;
              if (!managerId) {
                fail(rowNumber, empCode, `Manager "${v}" not found or is not a manager`);
                continue;
              }
              updateData.managerId = managerId;
            } else {
              updateData.managerId = null;
            }
          }

          if (hasCol("shiftGroup", "shift_group")) {
            const v = readCell(row.shiftGroup ?? row.shift_group);
            if (v) {
              const shiftGroupId = (await resolveShiftGroup(v)) ?? null;
              if (!shiftGroupId) {
                fail(rowNumber, empCode, `Shift group "${v}" not found`);
                continue;
              }
              updateData.shiftGroupId = shiftGroupId;
            } else {
              updateData.shiftGroupId = null;
            }
          }

          if (hasCol("probation", "isprobation", "onprobation")) {
            const raw = row.probation ?? row.isProbation ?? row.onProbation;
            if (readCell(raw) !== "") updateData.isProbation = toBool(raw);
          }

          if (hasCol("password")) {
            const v = readCell(row.password);
            if (v) updateData.passwordHash = await hashPassword(v);
          }

          if (Object.keys(updateData).length === 0) {
            fail(rowNumber, empCode, "No updatable columns in file");
            continue;
          }

          await prisma.user.update({ where: { id: empCode }, data: updateData });
          results.success++;
        } catch (error: any) {
          fail(rowNumber, empCode, error?.message || "Failed to update user");
        }
        continue;
      }

      // ---- CREATE branch ----
      if (mode === "update") {
        fail(rowNumber, empCode || "N/A", "Employee not found");
        continue;
      }

      if (!name) {
        fail(rowNumber, empCode || "N/A", "Name is required");
        continue;
      }

      if (!email) {
        fail(rowNumber, empCode || "N/A", "Email is required");
        continue;
      }

      if (!EMAIL_REGEX.test(email)) {
        fail(rowNumber, empCode || "N/A", "Invalid email format");
        continue;
      }

      if (roleRaw && !VALID_ROLES.includes(roleRaw as Role)) {
        fail(rowNumber, empCode || "N/A", `Invalid role "${roleRaw}" (use ${VALID_ROLES.join(", ")})`);
        continue;
      }

      try {
        const emailTaken = await prisma.user.findFirst({ where: { email }, select: { id: true } });
        if (emailTaken) {
          fail(rowNumber, empCode || "N/A", "Email already exists");
          continue;
        }

        let userId = empCode;
        if (userId && existingIds.has(userId)) {
          fail(rowNumber, empCode, "Employee code already exists");
          continue;
        }
        if (!userId) {
          userId = nextAutoId();
        } else {
          existingIds.add(userId);
        }

        const managerCodeRaw = (row.managerCode || row.manager_code || row.manager || "").toString().trim();
        let managerId: string | null = null;
        if (managerCodeRaw) {
          managerId = (await resolveManager(managerCodeRaw)) ?? null;
          if (!managerId) {
            fail(rowNumber, userId, `Manager "${managerCodeRaw}" not found or is not a manager`);
            existingIds.delete(userId);
            continue;
          }
        }

        const shiftGroupRaw = (row.shiftGroup || row.shift_group || "").toString().trim();
        let shiftGroupId: string | null = null;
        if (shiftGroupRaw) {
          shiftGroupId = (await resolveShiftGroup(shiftGroupRaw)) ?? null;
          if (!shiftGroupId) {
            fail(rowNumber, userId, `Shift group "${shiftGroupRaw}" not found`);
            existingIds.delete(userId);
            continue;
          }
        }

        const passwordHash = await hashPassword(password || userId);

        await prisma.user.create({
          data: {
            id: userId,
            name,
            email,
            role: (roleRaw || "EMPLOYEE") as Role,
            managerId,
            shiftGroupId,
            isProbation: toBool(row.probation ?? row.isProbation ?? row.onProbation),
            passwordHash,
          },
        });

        results.success++;
      } catch (error: any) {
        fail(rowNumber, empCode || "N/A", error?.message || "Failed to create user");
      }
    }

    const modeLabel = mode === "update" ? "updated" : mode === "upsert" ? "created/updated" : "created";
    return NextResponse.json({
      success: true,
      message: `Processed ${data.length} rows: ${results.success} ${modeLabel}, ${results.failed} failed`,
      results,
    });
  } catch (error: any) {
    console.error("Error processing HR bulk upload:", error);
    return NextResponse.json({ error: error?.message || "Failed to process upload" }, { status: 500 });
  }
}
