/*
  Warnings:

  - You are about to drop the column `adminEmail` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `adminName` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `Company` table. All the data in the column will be lost.
  - The `permissions` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `updatedAt` to the `Company` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."Plan" AS ENUM ('BASIC', 'PRO', 'PLATINUM');

-- DropForeignKey
ALTER TABLE "public"."User" DROP CONSTRAINT "User_companyId_fkey";

-- DropIndex
DROP INDEX "public"."Company_adminEmail_key";

-- AlterTable
ALTER TABLE "public"."Company" DROP COLUMN "adminEmail",
DROP COLUMN "adminName",
DROP COLUMN "isActive",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "plan" "public"."Plan" NOT NULL DEFAULT 'BASIC',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "companyId" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'ACTIVE',
DROP COLUMN "permissions",
ADD COLUMN     "permissions" JSONB;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
