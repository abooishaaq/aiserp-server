import { UserType } from "@prisma/client";
import prisma from "../prisma";

export const addUser = (email: string, name: string, type: UserType) => {
    return prisma.user.create({
        data: {
            name,
            email,
            type,
        },
    });
};

export const addUsersWithEmail = (
    emails: string[],
    names: string[],
    type: UserType
) => {
    if (emails.length !== names.length) {
        throw new Error("emails and names must be of same length");
    }

    return Promise.all(
        emails.map(async (e, i) => {
            const user = {
                email: e,
                name: names[i],
                type,
            };
            return await prisma.user.upsert({
                create: { ...user },
                update: { ...user },
                where: {
                    email: e,
                },
            });
        })
    );
};

export const addUserWithPhone = async (
    phone: string,
    name: string,
    type: UserType
) => {
    const user = await prisma.user.findFirst({
        where: {
            phone,
        },
    });

    if (user) return user;

    return await prisma.user.create({
        data: {
            name,
            phone,
            type,
        },
    });
};

export const addUsersWithEmailPhone = async (
    emails: string[],
    phones: string[],
    names: string[],
    type: UserType
) => {
    if (emails.length !== phones.length || emails.length !== names.length) {
        throw new Error("emails, phones and names must be of same length");
    }

    return Promise.all(
        emails.map(async (e, i) => {
            const user = await prisma.user.findFirst({
                where: {
                    OR: [{ email: e }, { phone: phones[i] }],
                },
            });

            if (user) {
                return user;
            }

            return await prisma.user.create({
                data: {
                    email: e,
                    phone: phones[i],
                    name: names[i],
                    type,
                },
            });
        })
    );
};

export const updateUser = async (id: string, name: string, email: string) => {
    // check if the that email is already taken
    const user = await prisma.user.findFirst({
        where: {
            email,
        },
    });

    if (user && user.id !== id) {
        throw new Error(`Email ${email} is already taken`);
    }

    return await prisma.user.update({
        where: {
            id,
        },
        data: {
            name,
            email,
        },
    });
};

export const getAllUsers = () => {
    return prisma.user.findMany();
};

export const getUserById = (id: string) => {
    return prisma.user.findFirst({
        where: {
            id,
        },
        select: {
            id: true,
            name: true,
            email: true,
            type: true,
            students: true,
            teacher: true,
        },
    });
};

export const getUserByEmail = (email: string) => {
    return prisma.user.findFirst({
        where: {
            email,
        },
    });
};

export const deleteUser = (id: string) => {
    return prisma.user.delete({
        where: {
            id,
        },
    });
};
