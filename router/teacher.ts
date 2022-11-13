import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { UserType } from "@prisma/client";
import joi from "joi";
import {
    addNotices,
    getAllNotices,
    addAttendance,
    getAttendance,
    getNoticesByClass,
} from "../lib/teacher";
import { getGradeSectionFromClasses, getStudentsFromClass } from "../lib/class";

const test_schema = joi
    .object({
        test: joi
            .object({
                grade: joi.number().required(),
                total: joi.number().required(),
                subject: joi.string().required(),
                type: joi.string().required(),
                date: joi.string().required(),
            })
            .required(),
    })
    .required();

const marks_schema = joi
    .object({
        marks: joi
            .object({
                testId: joi.string().required(),
                marks: joi
                    .array()
                    .items(
                        joi
                            .object({
                                studentId: joi.string().required(),
                                marks: joi.number().required(),
                                absent: joi.boolean().required(),
                            })
                            .required()
                    )
                    .required(),
            })
            .required(),
    })
    .required();

const attendance_schema = joi
    .object({
        absent: joi.array().items(joi.string().required()).required(),
        class: joi.string().required(),
    })
    .required();

const add_notice_schema = joi
    .object({
        notice: joi
            .object({
                title: joi.string().required(),
                content: joi.string().required(),
            })
            .required(),
        classes: joi.array().items(joi.string().required()).required(),
    })
    .required();

const routes = async (app: FastifyInstance) => {
    app.addHook(
        "onRequest",
        async (request: FastifyRequest, reply: FastifyReply) => {
            if (
                !request.user ||
                (request.user.type !== UserType.TEACHER &&
                    request.user.type !== UserType.ADMIN &&
                    request.user.type !== UserType.SU)
            ) {
                return reply.code(401).send({
                    error: "Unauthorized",
                });
            }
        }
    );

    app.get("/api/get/students-class/:id", async (request, reply) => {
        const { id } = request.params as {
            id: string;
        };

        const students = await getStudentsFromClass(id);

        reply.status(200).send({
            success: true,
            students,
        });
    });

    app.post("/api/add/notice", async (request, reply) => {
        const body = request.body;

        const { notice, classes } = await add_notice_schema.validateAsync(body);

        if (request.user.type === UserType.TEACHER) {
            const teacherClasses = request.user.teacher[0].classSubjects.map(
                (c) => c.class.id
            );

            if (!classes.every((c: string) => teacherClasses.includes(c))) {
                reply.status(401).send({
                    success: false,
                    message: "Unauthorized",
                });
                return;
            }
        }

        await addNotices(notice.title, notice.content, classes);

        reply.status(200).send({
            success: true,
        });
    });

    app.get("/api/get/notices", async (request, reply) => {
        if (request.user.type === UserType.TEACHER) {
            const teacherClasses = request.user.teacher[0].classSubjects.map(
                (c) => c.class.id
            );

            const notices = await Promise.all(
                teacherClasses.map(getNoticesByClass)
            );

            reply.status(200).send({
                success: true,
                notices,
            });
        } else {
            const notices = await getAllNotices();

            reply.status(200).send({
                success: true,
                notices,
            });
        }
    });

    // given class id
    app.get("/api/get/grade-section/:ids", async (request, reply) => {
        const ids = (request.params as { ids: string }).ids;

        if (!ids) {
            reply.status(400).send({
                success: false,
                message: "Invalid request",
            });
            return;
        }

        const class_ = await getGradeSectionFromClasses(ids.split(","));

        if (!class_) {
            reply.status(404).send({
                success: false,
                message: "Class not found",
            });
        }

        reply.status(200).send({
            success: true,
            class: class_,
        });
    });

    app.post("/api/add/attendance", async (request, reply) => {
        const body = request.body;

        const attendance = await attendance_schema.validateAsync(body);

        if (request.user.type === UserType.TEACHER) {
            const teacherClasses = request.user.teacher[0].classSubjects.map(
                (c) => c.class.id
            );

            if (!teacherClasses.includes(attendance.class)) {
                reply.status(401).send({
                    success: false,
                    message: "Unauthorized",
                });
                return;
            }
        }

        try {
            await addAttendance(attendance.class, new Set(attendance.absent));

            reply.status(200).send({
                success: true,
            });
        } catch (e) {
            reply.status(400).send({
                success: false,
                message: (
                    e as {
                        message: string;
                    }
                ).message,
            });
        }
    });

    app.get("/api/get/attendance/:classId/:date", async (request, reply) => {
        const { classId, date } = request.params as {
            classId: string;
            date: string;
        };

        if (!classId || !date) {
            reply.status(400).send({
                success: false,
                message: "Invalid request",
            });
            return;
        }

        if (request.user.type === UserType.TEACHER) {
            const teacherClasses = request.user.teacher[0].classSubjects.map(
                (c) => c.class.id
            );

            if (!teacherClasses.includes(classId)) {
                reply.status(401).send({
                    success: false,
                    message: "Unauthorized",
                });
                return;
            }
        }

        const date_ = new Date(date);

        if (isNaN(date_.getTime())) {
            reply.status(400).send({
                success: false,
                message: "Invalid date",
            });
            return;
        }

        const attendance = await getAttendance(classId, date_);

        reply.status(200).send({
            success: true,
            attendance,
        });
    });
};

export default routes;
