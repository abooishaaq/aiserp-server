import { Attendance, Class, Grade } from "@prisma/client";
import prisma from "../prisma";

export const createClass = async (
    grade: Grade,
    section: string,
    teacherId: string,
    sessionId: string
) => {
    // check teacher exists
    const teacher = await prisma.teacher.findFirst({
        where: {
            id: teacherId,
        },
        select: {
            id: true,
            user: {
                select: {
                    name: true,
                },
            },
        },
    });

    if (!teacher) {
        throw new Error(`Teacher ${teacherId} not found`);
    }

    // if this session already has a class with this grade and section throw error
    const class_ = await prisma.class.findFirst({
        where: {
            grade,
            section,
            sessionId,
        },
    });

    if (class_) {
        throw new Error(
            `Class ${grade}-${section} already exists for the current session.`
        );
    }

    // if that teacher is already assigned to a class throw error
    const class_2 = await prisma.class.findFirst({
        where: {
            teacherId,
            session: {
                id: sessionId,
            },
        },
    });

    if (class_2) {
        throw new Error(
            `Teacher ${teacher.user.name} already assigned to class ${class_2.grade}-${class_2.section}`
        );
    }

    const classAdded = await prisma.class.create({
        data: {
            teacher: { connect: { id: teacherId } },
            grade,
            section,
            session: {
                connect: {
                    id: sessionId,
                },
            },
        },
    });

    return classAdded;
};

export const getClass = async (id: string) => {
    return prisma.class.findFirst({
        where: {
            id,
        },
        select: {
            id: true,
            grade: true,
            section: true,
            teacher: {
                select: {
                    id: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
            notices: {
                select: {
                    id: true,
                    title: true,
                    content: true,
                },
            },
            students: {
                select: {
                    id: true,
                    profile: {
                        select: {
                            name: true,
                        },
                    },
                    marks: {
                        select: {
                            marks: true,
                            test: {
                                select: {
                                    id: true,
                                    date: true,
                                    total: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });
};

export const getGradesFromSession = async (grade: Grade, sessionId: string) => {
    return prisma.class.findFirst({
        where: {
            grade,
            session: {
                id: sessionId,
            },
        },
    });
};

export const getAllCurrClasses = async () => {
    const session = await latestSession();

    if (!session) {
        throw new Error("Session not found");
    }

    return await prisma.class.findMany({
        where: {
            session: {
                id: session.id,
            },
        },
        select: {
            id: true,
            grade: true,
            section: true,
            teacher: {
                select: {
                    id: true,
                    userId: true,
                },
            },
        },
    });
};

export const changeClassTeacher = async (
    teacherId: string,
    classId: string
) => {
    const teacher = await prisma.teacher.findFirst({
        where: {
            id: teacherId,
        },
    });

    if (!teacher) {
        throw new Error("teacher not found");
    }

    const class_ = await prisma.class.findFirst({
        where: {
            id: classId,
        },
    });

    if (!class_) {
        throw new Error(`Class ${classId} not found`);
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

export const gradeFromString = (grade: String) => {
    switch (grade) {
        case "NURSERY":
            return Grade.NURSERY;
        case "SR_NURSERY":
            return Grade.SR_NURSERY;
        case "KINDERGARDEN":
            return Grade.KINDERGARDEN;
        case "1":
            return Grade.FIRST;
        case "FIRST":
            return Grade.FIRST;
        case "2":
            return Grade.SECOND;
        case "SECOND":
            return Grade.SECOND;
        case "3":
            return Grade.THIRD;
        case "THIRD":
            return Grade.THIRD;
        case "4":
            return Grade.FOURTH;
        case "FOURTH":
            return Grade.FOURTH;
        case "5":
            return Grade.FIFTH;
        case "FIFTH":
            return Grade.FIFTH;
        case "6":
            return Grade.SIXTH;
        case "SIXTH":
            return Grade.SIXTH;
        case "7":
            return Grade.SEVENTH;
        case "SEVENTH":
            return Grade.SEVENTH;
        case "8":
            return Grade.EIGHTH;
        case "EIGHTH":
            return Grade.EIGHTH;
        case "9":
            return Grade.NINTH;
        case "NINTH":
            return Grade.NINTH;
        case "10":
            return Grade.TENTH;
        case "TENTH":
            return Grade.TENTH;
        case "11":
            return Grade.ELEVENTH;
        case "ELEVENTH":
            return Grade.ELEVENTH;
        case "12":
            return Grade.TWELFTH;
        case "TWELFTH":
            return Grade.TWELFTH;
        default:
            throw new Error(`Invalid grade ${grade}`);
    }
};

export const cloneClass = async (
    classId: string,
    grade: Grade,
    section: string,
    teacherId: string,
    sessionId: string
) => {
    const class_ = await prisma.class.findFirst({ where: { id: classId } });
    if (!class_) {
        throw new Error("class not found");
    }
    const newClass = await prisma.class.create({
        data: {
            teacher: { connect: { id: teacherId } },
            grade: grade,
            section: section,
            session: {
                connect: {
                    id: sessionId,
                },
            },
        },
    });

    const students = await prisma.student.findMany({
        where: { class: { id: classId } },
    });

    for (let i = 0; i < students.length; i++) {
        const student = students[i];
        await prisma.student.create({
            data: {
                class: { connect: { id: newClass.id } },
                rollNo: student.rollNo,
                subjects: { connect: { id: student.groupId } },
                profile: {
                    connect: {
                        id: student.profileId,
                    },
                },
            },
        });
    }

    return newClass;
};

export const getClassAttendance = async (
    classId: string,
    year: number,
    month: number
) => {
    const students = await prisma.student.findMany({
        where: {
            class: { id: classId },
        },
    });

    const attendance: { [key: string]: Attendance[] }[] = [];
    for (let i = 0; i < students.length; ++i) {
        const studentAtt = await prisma.attendance.findMany({
            where: {
                studentId: students[i].id,
                date: {
                    gte: new Date(year, month, 1),
                    lte: new Date(year, month + 1, 0),
                },
            },
        });
        attendance.push({ [students[i].id]: studentAtt });
    }
};

export const getStudentsFromClass = (classId: string) => {
    return prisma.student.findMany({
        where: {
            class: { id: classId },
        },
        select: {
            id: true,
            rollNo: true,
            profile: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });
};

export const createSession = async (start: Date, end: Date) => {
    // there should be no overlap with any other session

    const session = await prisma.session.findMany({
        where: {
            OR: [
                {
                    start: {
                        gte: start,
                        lt: end,
                    },
                },
                {
                    end: {
                        gt: start,
                        lte: end,
                    },
                },
            ],
        },
    });

    if (session.length > 0) {
        throw new Error("There is an overlap with another session");
    }

    return prisma.session.create({
        data: {
            start,
            end,
        },
    });
};

export const latestSession = async () => {
    const session = await prisma.session.findFirst({
        orderBy: {
            start: "desc",
        },
    });

    if (!session) {
        throw new Error("No session found");
    }

    return session;
};

export const getClassesFromLatestSession = async () => {
    const session = await latestSession();

    if (!session) {
        throw new Error("No session found");
    }

    return prisma.class.findMany({
        where: {
            session: { id: session.id },
        },
    });
};

export const getLatestClassesByGradeSection = async (
    grades: Grade[],
    sections: string[]
) => {
    const session = await latestSession();

    if (!session) {
        throw new Error("No session found");
    }

    return await Promise.all(
        grades.map(async (grade, i) => {
            const class_ = await prisma.class.findFirst({
                where: {
                    grade,
                    section: sections[i],
                    session: { id: session.id },
                },
                select: {
                    id: true,
                    grade: true,
                    section: true,
                    students: {
                        select: {
                            rollNo: true,
                        },
                    },
                },
            });

            if (!class_) {
                throw new Error(`Class ${grade}-${sections[i]} not found`);
            }

            return class_;
        })
    );
};

export const getAllSessions = async () => {
    return prisma.session.findMany();
};

export const getSessionClasses = async (sessionId: string) => {
    const session = await prisma.session.findFirst({
        where: {
            id: sessionId,
        },
    });

    if (!session) {
        throw new Error(`Session ${sessionId} not found`);
    }

    // also get all classes from that session

    const classes = await prisma.class.findMany({
        where: {
            session: { id: sessionId },
        },
    });

    return { session, classes };
};

export const getGradeSectionFromClasses = (classIds: string[]) => {
    return prisma.class.findMany({
        where: {
            id: {
                in: classIds,
            },
        },
        select: {
            grade: true,
            section: true,
        },
    });
};
