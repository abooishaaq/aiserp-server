import jwt from "jsonwebtoken";
import { Session, UserType } from "@prisma/client";
import secret from "../secret";
import prisma from "../prisma";
import { FastifyReply, FastifyRequest } from "fastify";
import { latestSession } from "./class";

export const decodeJwt = (token: string) => {
    try {
        return jwt.verify(token, secret) as { session: string };
    } catch (e) {
        return { session: "" };
    }
};

export const handleUserVerification = async (
    request: FastifyRequest,
    reply: FastifyReply,
    type: UserType,
) => {
    const unauth = () => {
        reply.status(401).send({
            success: false,
            message: "Unauthorized",
        });
    };

    try {
        const token = request.headers.authorization?.replace("Bearer ", "");

        if (!token) {
            unauth();
            return false;
        }

        const user = await getUser(token);

        if (user && (user.type === type || user.type === UserType.ADMIN || user.type === UserType.SU)) {
            return true;
        }

        unauth();
        return false;
    } catch (error) {
        unauth();
        return false;
    }
};

export const getUser = async (token: string) => {
    const decoded = decodeJwt(token);
    if (!decoded.session) {
        return null;
    }

    const authSession = await prisma.authSession.findFirst({
        where: {
            id: decoded.session,
        },
        select: {
            user: {
                select: {
                    id: true,
                },
            },
        },
    });

    if (!authSession) {
        return null;
    }

    let session: Session | null = null;
    try {
        session = await latestSession();
    } catch (e) {
        // ignore
    }

    const dbuser = await prisma.user.findFirst({
        where: {
            id: authSession.user.id,
        },
        select: {
            id: true,
            email: true,
            name: true,
            type: true,
            teacher: {
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
                    session: {
                        id: session?.id,
                    },
                }
            },
            students: {
                select: {
                    id: true,
                    name: true,
                },
            },
            authSess: {
                select: {
                    id: true,
                    ua: true,
                },
            }
        },
    });

    return dbuser;
};

export const isAdmin = async (token: string) => {
    const user = await getUser(token);

    if (!user) {
        return false;
    }

    return user.type === UserType.ADMIN;
};
