import {
    Grade,
    Group,
    StudentProfile,
    User,
    UserType,
    Session,
    Gender,
} from "@prisma/client";
import prisma from "../prisma";
import {
    getLatestClassesByGradeSection as getCurrClassesByGradeSection,
    gradeFromString,
    latestSession,
} from "./class";
import { addUsersWithEmail, addUserWithPhone } from "./user";

export const addStudents = async (
    students: {
        srNo: string;
        rollNo: string;
        class: { grade: string; section: string };
        group: string;
    }[]
) => {
    const session = await latestSession();

    // fetch student profiles from the db

    const profiles: StudentProfile[] = [];

    for (const student of students) {
        const profile = await prisma.studentProfile.findFirst({
            where: {
                srNo: student.srNo,
            },
        });

        if (profile) {
            profiles.push(profile);
        } else {
            throw new Error(`Student with srNo ${student.srNo} not found`);
        }
    }

    // check if the student is already in the db

    const existingStudents = await prisma.student.findMany({
        where: {
            profile: {
                srNo: {
                    in: students.map((p) => p.srNo),
                },
            },
            class: {
                session: {
                    id: session.id,
                },
            },
        },
        select: {
            profile: {
                select: {
                    srNo: true,
                },
            },
        },
    });

    if (existingStudents.length > 0) {
        throw new Error(
            `serial numbers: ${existingStudents
                .map((s) => s.profile.srNo)
                .join(", ")} already exist for the current session`
        );
    }

    // add students to the db

    // check for duplicate roll numbers for each class
    // convert students array to map of classId to students

    const classToRollNos: { [key: string]: Set<string> } = {};

    for (let i = 0; i < profiles.length; i++) {
        const class_ = students[i].class;
        const key = `${class_.grade}-${class_.section}`;
        if (!classToRollNos[key]) {
            classToRollNos[key] = new Set();
        }
        if (classToRollNos[key].has(students[i].rollNo)) {
            throw new Error(`Duplicate rollNo - ${students[i].rollNo}`);
        }
        classToRollNos[key].add(students[i].rollNo);
    }

    const classes = await getCurrClassesByGradeSection(
        students.map((s) => gradeFromString(s.class.grade)),
        students.map((s) => s.class.section)
    );

    // check if there is roll number conflict for each class
    for (let i = 0; i < classes.length; i++) {
        const class_ = classes[i];
        const key = `${class_?.grade}-${class_?.section}`;
        if (!classToRollNos[key]) {
            throw new Error(`Class ${key} not found`);
        }
        // set of roll numbers taken in the class
        const takenRollNos = new Set(class_?.students.map((s) => s.rollNo));
        // check for conflict

        for (const rollNo of classToRollNos[key]) {
            if (takenRollNos.has(rollNo)) {
                throw new Error(`RollNo ${rollNo} already taken`);
            }
        }
    }

    const groups = await Promise.all(
        students.map(async (s) => {
            const group = await prisma.group.findFirst({
                where: {
                    name: s.group,
                },
            });

            if (group) {
                return group;
            }

            throw new Error(`Group ${s.group} not found`);
        })
    );

    return await Promise.all(
        profiles.map((profile, i) => {
            return prisma.student.create({
                data: {
                    rollNo: students[i].rollNo,
                    class: {
                        connect: {
                            id: classes[i].id,
                        },
                    },
                    profile: {
                        connect: {
                            id: profile.id,
                        },
                    },
                    subjects: {
                        connect: {
                            id: groups[i].id,
                        },
                    },
                },
            });
        })
    );
};

export const addProfiles = async (
    profiles: {
        srNo: string;
        name: string;
        dob: string;
        address: string;
        phone1: string;
        phone2: string;
        emails: string[];
        fatherName: string;
        motherName: string;
        fatherOcc: string;
        motherOcc: string;
        gender: string;
    }[]
) => {
    const existingProfiles = await prisma.studentProfile.findMany({
        select: {
            id: true,
            srNo: true,
        },
    });

    const existingSrNos = existingProfiles.map((p) => p.srNo);

    const newProfiles = profiles.filter((p) => !existingSrNos.includes(p.srNo));

    const userss = await Promise.all(
        profiles.map(async (p) => {
            const users = await addUsersWithEmail(
                p.emails,
                new Array(p.emails.length).fill(""),
                UserType.STUDENT
            );
            users.push(
                await addUserWithPhone(p.phone1, p.fatherName, UserType.STUDENT)
            );
            users.push(
                await addUserWithPhone(p.phone2, p.motherName, UserType.STUDENT)
            );

            // filter duplicate ids
            const ids = new Set();

            const uniqUsers: User[] = [];

            for (let i = 0; i < users.length; ++i) {
                if (ids.has(users[i].id)) continue;

                uniqUsers.push(users[i]);
            }

            return uniqUsers;
        })
    );

    return await Promise.all(
        newProfiles.map((p, i) => {
            return prisma.studentProfile.create({
                data: {
                    srNo: p.srNo,
                    name: p.name,
                    dob: new Date(p.dob),
                    address: p.address,
                    phone1: p.phone1,
                    phone2: p.phone2,
                    fatherName: p.fatherName,
                    motherName: p.motherName,
                    fatherOcc: p.fatherOcc,
                    motherOcc: p.motherOcc,
                    users: {
                        connect: userss[i].map((u) => ({
                            id: u.id,
                        })),
                    },
                    gender: p.gender[0] === "M" ? Gender.MALE : Gender.FEMALE,
                },
            });
        })
    );
};

export const updateProfile = async (profile: {
    srNo: string;
    name: string;
    dob: string;
    address: string;
    phone1: string;
    phone2: string;
    fatherName: string;
    motherName: string;
    fatherOcc: string;
    motherOcc: string;
}) => {
    const existingProfile = await prisma.studentProfile.findFirst({
        where: {
            srNo: profile.srNo,
        },
    });

    if (existingProfile) {
        await prisma.studentProfile.update({
            where: {
                id: existingProfile.id,
            },
            data: {
                name: profile.name,
                dob: profile.dob,
                address: profile.address,
                phone1: profile.phone1,
                phone2: profile.phone2,
                fatherName: profile.fatherName,
                motherName: profile.motherName,
                fatherOcc: profile.fatherOcc,
                motherOcc: profile.motherOcc,
            },
        });
    } else {
        throw new Error(`Profile with serial number ${profile.srNo} not found`);
    }
};

export const getStudent = (id: string) => {
    return prisma.student.findFirst({
        where: { id },
        select: {
            id: true,
            profile: {
                select: {
                    name: true,
                },
            },
            rollNo: true,
            class: {
                select: {
                    id: true,
                    grade: true,
                    section: true,
                },
            },
            subjects: {
                select: {
                    id: true,
                    name: true,
                    subjects: {
                        select: {
                            name: true,
                            tests: true,
                        },
                    },
                },
            },
        },
    });
};

export const getAllProfiles = async () => {
    let session: Session | null = null;

    try {
        session = await latestSession();
    } catch (err) {
        // ignore
    }

    return prisma.studentProfile.findMany({
        select: {
            id: true,
            srNo: true,
            name: true,
            dob: true,
            address: true,
            phone1: true,
            phone2: true,
            fatherName: true,
            motherName: true,
            fatherOcc: true,
            motherOcc: true,
            users: {
                select: {
                    id: true,
                    email: true,
                    phone: true,
                },
            },
            students: {
                select: {
                    class: {
                        select: {
                            id: true,
                            grade: true,
                            section: true,
                        },
                    },
                },
                where: {
                    class: {
                        session: {
                            id: session?.id,
                        },
                    },
                },
            },
        },
    });
};

export const getProfile = (srNo: string) => {
    return prisma.studentProfile.findFirst({
        where: {
            srNo,
        },
        select: {
            id: true,
            srNo: true,
            name: true,
            dob: true,
            address: true,
            phone1: true,
            phone2: true,
            fatherName: true,
            motherName: true,
            fatherOcc: true,
            motherOcc: true,
            users: {
                select: {
                    id: true,
                    email: true,
                    phone: true,
                },
            },
            students: {
                select: {
                    id: true,
                    class: {
                        select: {
                            id: true,
                            grade: true,
                            section: true,
                            session: {
                                select: {
                                    id: true,
                                    start: true,
                                    end: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });
};

export const updateStudent = async (
    studentId: string,
    emails: string[],
    rollNo: string,
    classId: string,
    groupId: string
) => {
    const student = await prisma.student.findFirst({
        where: {
            id: studentId,
        },
    });

    if (!student) {
        throw new Error(`Student ${studentId} not found`);
    }

    // get users with the emails and create them if they dont exist

    const users = await prisma.user.findMany({
        where: {
            email: {
                in: emails,
            },
        },
    });

    const usersToCreate = emails.filter((email) => {
        return !users.some((user) => user.email === email);
    });

    if (usersToCreate.length > 0) {
        const dummyNames = new Array(usersToCreate.length).fill("");
        const _users = await addUsersWithEmail(
            usersToCreate,
            dummyNames,
            UserType.STUDENT
        );
        users.push(..._users);
    }

    await prisma.student.update({
        where: {
            id: studentId,
        },
        data: {
            rollNo: rollNo,
            class: { connect: { id: classId } },
            subjects: { connect: { id: groupId } },
        },
    });
};

export const getCurrStudents = async () => {
    const session = await latestSession();

    return await prisma.student.findMany({
        where: {
            class: {
                session: {
                    id: session.id,
                },
            },
        },
        select: {
            id: true,
            profile: {
                select: {
                    name: true,
                    users: {
                        select: {
                            id: true,
                            email: true,
                            phone: true,
                        },
                    },
                },
            },
            rollNo: true,
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

export const getStudentProfile = async (srNo: string) => {
    const student = await prisma.student.findFirst({
        where: {
            profile: {
                srNo,
            },
        },
        select: {
            id: true,
            profile: {
                select: {
                    name: true,
                },
            },
            rollNo: true,
            class: {
                select: {
                    id: true,
                    grade: true,
                    section: true,
                },
            },
            subjects: {
                select: {
                    id: true,
                    name: true,
                    subjects: {
                        select: {
                            name: true,
                            tests: {
                                where: {
                                    marks: {
                                        some: {
                                            student: {
                                                profile: {
                                                    srNo,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    if (!student) {
        throw new Error(`Serial Number ${srNo} not found`);
    }

    return student;
};
