import fs from "node:fs";
import { UserType } from "@prisma/client";
import prisma from "./prisma";
import { faker } from "@faker-js/faker";
import { addProfiles } from "./lib/student";

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
    const { nanoid } = await import("nanoid");

    const profiles: any[] = [];
    for (let i = 0; i < 1000; ++i) {
        const srNo = nanoid();
        const name = faker.name.firstName();
        const emails = [faker.internet.email()];
        const fatherPhone = faker.phone.number("+91 ##########");
        const motherPhone = faker.phone.number("+91 ##########");
        const dob = faker.date.past(10);
        const address = faker.address.streetAddress();
        const fatherOcc = faker.name.jobTitle();
        const motherOcc = faker.name.jobTitle();
        const gender = Math.random() > 0.5 ? "MALE" : "FEMALE";
        profiles.push({
            srNo,
            name,
            emails,
            phone1: fatherPhone,
            phone2: motherPhone,
            dob,
            address,
            fatherOcc,
            motherOcc,
            gender,
        });
    }
    await addProfiles(profiles);
})();
