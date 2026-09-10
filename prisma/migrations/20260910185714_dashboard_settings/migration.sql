-- AlterTable
ALTER TABLE "ComplexSetting" ADD COLUMN     "dashboardDescription" TEXT NOT NULL DEFAULT 'Una vista clara del estado de tu conjunto residencial.',
ADD COLUMN     "dashboardImageUrl" TEXT,
ADD COLUMN     "dashboardShowActivity" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "dashboardShowMetrics" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "dashboardShowQuickLinks" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "dashboardTitle" TEXT NOT NULL DEFAULT 'Centro de operaciones';
