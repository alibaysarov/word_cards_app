-- CreateTable
CREATE TABLE "WordCard" (
    "id" UUID NOT NULL,
    "frontText" TEXT NOT NULL,
    "RearText" TEXT NOT NULL,
    "collectionId" UUID NOT NULL,

    CONSTRAINT "WordCard_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WordCard" ADD CONSTRAINT "WordCard_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
