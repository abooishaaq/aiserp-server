import prisma from "./prisma";

(async () => {
    // delete sessio with no classes attached to it
    const sessions = await prisma.session.findMany({
        select: {
            id: true,
            classes: true
        }
    });
    console.log(sessions);
    // for (const session of sessions) {
        // await prisma.session.delete({
        //     where: {
        //         id: "cl6c25om01158f0cp9m3flvw8",
        //     },
        // });
        // console.log(`Deleted session ${session.id}`);
    // }
})();
