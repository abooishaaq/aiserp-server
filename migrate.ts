import fs from "node:fs";
import { UserType } from "@prisma/client";
import prisma from "./prisma";

const admins = JSON.parse(fs.readFileSync("admins.json", "utf8"));

(async () => {
    for (const admin of admins) {
        const user = await prisma.user.findFirst({
            where: {
                email: admin.email,
            },
        });

        if (user) {
            await prisma.user.update({
                where: {
                    id: user.id,
                },
                data: {
                    type: UserType.SU,
                    phone: admin.phone,
                },
            });
            continue;
        }

        await prisma.user.create({
            data: {
                email: admin.email,
                phone: admin.phone,
                name: admin.name,
                type: UserType.SU,
            },
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
        },
    });
    console.log(users);
})();
