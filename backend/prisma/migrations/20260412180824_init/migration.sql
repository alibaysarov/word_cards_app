/*
  Warnings:

  - You are about to drop the column `word` on the `Sentence` table. All the data in the column will be lost.
  - Added the required column `wordCardId` to the `Sentence` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Sentence" DROP COLUMN "word",
ADD COLUMN     "wordCardId" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "Sentence" ADD CONSTRAINT "Sentence_wordCardId_fkey" FOREIGN KEY ("wordCardId") REFERENCES "WordCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
