const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function logVisitor(req, res, next) {
    try {
        const sessionId = req.cookies.sessionId || req.headers['x-session-id'] || req.ip + '-' + new Date().toISOString();
        const userAgent = req.headers['user-agent'];
        const ip = req.ip;

        await prisma.visitorLog.create({
            data: {
                sessionId,
                userAgent,
                ip,
                visitDate: new Date()
            }
        });

        next();
    } catch (error) {
        console.error('Visitor logging error:', error);
        next(); // Do not block requests due to logging errors
    }
}

module.exports = logVisitor;
