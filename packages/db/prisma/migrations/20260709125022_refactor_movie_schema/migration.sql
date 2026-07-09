/*
  Warnings:

  - The `releaseStatus` column on the `Movie` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `releaseDate` on the `Movie` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ReleaseStatus" AS ENUM ('RELEASED', 'UPCOMING', 'CANCELLED');

-- AlterTable
ALTER TABLE "Movie" DROP COLUMN "releaseDate",
ADD COLUMN     "releaseDate" TIMESTAMP(3) NOT NULL,
DROP COLUMN "releaseStatus",
ADD COLUMN     "releaseStatus" "ReleaseStatus" NOT NULL DEFAULT 'RELEASED';

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "User_id_seq";
