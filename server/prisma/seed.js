const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding...');

    // Sample product trends data (added and removed)
    await prisma.productTrend.createMany({
        data: [
            { productId: 1, action: 'added', count: 1, trendDate: new Date('2025-09-01T10:00:00Z') },
            { productId: 2, action: 'added', count: 1, trendDate: new Date('2025-09-01T11:00:00Z') },
            { productId: 1, action: 'removed', count: 1, trendDate: new Date('2025-09-03T09:00:00Z') },
            { productId: 3, action: 'added', count: 1, trendDate: new Date('2025-09-04T12:00:00Z') },
        ],
    });

    // Sample visitor logs data
    await prisma.visitorLog.createMany({
        data: [
            { sessionId: 'sess1', userAgent: 'Mozilla/5.0', ip: '192.168.1.1', visitDate: new Date('2025-09-01T08:00:00Z') },
            { sessionId: 'sess2', userAgent: 'Mozilla/5.0', ip: '192.168.1.2', visitDate: new Date('2025-09-01T09:00:00Z') },
            { sessionId: 'sess1', userAgent: 'Mozilla/5.0', ip: '192.168.1.1', visitDate: new Date('2025-09-02T14:00:00Z') },
            { sessionId: 'sess3', userAgent: 'Mozilla/5.0', ip: '192.168.1.3', visitDate: new Date('2025-09-03T10:00:00Z') },
        ],
    });

    console.log('Seeding finished.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
