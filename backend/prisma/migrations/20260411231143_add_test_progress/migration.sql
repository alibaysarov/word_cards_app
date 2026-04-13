-- AlterTable
ALTER TABLE "Collection" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "CollectionTest" (
    "id" UUID NOT NULL,
    "collectionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CollectionTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionTestAnswer" (
    "id" UUID NOT NULL,
    "testId" UUID NOT NULL,
    "wordCardId" UUID NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionTestAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CollectionTest_collectionId_userId_idx" ON "CollectionTest"("collectionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionTestAnswer_testId_wordCardId_key" ON "CollectionTestAnswer"("testId", "wordCardId");

-- AddForeignKey
ALTER TABLE "CollectionTest" ADD CONSTRAINT "CollectionTest_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionTest" ADD CONSTRAINT "CollectionTest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionTestAnswer" ADD CONSTRAINT "CollectionTestAnswer_testId_fkey" FOREIGN KEY ("testId") REFERENCES "CollectionTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionTestAnswer" ADD CONSTRAINT "CollectionTestAnswer_wordCardId_fkey" FOREIGN KEY ("wordCardId") REFERENCES "WordCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
