/*
  Warnings:

  - You are about to drop the `_AttendanceToAttendanceMarked` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `classId` to the `AttendanceMarked` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_AttendanceToAttendanceMarked" DROP CONSTRAINT "_AttendanceToAttendanceMarked_A_fkey";

-- DropForeignKey
ALTER TABLE "_AttendanceToAttendanceMarked" DROP CONSTRAINT "_AttendanceToAttendanceMarked_B_fkey";

-- AlterTable
ALTER TABLE "AttendanceMarked" ADD COLUMN     "classId" TEXT NOT NULL;

-- DropTable
DROP TABLE "_AttendanceToAttendanceMarked";
