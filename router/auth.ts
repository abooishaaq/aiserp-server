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
            user,
        });
    });

    app.post("/api/logout", async (request, reply) => {
        const auth = request.headers.authorization?.replace("Bearer ", "");

        if (!auth) {
            reply.code(401).send({ error: "Not logged in" });
            return;
        }

        // verify jwt token
        try {
            const decoded = jwt.verify(auth, secret) as { session: string };

            if (!decoded) {
                reply.code(401).send({ error: "Not logged in" });
                return;
            }

            // revoke token
            // delete auth session from the database

            prisma.authSession.delete({
                where: {
                    id: decoded.session,
                },
            });
        } catch (err) {
            reply.code(401).send({ error: "Not logged in" });
            return;
        }

        reply.redirect("/");
    });

    app.post("/api/login", async (request, reply) => {
        // see if authorization header is authentic
        const auth = request.headers.authorization?.replace("Bearer ", "");

        if (auth) {
            // delete session from the db and create new session

            const decoded = jwt.decode(auth);

            if (decoded) {
                const { session: oldSession } = decoded as { session: string };

                if (oldSession) {
                    try {
                        await prisma.authSession.delete({
                            where: {
                                id: oldSession,
                            },
                        });
                    } catch (err) {
                        console.log(err);
                    }
                }
            }

            const user = await getUser(auth);

            if (user) {
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

                reply.send({
                    success: true,
                    token: jwt.sign({ session: session.id }, secret),
                });
                return;
            }
        }

        const { token } = request.body as {
            token: string;
        };
        const decodedToken = await getAuth(admin.apps[0]!).verifyIdToken(token);

        console.log("firebase email", decodedToken.email);
        console.log("firebase phone", decodedToken.phone_number);

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    {
                        email: decodedToken.email,
                    },
                    {
                        phone: decodedToken.phone_number,
                    },
                ],
            },
        });

        console.log("database user", user);

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

    app.get("/api/phone", async (request, reply) => {
        const { phone } = request.query as { phone: string };

        if (!phone) {
            reply.code(400).send({ error: "No phone number provided" });
            return;
        }

        const user = await prisma.user.findFirst({
            where: {
                phone,
            },
        });

        if (user) {
            reply.send({
                yes: true,
            });
        } else {
            reply.send({
                no: true,
            });
        }
    });
};

export default routes;
