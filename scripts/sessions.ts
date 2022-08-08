import prisma from "../prisma";

(async () => {
    const authSessions = await prisma.authSession.findMany({
        select: {
            id: true,
            createdAt: true,
            user: {
                select: {
                    id: true,
                    name: true,
                },
            },
            ua: true,
        },
    });
    console.log(authSessions);
    // delete sessions older than 5 min
    for (const authSession of authSessions) {
        if (authSession.createdAt < new Date(Date.now() - 5 * 60 * 1000)) {
            console.log("deleting session ", authSession);
            await prisma.authSession.delete({
                where: {
                    id: authSession.id,
                },
            });
        }
    }
})();
