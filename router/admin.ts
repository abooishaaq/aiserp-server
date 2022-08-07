import joi from "joi";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleUserVerification } from "../lib/auth";
import { Grade, StudentProfile, Teacher, User, UserType } from "@prisma/client";
import {
    addProfiles,
    addStudents,
    getAllProfiles,
    getCurrStudents,
    getStudent,
    updateStudent,
} from "../lib/student";
import {
    addTeachers,
    assignTeacherSubjectsClasses as assignTeacherClassSubject,
    getAllTeachers,
    getTeacher,
    getTest,
} from "../lib/teacher";
import {
    createClass,
    createSession,
    getClass,
    getGradesFromSession,
    getStudentsFromClass,
    gradeFromString,
    latestSession,
    getAllSessions,
    getSessionClasses,
    getAllCurrClasses,
} from "../lib/class";
import {
    deleteUser,
    getAllUsers,
    getUserByEmail,
    getUserById,
    updateUser,
} from "../lib/user";
import {
    createGroup,
    createSubject,
    createTest,
    getAllGroups,
    getAllSubjects,
    getAllTests,
    getTeachersBySubject,
    updateClassSubject,
} from "../lib/subject";
import { getUser } from "../lib/auth";

import deque from "../deque";

const add_students_schema = joi.object({
    students: joi
        .array()
        .items(
            joi
                .object({
                    srNo: joi.string().required(),
                    rollNo: joi.string().required(),
                    class: joi
                        .object({
                            grade: joi.string().required(),
                            section: joi.string().required(),
                        })
                        .required(),
                    group: joi.string().required(),
                })
                .required()
        )
        .required(),
});

const add_profiles_schema = joi.object({
    profiles: joi.array().items(
        joi
            .object({
                srNo: joi.string().required(),
                name: joi.string().required(),
                emails: joi.array().items(joi.string()).required(),
                phone1: joi.string().required(),
                phone2: joi.string().required(),
                address: joi.string().required(),
                dob: joi.string().required(),
                fatherName: joi.string().required(),
                motherName: joi.string().required(),
                fatherOcc: joi.string().required(),
                motherOcc: joi.string().required(),
                gender: joi.string().required(),
            })
            .required()
    ),
});

const add_teachers_schema = joi.object({
    teachers: joi
        .array()
        .items(
            joi
                .object({
                    name: joi.string().required(),
                    email: joi.string(),
                    phone: joi.string().required(),
                })
                .required()
        )
        .required(),
});

const add_subject_schema = joi.object({
    name: joi.string().required(),
});

const create_group_schema = joi.object({
    name: joi.string().required(),
    subjects: joi.array().items(joi.string().required()).required(),
});

const create_session_schema = joi.object({
    start: joi.date().required(),
    end: joi.date().required(),
});

const create_test_schema = joi.object({
    subject: joi.string().required(),
    date: joi.date().required(),
    type: joi.string().required(),
    grade: joi.string().required(),
    total: joi.number().required(),
});

const classes_subjects_schema = joi.object({
    teacherId: joi.string().required(),
    classId: joi.string(),
    subject: joi.string(),
});

const update_class_subjects = joi.object({
    id: joi.string().required(),
    classId: joi.string().required(),
    teacherId: joi.string().required(),
    subject: joi.string().required(),
});

const update_user_schema = joi.object({
    id: joi.string().required(),
    name: joi.string().required(),
    email: joi.string().required(),
});

const teacher_class_schema = joi
    .object({
        classId: joi.string().required(),
        teacherId: joi.string().required(),
    })
    .required();

const add_class_schema = joi
    .object({
        grade: joi.string().required(),
        section: joi.string().required(),
        teacherId: joi.string().required(),
    })
    .required();

const update_student_schema = joi
    .object({
        student: joi
            .object({
                email: joi.array().items(joi.string().required()).required(),
                rollNo: joi.string().required(),
                classId: joi.string().required(),
                groupId: joi.string().required(),
            })
            .required(),
        id: joi.string().required(),
    })
    .required();

const routes = async (app: FastifyInstance) => {
    app.addHook("preHandler", async (request: FastifyRequest, reply: FastifyReply) => {
        if (request.user && request.user.type !== UserType.ADMIN && request.user.type !== UserType.SU) {
            return reply.code(401).send({
                error: "Unauthorized",
            });
        }
    });

    app.post("/api/add/students", async (request, reply) => {
        const body = request.body;

        try {
            const { students } = await add_students_schema.validateAsync(body);

            await addStudents(students);

            reply.status(200).send({
                success: true,
            });

            deque.push({
                userId: request.user.id,
                type: "ADD_STUDENTS",
                data: [students.map((student: any) => student.srNo)],
            });
        } catch (err) {
            reply.status(400).send({
                success: false,
                message: (err as { message: string }).message,
            });
        }
    });

    app.post("/api/add/profiles", async (request, reply) => {
        const body = request.body;

        try {
            const { profiles } = await add_profiles_schema.validateAsync(body);

            await addProfiles(profiles);

            reply.status(200).send({
                success: true,
            });
        } catch (err) {
            reply.status(400).send({
                success: false,
                message: (err as { message: string }).message,
            });
        }
    });

    app.post("/api/add/teachers", async (request, reply) => {
        const body = request.body;

        try {
            const { teachers } = await add_teachers_schema.validateAsync(body);

            const names = (teachers as any[]).map((t) => t.name);
            const emails = (teachers as any[]).map((t) => t.email);
            const phones = (teachers as any[]).map((t) => t.phone);

            const teachersAdded = await addTeachers(names, emails, phones);

            reply.status(200).send({
                success: true,
            });

            deque.push({
                type: "ADD_TEACHERS",
                userId: request.user.id,
                data: [teachersAdded.map((t) => t.id)],
            });
        } catch (err) {
            reply.status(400).send({
                success: false,
                message: (err as { message: string }).message,
            });
        }
    });

    app.get("/api/get/profiles", async (request, reply) => {
        const profiles = await getAllProfiles();

        reply.status(200).send({
            success: true,
            profiles,
        });
    });

    app.post("/api/create/class", async (request, reply) => {
        const body = request.body;

        try {
            const { grade, section, teacherId } =
                await add_class_schema.validateAsync(body);

            const session = await latestSession();

            if (!session) {
                reply.status(400).send({
                    success: false,
                    message: "No session found",
                });
                return;
            }

            await createClass(
                gradeFromString(grade),
                section,
                teacherId,
                session.id
            );

            reply.status(200).send({
                success: true,
            });

            deque.push({
                type: "ADD_CLASS",
                userId: request.user.id,
                data: [grade, section, teacherId],
            });
        } catch (err) {
            console.log(err);
            reply.status(400).send({
                success: false,
                message: (err as { message: string }).message,
            });
        }
    });

    app.post("/api/create/session", async (request, reply) => {
        const body = request.body;

        try {
            const { start, end } = await create_session_schema.validateAsync(
                body
            );

            const startDate = new Date(start);
            const endDate = new Date(end);

            await createSession(startDate, endDate);

            reply.status(200).send({
                success: true,
            });

            deque.push({
                userId: request.user.id,
                type: "ADD_SESSION",
                data: [startDate.toDateString(), endDate.toDateString()],
            });
        } catch (err) {
            reply.status(400).send({
                success: false,
                message: (err as { message: string }).message,
            });
        }
    });

    app.post("/api/add/subject", async (request, reply) => {
        const body = request.body;

        try {
            const { name } = await add_subject_schema.validateAsync(body);

            await createSubject(name);

            reply.status(200).send({
                success: true,
            });
        } catch (err) {
            reply.status(400).send({
                success: false,
                message: (err as { message: string }).message,
            });
        }
    });

    app.post("/api/create/group", async (request, reply) => {
        const verified = await handleUserVerification(
            request,
            reply,
            UserType.ADMIN
        );

        if (!verified) return;

        const body = request.body;

        try {
            const { name, subjects } = await create_group_schema.validateAsync(
                body
            );

            await createGroup(subjects, name);

            reply.status(200).send({
                success: true,
            });
        } catch (err) {
            reply.status(400).send({
                success: false,
                message: (err as { message: string }).message,
            });
        }
    });

    app.get("/api/get/teachers", async (request, reply) => {
        const teachers = await getAllTeachers();

        reply.status(200).send({
            success: true,
            teachers,
        });
    });

    app.get("/api/get/users", async (request, reply) => {
        const users = await getAllUsers();

        reply.status(200).send({
            success: true,
            users,
        });
    });

    app.get("/api/get/groups", async (request, reply) => {
        const groups = await getAllGroups();

        reply.status(200).send({
            success: true,
            groups,
        });
    });

    app.get("/api/get/subjects", async (request, reply) => {
        const subjects = await getAllSubjects();

        reply.status(200).send({
            success: true,
            subjects,
        });
    });

    app.get("/api/get/sessions", async (request, reply) => {
        const sessions = await getAllSessions();

        reply.status(200).send({
            success: true,
            sessions,
        });
    });

    app.get("/api/get/teacher/:id", async (request, reply) => {
        const id = (request.params as { id: string }).id;

        try {
            const teacher = await getTeacher(id);

            reply.status(200).send({
                success: true,
                teacher,
            });
        } catch (err) {
            reply.status(400).send({
                success: false,
                message: (err as { message: string }).message,
            });
        }
    });

    app.get("/api/get/session-classes/:id", async (request, reply) => {
        const id = (request.params as { id: string }).id;

        try {
            const data = await getSessionClasses(id);

            reply.status(200).send({
                success: true,
                ...data,
            });
        } catch (err) {
            reply.status(400).send({
                success: false,
                message: (err as { message: string }).message,
            });
        }
    });

    app.get("/api/get/email-user/:email", async (request, reply) => {
        const email = (request.params as { email: string }).email;

        try {
            const user = await getUserByEmail(email);

            reply.status(200).send({
                success: true,
                user: user,
            });
        } catch (err) {
            reply.status(400).send({
                success: false,
                message: (err as { message: string }).message,
            });
        }
    });

    app.get("/api/get/subject-teachers/:subject", async (request, reply) => {
        const subject = (request.params as { subject: string }).subject;

        try {
            const teachers = await getTeachersBySubject(subject);

            reply.status(200).send({
                success: true,
                teachers,
            });
        } catch (err) {
            reply.status(400).send({
                success: false,
                message: (err as { message: string }).message,
            });
        }
    });

    app.post("/api/update/user", async (request, reply) => {
        const body = request.body;

        try {
            const { id, name, email } = await update_user_schema.validateAsync(
                body
            );

            await updateUser(id, name, email);

            reply.status(200).send({
                success: true,
            });

            deque.push({
                type: "UPDATE_USER",
                userId: request.user.id,
                data: [id],
            });
        } catch (err) {
            reply.status(400).send({
                success: false,
                message: (err as { message: string }).message,
            });
        }
    });

    app.post("/api/update/student", async (request, reply) => {
        const body = request.body;

        try {
            const { id, student } = await update_student_schema.validateAsync(
                body
            );

            await updateStudent(
                id,
                student.emails,
                student.rollNo,
                student.classId,
                student.groupId
            );

            reply.status(200).send({
                success: true,
            });

            deque.push({
                userId: request.user.id,
                type: "UPDATE_STUDENT",
                data: [student.id],
            });
        } catch (err) {
            console.log(err);
            reply.status(400).send({
                success: false,
                message: (err as { message: string }).message,
            });
        }
    });

    app.get("/api/get/subject-teacher/:subject", async (request, reply) => {
        const subject = (request.params as { subject: string }).subject;

        try {
            const teachers = await getTeachersBySubject(subject);

            reply.status(200).send({
                success: true,
                teachers,
            });
        } catch (err) {
            reply.status(400).send({
                success: false,
                message: (err as { message: string }).message,
            });
        }
    });

    app.post("/api/add/class-subject", async (request, reply) => {
        const body = request.body;

        try {
            const { teacherId, classId, subject } =
                await classes_subjects_schema.validateAsync(body);

            await assignTeacherClassSubject(teacherId, subject, classId);

            reply.status(200).send({
                success: true,
            });

            deque.push({
                userId: request.user.id,
                type: "ADD_CLASS_SUBJECT",
                data: [teacherId, classId, subject],
            });
        } catch (err) {
            reply.status(400).send({
                success: false,
                message: (err as { message: string }).message,
            });
        }
    });

    app.post("/api/update/class-subjects", async (request, reply) => {
        const body = request.body;

        try {
            const { classId, subject, teacherId, id } =
                await update_class_subjects.validateAsync(body);

            await updateClassSubject(id, classId, subject, teacherId);

            reply.status(200).send({
                success: true,
            });

            deque.push({
                userId: request.user.id,
                type: "UPDATE_CLASS_SUBJECT",
                data: [classId, subject, teacherId],
            });
        } catch (err) {
            reply.status(400).send({
                success: false,
                message: (err as { message: string }).message,
            });
        }
    });

    app.get("/api/get/class/:grade/:session", async (request, reply) => {
        const { grade, session } = request.params as {
            grade: string;
            session: string;
        };

        const classes = getGradesFromSession(gradeFromString(grade), session);

        reply.status(200).send({
            success: true,
            classes,
        });
    });

    app.get("/api/get/classes", async (request, reply) => {
        try {
            const classes = await getAllCurrClasses();

            reply.status(200).send({
                success: true,
                classes,
            });
        } catch (err) {
            reply.status(400).send({
                success: false,
                message: (err as { message: string }).message,
            });
        }
    });

    app.get("/api/get/tests", async (request, reply) => {
        try {
            const tests = await getAllTests();

            reply.status(200).send({
                success: true,
                tests,
            });
        } catch (err) {
            reply.status(400).send({
                success: false,
                message: (err as { message: string }).message,
            });
        }
    });

    app.get("/api/get/test/:id", async (request, reply) => {
        const { id } = request.params as { id: string };

        if (!id) {
            reply.status(400).send({
                success: false,
                message: "Invalid id",
            });
            return;
        }

        try {
            const test = await getTest(id);

            reply.status(200).send({
                success: true,
                test,
            });
        } catch (err) {
            reply.status(400).send({
                success: false,
                message: (err as { message: string }).message,
            });
        }
    });

    app.get("/api/get/user/:id", async (request, reply) => {
        const { id } = request.params as { id: string };

        const user = await getUserById(id);

        reply.status(200).send({
            success: true,
            user,
        });
    });

    app.get("/api/get/class-id/:id", async (request, reply) => {
        const { id } = request.params as { id: string };

        const class_ = await getClass(id);

        reply.status(200).send({
            success: true,
            class: class_,
        });
    });

    app.get("/api/get/curr-students", async (request, reply) => {
        const students = await getCurrStudents();

        reply.status(200).send({
            success: true,
            students,
        });
    });

    app.get("/api/get/students/:id", async (request, reply) => {
        const { id } = request.params as { id: string };

        const student = await getStudent(id);

        reply.status(200).send({
            success: true,
            student,
        });
    });

    app.get("/api/get/class-students/:classId", async (request, reply) => {
        const { classId } = request.params as { classId: string };

        const students = await getStudentsFromClass(classId);

        reply.status(200).send({
            success: true,
            students,
        });
    });

    app.post("/api/delete/user", async (request, reply) => {
        const body = request.body;

        try {
            const { id } = await joi
                .object({ id: joi.string().required() })
                .validateAsync(body);

            await deleteUser(id);

            reply.status(200).send({
                success: true,
            });

            deque.push({
                type: "DELETE_USER",
                userId: request.user.id,
                data: [id],
            });
        } catch (err) {
            reply.status(400).send({
                success: false,
                message: (err as { message: string }).message,
            });
        }
    });

    app.post("/api/create/test", async (request, reply) => {
        const body = request.body;

        try {
            const { date, type, subject, grade, total } =
                await create_test_schema.validateAsync(body);

            const test = await createTest(
                gradeFromString(grade),
                total,
                subject,
                type,
                date
            );

            reply.status(200).send({
                success: true,
            });

            deque.push({
                type: "CREATE_TEST",
                userId: request.user.id,
                data: [test.id],
            });
        } catch (err) {
            reply.status(400).send({
                success: false,
                message: (err as { message: string }).message,
            });
        }
    });

    app.get("/api/get/activity", async (request, reply) => {
        if (request.user.type !== "SU") {
            reply.status(400).send({
                success: false,
                message: "You are not authorized to do this",
            });
            return;
        }

        reply.status(200).send({
            success: true,
            activity: deque.items,
        });
    });
};

export default routes;
