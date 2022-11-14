import { UserType } from "@prisma/client";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import prisma from "../prisma";

const routes = async (app: FastifyInstance) => {
    app.addHook(
        "onRequest",
        async (request: FastifyRequest, reply: FastifyReply) => {
            if (!request.user || request.user.type !== UserType.STUDENT) {
                return reply.code(401).send({
                    error: "Unauthorized",
                });
            }
        }
    );

    app.get("/api/get/student-notices/:id/:page", async (request, reply) => {
        const { id, page } = request.params as { id: string, page: string };

        if (!id || !page) {
            return reply.code(400).send({
                error: "Bad Request",
            });
        }

        const pagen = Number(page);

        if (isNaN(pagen)) {
            return reply.status(400);
        }

        const student = request.user.students.filter((student) => student.id === id);

        if (student.length === 0) {
            return reply.code(401).send({
                error: "Unauthorized",
            });
        }

        const students_class = await prisma.student.findFirst({
            where: {
                id,
            },
            select: {
                class: true,
            }
        });

        const notices = prisma.notice.findMany({
            where: {
                class: {
                    id: students_class?.class.id,
                },
            },
            take: 10,
            skip: pagen * 10,
            orderBy: {
                createdAt: "desc",
            }
        });

        reply.status(200).send({
            success: true,
            notices,
        });
    });
};

export default routes;
