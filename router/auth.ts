import admin from "firebase-admin";
import { FastifyInstance } from "fastify";
import { getAuth } from "firebase-admin/auth";
import jwt from "jsonwebtoken";

import { getUser } from "../lib/auth";
import prisma from "../prisma";
import secret from "../secret";

const routes = async (app: FastifyInstance) => {
    app.get("/api/me", async (request, reply) => {
        const auth = request.headers.authorization?.replace("Bearer ", "");

        if (!auth) {
            reply.code(401).send({ error: "Not logged in" });
            return;
        }

        const user = await getUser(auth);

        reply.send({
            success: true,
            user
        });
    });

    app.post("/api/login", async (request, reply) => {
        // see if authorization header is authentic
        const auth = request.headers.authorization?.replace("Bearer ", "");

        if (auth) {
            const user = await getUser(auth);

            if (user) {
                // delete session from the db and create new session

                const session = await prisma.authSession.create({
                    data: {
                        user: {
                            connect: {
                                id: user.id
                            }
                        },
                        ua: request.headers["user-agent"] || "",
                    }
                });

                const decoded = jwt.decode(auth);

                if (decoded) {
                    const { session: oldSession } = decoded as { session: string };

                    if (oldSession) {
                        await prisma.authSession.delete({
                            where: {
                                id: oldSession
                            }
                        });
                    }
                }


                reply.send({
                    success: true,
                    token: jwt.sign({ session: session.id }, secret)
                });
                return;
            }
        }

        const { token } = request.body as {
            token: string;
        };
        const decodedToken = await getAuth(admin.apps[0]!).verifyIdToken(token);

        const user = await prisma.user.findFirst({
            where: {
                email: decodedToken.email,
            },
        });
        if (!user) {
            await reply.status(401).send({ error: "Account doesn't exists" });
            return;
        }

        const session = await prisma.authSession.create({
            data: {
                user: {
                    connect: {
                        id: user.id,
                    },
                },
                ua: request.headers["user-agent"] || "",
            },
        });

        const jwtToken = jwt.sign({ session: session.id }, secret);

        reply.send({
            token: jwtToken,
        });
    });
};

export default routes;
