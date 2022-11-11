-- CreateTable
CREATE TABLE "AttendanceMarked" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceMarked_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AttendanceToAttendanceMarked" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_AttendanceToAttendanceMarked_AB_unique" ON "_AttendanceToAttendanceMarked"("A", "B");

-- CreateIndex
CREATE INDEX "_AttendanceToAttendanceMarked_B_index" ON "_AttendanceToAttendanceMarked"("B");

-- AddForeignKey
ALTER TABLE "_AttendanceToAttendanceMarked" ADD CONSTRAINT "_AttendanceToAttendanceMarked_A_fkey" FOREIGN KEY ("A") REFERENCES "Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AttendanceToAttendanceMarked" ADD CONSTRAINT "_AttendanceToAttendanceMarked_B_fkey" FOREIGN KEY ("B") REFERENCES "AttendanceMarked"("id") ON DELETE CASCADE ON UPDATE CASCADE;
