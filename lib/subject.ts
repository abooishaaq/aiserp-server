import { TestType } from "@prisma/client";
import prisma from "../prisma";
import { latestSession } from "./class";

export const createSubject = async (name: string) => {
    //  check if subject already exists
    const subject = await prisma.subject.findFirst({
        where: {
            name,
        },
    });

    if (subject) {
        throw new Error(`Subject ${name} already exists`);
    }

    return await prisma.subject.create({
        data: {
            name,
        },
    });
};

export const getAllSubjects = () => {
    return prisma.subject.findMany();
};

export const createGroup = async (subjects: string[], name: string) => {
    // group name should be unique
    const group = await prisma.group.findFirst({
        where: {
            name,
        },
    });

    if (group) {
        throw new Error(`Group ${name} already exists`);
    }

    return await prisma.group.create({
        data: {
            name,
            subjects: {
                connect: subjects.map((subject) => ({ name: subject })),
            },
        },
    });
};

export const getAllGroups = () => {
    return prisma.group.findMany({
        select: {
            id: true,
            name: true,
            subjects: {
                select: {
                    name: true,
                },
            },
        },
    });
};

export const getGroupByName = async (name: string) => {
    return await prisma.group.findFirst({
        where: {
            name,
        },
    });
};

export const getAllTests = async () => {
    const session = await latestSession();

    if (!session) {
        throw new Error("No session found");
    }

    return prisma.test.findMany({
        where: {
            date: {
                gte: session.start,
                lte: session.end,
            },
        },
    });
};

export const getTestsOfSubject = async (subject: string) => {
    const session = await latestSession();

    if (!session) {
        throw new Error("No session found");
    }

    return await prisma.test.findMany({
        where: {
            subject: {
                name: subject,
            },
            date: {
                gte: session.start,
                lte: session.end,
            },
        },
    });
};

export const getTestsOfGrade = async (grade: string) => {
    const session = await latestSession();

    if (!session) {
        throw new Error("No session found");
    }

    return await prisma.test.findMany({
        where: {
            date: {
                gte: session.start,
                lte: session.end,
            },
            grade,
        },
    });
};

export const createTest = async (
    grade: string,
    total: number,
    subject: string,
    type: TestType,
    date: Date
) => {
    return prisma.test.create({
        data: {
            grade,
            total,
            type,
            date,
            subject: { connect: { name: subject } },
        },
    });
};

export const getTeachersBySubject = (subject: string) => {
    return prisma.teacher.findMany({
        where: {
            classSubjects: {
                some: {
                    subject: {
                        name: subject
                    },
                },
            },
        },
        select: {
            id: true,
            user: {
                select: {
                    id: true,
                    name: true,
                }
            },
            classSubjects: {
                select: {
                    class: {
                        select: {
                            id: true,
                            grade: true,
                            section: true,
                        }
                    }
                }
            }
        }
    });
};

export const updateClassSubject = (id: string, classId: string, subject: string, teacherId: string) => {
    return prisma.classSubject.update({
        where: {
            id,
        },
        data: {
            class: { connect: { id: classId } },
            subject: { connect: { name: subject } },
            teacher: { connect: { id: teacherId } },
        },
    });
}

export const deleteClassSubject = (id: string) => {
    return prisma.classSubject.delete({
        where: {
            id,
        },
    });
}
