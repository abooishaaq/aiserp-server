import { Class, Marks, UserType } from "@prisma/client";
import prisma from "../prisma";
import { latestSession } from "./class";
import { addUsersWithEmail, addUsersWithEmailPhone } from "./user";

export const addTeacher = async (userId: string, classId: string) => {
    const session = await latestSession();

    if (!session) {
        throw new Error("No session found");
    }

    return prisma.teacher.create({
        data: {
            user: { connect: { id: userId } },
            class: { connect: { id: classId } },
            session: { connect: { id: session.id } },
        },
    });
};

export const addTeachers = async (names: string[], emails: string[], phones: string[]) => {
    const session = await latestSession();

    if (!session) {
        throw new Error("No session found");
    }

    if (names.length !== emails.length || names.length !== phones.length) {
        throw new Error("names, emails, phones must be the same length");
    }

    const users = await addUsersWithEmailPhone(emails, phones, names, UserType.TEACHER);
    return await Promise.all(
        emails.map(async (_, i) => {
            // check if the teacher is already added
            const teacher = await prisma.teacher.findFirst({
                where: {
                    userId: users[i].id,
                    session: { id: session.id },
                },
            });
            if (teacher) {
                return teacher;
            }

            return await prisma.teacher.create({
                data: {
                    user: { connect: { id: users[i].id } },
                    session: { connect: { id: session.id } },
                },
            });
        })
    );
};

export const addTeacherToClass = async (teacherId: string, classId: string) => {
    const teacher = await prisma.teacher.findFirst({
        where: {
            id: teacherId,
        },
    });

    const class_ = await prisma.class.findFirst({
        where: {
            id: classId,
        },
    });

    if (class_?.teacherId) {
        throw new Error(
            `Teacher ${class_?.teacherId} already assigned to class ${classId}`
        );
    }

    if (!teacher) {
        throw new Error("teacher not found");
    }

    await prisma.teacher.update({
        where: {
            id: teacherId,
        },
        data: {
            class: {
                connect: {
                    id: classId,
                },
            },
        },
    });
};

export const getAllTeachers = () => {
    return prisma.teacher.findMany({
        select: {
            id: true,
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
            class: {
                select: {
                    id: true,
                    grade: true,
                    section: true,
                },
            },
        },
    });
};

export const getTeachersBySubjectClass = (subject: string, class_: string) => {
    return prisma.teacher.findMany({
        where: {
            classSubjects: {
                some: {
                    subject: { name: subject },
                    class: { id: class_ },
                },
            },
        },
        select: {
            id: true,
            user: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });
};

export const assignTeacherSubjectsClasses = async (
    teacherId: string,
    subject: string,
    classId: string
) => {
    const teacher = await prisma.teacher.findFirst({
        where: {
            id: teacherId,
        },
        select: {
            user: {
                select: {
                    id: true,
                    name: true,
                },
            },
            classSubjects: {
                select: {
                    class: {
                        select: {
                            id: true,
                            grade: true,
                            section: true,
                        },
                    },
                    subjectName: true,
                },
            },
        },
    });

    const class_ = teacher?.classSubjects?.find(
        (cs) => cs.class.id === classId && cs.subjectName === subject
    )?.class;

    if (class_) {
        throw new Error(
            `Teacher ${teacher.user.name} already assigned to ${subject} in ${class_.grade}-${class_.section}`
        );
    }

    await prisma.teacher.update({
        where: {
            id: teacherId,
        },
        data: {
            classSubjects: {
                create: {
                    class: {
                        connect: {
                            id: classId,
                        },
                    },
                    subject: { connect: { name: subject } },
                },
            },
        },
    });
};

export const getTeacher = (id: string) => {
    return prisma.teacher.findFirst({
        where: {
            id,
        },
        select: {
            id: true,
            user: {
                select: {
                    id: true,
                    name: true,
                },
            },
            class: {
                select: {
                    id: true,
                    grade: true,
                    section: true,
                },
            },
            classSubjects: {
                select: {
                    id: true,
                    class: {
                        select: {
                            id: true,
                            grade: true,
                            section: true,
                        },
                    },
                    subject: {
                        select: {
                            name: true,
                        },
                    },
                },
            },
        },
    });
};

export const addAttendance = async (
    studentIds: string[],
    presence: boolean[],
    date: Date[]
) => {
    if (studentIds.length !== presence.length) {
        throw new Error("studentIds and presence must be the same length");
    }

    for (let i = 0; i < studentIds.length; i++) {
        await prisma.attendance.create({
            data: {
                studentId: studentIds[i],
                present: presence[i],
                date: date[i],
            },
        });
    }
};

export const addMarks = async (
    marks: number,
    studentId: string,
    testId: string,
    absent: boolean
) => {
    await prisma.marks.create({
        data: {
            marks,
            student: {
                connect: {
                    id: studentId,
                },
            },
            test: { connect: { id: testId } },
            absent,
        },
    });
};

export const getClassMarksForTest = async (
    classId: string,
    testId: string
): Promise<Marks[]> => {
    const students = await prisma.student.findMany({
        where: { class: { id: classId } },
    });
    const marks: Marks[] = [];
    for (let i = 0; i < students.length; i++) {
        const studentMarks = await prisma.marks.findFirst({
            where: {
                studentId: students[i].id,
                test: { id: testId },
            },
        });
        marks.push(studentMarks!);
    }
    return marks;
};

export const getTestsByTeacher = async (
    teacherId: string,
    year: number,
    month: number
) => {
    // fetch teacher
    const teacher = await prisma.teacher.findFirst({
        where: {
            id: teacherId,
        },
        select: {
            classSubjects: {
                select: {
                    subjectName: true,
                    class: {
                        select: {
                            id: true,
                            students: {
                                select: {
                                    id: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    if (!teacher) {
        throw new Error("teacher not found");
    }

    const tests = await prisma.test.findMany({
        where: {
            date: {
                gte: new Date(year, month, 1),
                lte: new Date(year, month + 1, 0),
            },
            subject: {
                name: {
                    in: teacher.classSubjects.map(
                        ({ subjectName }) => subjectName
                    ),
                },
            },
        },
        select: {
            date: true,
            total: true,
            subject: true,
            marks: {
                where: {
                    studentId: {
                        in: teacher.classSubjects.flatMap((s) =>
                            s.class.students.map(({ id }) => id)
                        ),
                    },
                },
                select: {
                    studentId: true,
                    marks: true,
                    absent: true,
                },
            },
        },
    });
    return tests;
};

export const getTest = (id: string) => {
    return prisma.test.findFirst({
        where: {
            id,
        },
        select: {
            id: true,
            date: true,
            total: true,
            subject: true,
            marks: {
                select: {
                    id: true,
                    student: {
                        select: {
                            id: true,
                            profile: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },
                    marks: true,
                    absent: true,
                },
            },
        },
    });
};

export const getAttendance = async (
    classId: string,
    month: number,
    year: number
) => {
    const students = await prisma.student.findMany({
        where: { class: { id: classId } },
    });

    const attendance = await prisma.attendance.findMany({
        where: {
            date: {
                gte: new Date(year, month, 1),
                lte: new Date(year, month + 1, 0),
            },
            studentId: {
                in: students.map((student) => student.id),
            },
        },
    });
    return attendance;
};

export const getSubjectTeachers = (subject: string) => {
    return prisma.teacher.findMany({
        where: {
            classSubjects: {
                some: {
                    subject: { name: subject },
                },
            },
        },
        select: {
            id: true,
            user: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });
};
