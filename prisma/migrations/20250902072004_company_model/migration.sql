/*
  Warnings:

  - You are about to drop the column `name` on the `Company` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[adminEmail]` on the table `Company` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `adminEmail` to the `Company` table without a default value. This is not possible if the table is not empty.
  - Added the required column `adminName` to the `Company` table without a default value. This is not possible if the table is not empty.
  - Added the required column `adminPassword` to the `Company` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyName` to the `Company` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Company" DROP COLUMN "name",
ADD COLUMN     "adminEmail" TEXT NOT NULL,
ADD COLUMN     "adminName" TEXT NOT NULL,
ADD COLUMN     "adminPassword" TEXT NOT NULL,
ADD COLUMN     "companyName" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Company_adminEmail_key" ON "public"."Company"("adminEmail");
