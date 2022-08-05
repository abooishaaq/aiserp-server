import fastify, { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import admin from "firebase-admin";
import cookie from "@fastify/cookie";
import { v4 as uuidv4 } from "uuid";

import authRoutes from "./router/auth";
import teacherRoutes from "./router/teacher";
import adminRoutes from "./router/admin";

const fbapp = admin.initializeApp({
    credential: admin.credential.cert(require("./firebase.json")),
});

const app = fastify({ logger: true });

app.register(cookie, {
    secret: crypto.randomBytes(1024).toString('base64'),
});

app.register(async (instance: FastifyInstance, opts, next) => {
    instance.addHook("onRequest", async (request, reply) => {
        reply.header("Cache-Control", `max-age=${60 * 60 * 5}`);
    });
});

app.register(authRoutes);
app.register(adminRoutes);
app.register(teacherRoutes);

const port = process.env.PORT ? parseInt(process.env.PORT) : 1337;

app.listen({ port });
