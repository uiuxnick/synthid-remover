-- AlterTable
ALTER TABLE "ImageJob" ADD COLUMN     "durationMs" INTEGER,
ADD COLUMN     "mediaType" TEXT NOT NULL DEFAULT 'image';
