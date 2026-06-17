/*
  Warnings:

  - A unique constraint covering the columns `[installationID]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "installationID" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_installationID_key" ON "User"("installationID");
