// add admins to the database
import fs from "fs";
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
        if (!user) {
            await prisma.user.create({
                data: {
                    email: admin.email,
                    name: admin.name,
                    type: UserType.SU,
                },
            });
        }
    }
})();

(async () => {
    // delete all teachers with class id but non existent in the database

    const sessions = await prisma.authSession.findMany();

    console.log(sessions);
})();
