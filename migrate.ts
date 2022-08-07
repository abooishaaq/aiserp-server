import fs from "node:fs";
import { UserType } from "@prisma/client";
import prisma from "./prisma";

const admins = JSON.parse(fs.readFileSync("admins.json", "utf8"));

(async () => {
    for (const admin of admins) {
        console.log(admin);
        await prisma.user.update({
            where: {
                email: admin.email,
            },
            data: {
                type: UserType.SU,
                phone: admin.phone,
            }
        });
    }
})();

// delete sessions older than 30 min
(async () => {
    const sessions = await prisma.authSession.findMany({
        where: {
            createdAt: {
                lt: new Date(Date.now() - 30 * 60 * 1000),
            },
        },
    });
    console.log(sessions);
    for (const session of sessions) {
        await prisma.authSession.delete({
            where: {
                id: session.id,
            },
        });
    }
})();

(async () => {
    // get all users;
    const users = await prisma.user.findMany({
        where: {
            type: UserType.SU,
        }
    });
    console.log(users);
})()