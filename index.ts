import fastify, {
    FastifyInstance,
    FastifyReply,
    FastifyRequest,
} from "fastify";
import crypto from "node:crypto";
import admin from "firebase-admin";
import cookie from "@fastify/cookie";
import { v4 as uuidv4 } from "uuid";

import authRoutes from "./router/auth";
import teacherRoutes from "./router/teacher";
import adminRoutes from "./router/admin";
import { getUser } from "./lib/auth";
import { Grade, UserType } from "@prisma/client";

const fbapp = admin.initializeApp({
    credential: admin.credential.cert(require("./firebase.json")),
});

const app = fastify({ logger: true });

app.register(cookie, {
    secret: crypto.randomBytes(1024).toString("base64"),
});

declare module "fastify" {
    interface FastifyRequest {
        user: {
            id: string;
            students: {
                id: string;
                name: string;
                students: {
                    id: string;
                }[]
            }[];
            teacher: {
                class: {
                    id: string;
                    grade: Grade;
                    section: string;
                } | null;
                classSubjects: {
                    id: string;
                    class: {
                        id: string;
                    };
                }[];
            }[];
            authSess: {
                id: string;
                ua: string;
            }[];
            name: string;
            email: string | null;
            type: UserType;
        };
    }
}

app.register(authRoutes);

app.register(async (app: FastifyInstance) => {
    app.addHook(
        "onRequest",
        async (request: FastifyRequest, reply: FastifyReply) => {
            const auth = request.headers.authorization;

            if (!auth) {
                return reply.code(401).send({
                    error: "Unauthorized",
                });
            }

            const [type, token] = auth.split(" ");

            if (type !== "Bearer") {
                return reply.code(401).send({
                    error: "Unauthorized",
                });
            }

            const user = await getUser(token);

            if (!user) {
                return reply.code(401).send({
                    error: "Unauthorized",
                });
            }

            request.user = user;
        }
    );

    app.register(adminRoutes);
    app.register(teacherRoutes);
});

const port = process.env.PORT ? parseInt(process.env.PORT) : 1337;

app.listen({ port });
