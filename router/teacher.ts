import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getUser } from "../lib/auth";
import { UserType } from "@prisma/client";
import joi from "joi";
import { addMarks, addAttendance } from "../lib/teacher";
import { getTestsOfGrade } from "../lib/subject";
import { getClass } from "../lib/class";

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
        attendance: joi
            .object({
                date: joi.string().required(),
                studentIds: joi
                    .array()
                    .items(joi.string().required())
                    .required(),
                presence: joi
                    .array()
                    .items(joi.boolean().required())
                    .required(),
            })
            .required(),
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

    app.post("/api/add/marks", async (request, reply) => {
        const body = request.body;

        const { value: marks } = await marks_schema.validateAsync(body);

        if (!marks) {
            reply.status(400).send({
                error: "Invalid data",
            });
            return;
        }

        const { testId, marks: marks_ } = marks;

        for (let i = 0; i < marks_.length; i++) {
            const { studentId, marks: marks__, absent } = marks_[i];
            await addMarks(testId, studentId, marks__, absent);
        }
    });

    app.post("/api/add/attendance", async (request, reply) => {
        const body = request.body;

        const { value: attendance } = await attendance_schema.validateAsync(
            body
        );

        if (!attendance) {
            reply.status(400).send({
                error: "Invalid teacher",
            });
            return;
        }

        const { date, studentIds, presence } = attendance;

        const datee = new Date(date);

        const dates = new Array(studentIds.length).fill(datee);

        for (let i = 0; i < studentIds.length; i++) {
            await addAttendance(studentIds[i], presence[i], dates);
        }
    });

    app.get("/api/get/tests/:grade", async (request, reply) => {
        let user;
        try {
            user = await getUser(request.cookies.auth);
        } catch (error) {
            reply.status(401).send({
                error: "Unauthorized",
            });
            return;
        }

        const { grade } = request.params as { grade: string };

        if (!grade) {
            reply.status(400).send({
                error: "Invalid data",
            });
            return;
        }

        const tests = await getTestsOfGrade(grade);

        reply.status(200).send({
            success: true,
            tests,
        });
    });
};

export default routes;
