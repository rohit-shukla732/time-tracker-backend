-- CreateTable
CREATE TABLE "leave_settings" (
    "id" TEXT NOT NULL,
    "monthlySickLeave" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlyCasualLeave" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlyAnnualLeave" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "allowMonthlyRollover" BOOLEAN NOT NULL DEFAULT false,
    "allowYearlyRollover" BOOLEAN NOT NULL DEFAULT false,
    "maxMonthlyRollover" DOUBLE PRECISION,
    "maxYearlyRollover" DOUBLE PRECISION,
    "annualSickLeave" DOUBLE PRECISION NOT NULL DEFAULT 12,
    "annualCasualLeave" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "annualAnnualLeave" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "annualMaternityLeave" DOUBLE PRECISION NOT NULL DEFAULT 180,
    "annualPaternityLeave" DOUBLE PRECISION NOT NULL DEFAULT 7,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_settings_pkey" PRIMARY KEY ("id")
);
