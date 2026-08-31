-- CreateEnum
CREATE TYPE "AdFrequencyWindow" AS ENUM ('SESSION', 'DAY', 'WEEK', 'EVER');

-- AlterTable
ALTER TABLE "Advertisement" ADD COLUMN     "frequencyWindow" "AdFrequencyWindow" NOT NULL DEFAULT 'SESSION';

-- CreateTable
CREATE TABLE "HeroSlide" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "body" TEXT,
    "mediaId" TEXT,
    "overlayOpacity" INTEGER NOT NULL DEFAULT 40,
    "textAlign" TEXT NOT NULL DEFAULT 'center',
    "primaryCtaText" TEXT,
    "primaryCtaUrl" TEXT,
    "secondaryCtaText" TEXT,
    "secondaryCtaUrl" TEXT,
    "showSearch" BOOLEAN NOT NULL DEFAULT true,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeroSlide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardPage" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DashboardPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePageAccess" (
    "roleId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RolePageAccess_pkey" PRIMARY KEY ("roleId","pageId")
);

-- CreateIndex
CREATE INDEX "HeroSlide_active_sortOrder_idx" ON "HeroSlide"("active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardPage_key_key" ON "DashboardPage"("key");

-- CreateIndex
CREATE INDEX "DashboardPage_group_idx" ON "DashboardPage"("group");

-- CreateIndex
CREATE INDEX "RolePageAccess_pageId_idx" ON "RolePageAccess"("pageId");

-- AddForeignKey
ALTER TABLE "HeroSlide" ADD CONSTRAINT "HeroSlide_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePageAccess" ADD CONSTRAINT "RolePageAccess_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePageAccess" ADD CONSTRAINT "RolePageAccess_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "DashboardPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
