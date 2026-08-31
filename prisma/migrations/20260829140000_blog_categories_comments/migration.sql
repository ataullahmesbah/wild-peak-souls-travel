-- Blog: categories, authors, view counts and reader comments.
--
-- Purely additive. No table is dropped, no column removed, no row touched —
-- existing posts keep their content and simply gain empty category/author
-- columns. Safe to run against a live database.

-- CreateEnum
CREATE TYPE "CommentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "authorId" TEXT,
ADD COLUMN     "authorName" TEXT,
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "commentsOpen" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "views" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PostCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT,
    "parentId" TEXT,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "CommentStatus" NOT NULL DEFAULT 'PENDING',
    "ipHash" TEXT,
    "moderationNote" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "moderatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PostCategory_name_key" ON "PostCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PostCategory_slug_key" ON "PostCategory"("slug");

-- CreateIndex
CREATE INDEX "PostCategory_status_idx" ON "PostCategory"("status");

-- CreateIndex
CREATE INDEX "PostCategory_position_idx" ON "PostCategory"("position");

-- CreateIndex
CREATE INDEX "PostComment_postId_status_idx" ON "PostComment"("postId", "status");

-- CreateIndex
CREATE INDEX "PostComment_status_createdAt_idx" ON "PostComment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PostComment_parentId_idx" ON "PostComment"("parentId");

-- CreateIndex
CREATE INDEX "Post_categoryId_idx" ON "Post"("categoryId");

-- CreateIndex
CREATE INDEX "Post_featured_idx" ON "Post"("featured");

-- CreateIndex
CREATE INDEX "Post_views_idx" ON "Post"("views");

-- CreateIndex
CREATE INDEX "Post_status_publishedAt_idx" ON "Post"("status", "publishedAt");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PostCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "PostComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Trigram search indexes for the new tables.
--
-- Same defensive pattern as 20260829120000_search_trigram_indexes: if the host
-- does not allow the pg_trgm extension, log a notice and skip rather than
-- failing the deploy. The blog works either way; only "contains" searches over
-- these columns fall back to a sequential scan.
-- ---------------------------------------------------------------------------
DO $trgm$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_trgm could not be installed (%). Continuing without blog search indexes.', SQLERRM;
  END;

  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    RAISE NOTICE 'pg_trgm is not available — blog search indexes skipped.';
    RETURN;
  END IF;

  EXECUTE 'CREATE INDEX IF NOT EXISTS "idx_trgm_postcategory_name" ON "PostCategory" USING GIN ("name" gin_trgm_ops)';
  EXECUTE 'CREATE INDEX IF NOT EXISTS "idx_trgm_postcomment_authorname" ON "PostComment" USING GIN ("authorName" gin_trgm_ops)';
  EXECUTE 'CREATE INDEX IF NOT EXISTS "idx_trgm_postcomment_authoremail" ON "PostComment" USING GIN ("authorEmail" gin_trgm_ops)';
  EXECUTE 'CREATE INDEX IF NOT EXISTS "idx_trgm_postcomment_body" ON "PostComment" USING GIN ("body" gin_trgm_ops)';
  EXECUTE 'CREATE INDEX IF NOT EXISTS "idx_trgm_post_title" ON "Post" USING GIN ("title" gin_trgm_ops)';
  EXECUTE 'CREATE INDEX IF NOT EXISTS "idx_trgm_post_excerpt" ON "Post" USING GIN ("excerpt" gin_trgm_ops)';
END
$trgm$;
