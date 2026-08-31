-- prisma/migrations/20260830100000_contests/migration.sql
-- Contests: entries, public voting, prizes, judges, sponsors and gallery.
--
-- Purely additive. Seven new tables, two new enums and one new nullable column
-- on MediaAsset. No table is dropped, no column removed, no row touched — safe
-- against a live database.

-- CreateEnum
CREATE TYPE "ContestStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContestEntryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SHORTLISTED', 'WINNER');

-- AlterTable
ALTER TABLE "MediaAsset" ADD COLUMN     "durationSeconds" INTEGER;

-- CreateTable
CREATE TABLE "Contest" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT NOT NULL,
    "theme" TEXT,
    "rules" TEXT,
    "prizeSummary" TEXT,
    "coverMediaId" TEXT,
    "status" "ContestStatus" NOT NULL DEFAULT 'DRAFT',
    "startAt" TIMESTAMP(3) NOT NULL,
    "entryDeadline" TIMESTAMP(3) NOT NULL,
    "votingStartAt" TIMESTAMP(3),
    "votingEndAt" TIMESTAMP(3),
    "resultsAt" TIMESTAMP(3),
    "allowImages" BOOLEAN NOT NULL DEFAULT true,
    "allowVideos" BOOLEAN NOT NULL DEFAULT true,
    "maxEntriesPerUser" INTEGER NOT NULL DEFAULT 1,
    "maxImageBytes" INTEGER NOT NULL DEFAULT 2097152,
    "maxVideoSeconds" INTEGER NOT NULL DEFAULT 20,
    "publicVoteWeight" INTEGER NOT NULL DEFAULT 25,
    "shortlistSize" INTEGER NOT NULL DEFAULT 10,
    "featureOnHome" BOOLEAN NOT NULL DEFAULT true,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestPrize" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "value" TEXT,
    "mediaId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ContestPrize_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestJudge" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "bio" TEXT,
    "profileUrl" TEXT,
    "mediaId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ContestJudge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestSponsor" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" TEXT,
    "websiteUrl" TEXT,
    "mediaId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ContestSponsor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestGalleryItem" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ContestGalleryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestEntry" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entrantName" TEXT NOT NULL,
    "entrantEmail" TEXT NOT NULL,
    "entrantPhone" TEXT NOT NULL,
    "socialUrl" TEXT,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "status" "ContestEntryStatus" NOT NULL DEFAULT 'PENDING',
    "judgeScore" INTEGER,
    "rank" INTEGER,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "moderationNote" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "moderatedById" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContestEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestVote" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContestVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contest_slug_key" ON "Contest"("slug");

-- CreateIndex
CREATE INDEX "Contest_status_idx" ON "Contest"("status");

-- CreateIndex
CREATE INDEX "Contest_status_entryDeadline_idx" ON "Contest"("status", "entryDeadline");

-- CreateIndex
CREATE INDEX "Contest_startAt_idx" ON "Contest"("startAt");

-- CreateIndex
CREATE INDEX "ContestPrize_contestId_position_idx" ON "ContestPrize"("contestId", "position");

-- CreateIndex
CREATE INDEX "ContestJudge_contestId_sortOrder_idx" ON "ContestJudge"("contestId", "sortOrder");

-- CreateIndex
CREATE INDEX "ContestSponsor_contestId_sortOrder_idx" ON "ContestSponsor"("contestId", "sortOrder");

-- CreateIndex
CREATE INDEX "ContestGalleryItem_contestId_sortOrder_idx" ON "ContestGalleryItem"("contestId", "sortOrder");

-- CreateIndex
CREATE INDEX "ContestEntry_contestId_status_idx" ON "ContestEntry"("contestId", "status");

-- CreateIndex
CREATE INDEX "ContestEntry_contestId_voteCount_idx" ON "ContestEntry"("contestId", "voteCount");

-- CreateIndex
CREATE INDEX "ContestEntry_contestId_rank_idx" ON "ContestEntry"("contestId", "rank");

-- CreateIndex
CREATE INDEX "ContestEntry_userId_idx" ON "ContestEntry"("userId");

-- CreateIndex
CREATE INDEX "ContestVote_entryId_idx" ON "ContestVote"("entryId");

-- CreateIndex
CREATE UNIQUE INDEX "ContestVote_contestId_userId_key" ON "ContestVote"("contestId", "userId");

-- AddForeignKey
ALTER TABLE "Contest" ADD CONSTRAINT "Contest_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestPrize" ADD CONSTRAINT "ContestPrize_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestPrize" ADD CONSTRAINT "ContestPrize_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestJudge" ADD CONSTRAINT "ContestJudge_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestJudge" ADD CONSTRAINT "ContestJudge_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestSponsor" ADD CONSTRAINT "ContestSponsor_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestSponsor" ADD CONSTRAINT "ContestSponsor_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestGalleryItem" ADD CONSTRAINT "ContestGalleryItem_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestGalleryItem" ADD CONSTRAINT "ContestGalleryItem_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestEntry" ADD CONSTRAINT "ContestEntry_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestEntry" ADD CONSTRAINT "ContestEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestEntry" ADD CONSTRAINT "ContestEntry_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestEntry" ADD CONSTRAINT "ContestEntry_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestVote" ADD CONSTRAINT "ContestVote_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestVote" ADD CONSTRAINT "ContestVote_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ContestEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestVote" ADD CONSTRAINT "ContestVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Trigram search indexes for the new tables.
--
-- Same defensive pattern as the earlier migrations: a host that will not allow
-- the pg_trgm extension gets a notice and a successful deploy rather than a
-- failure. Contest search then falls back to a sequential scan, which is fine
-- at the size a single contest reaches.
-- ---------------------------------------------------------------------------
DO $trgm$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_trgm could not be installed (%). Continuing without contest search indexes.', SQLERRM;
  END;

  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    RAISE NOTICE 'pg_trgm is not available — contest search indexes skipped.';
    RETURN;
  END IF;

  EXECUTE 'CREATE INDEX IF NOT EXISTS "idx_trgm_contest_title" ON "Contest" USING GIN ("title" gin_trgm_ops)';
  EXECUTE 'CREATE INDEX IF NOT EXISTS "idx_trgm_contestentry_name" ON "ContestEntry" USING GIN ("entrantName" gin_trgm_ops)';
  EXECUTE 'CREATE INDEX IF NOT EXISTS "idx_trgm_contestentry_email" ON "ContestEntry" USING GIN ("entrantEmail" gin_trgm_ops)';
END
$trgm$;
