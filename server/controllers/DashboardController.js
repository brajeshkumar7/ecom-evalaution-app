// /server/controllers/DashboardController.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, formatISO } = require('date-fns');

// Helper to get bucket start and end dates by type
function getBucketStartEnd(date, bucket) {
    switch (bucket) {
        case 'week':
            return { start: startOfWeek(date, { weekStartsOn: 1 }), end: endOfWeek(date, { weekStartsOn: 1 }) };
        case 'month':
            return { start: startOfMonth(date), end: endOfMonth(date) };
        case 'day':
        default:
            return { start: startOfDay(date), end: endOfDay(date) };
    }
}

// Generate array of buckets between start and end dates inclusive
function generateBuckets(startDate, endDate, bucket) {
    const buckets = [];
    let currentDate = startDate;

    while (currentDate <= endDate) {
        const { start, end } = getBucketStartEnd(currentDate, bucket);
        buckets.push({ start, end });
        // Increment currentDate by one bucket unit
        switch (bucket) {
            case 'week':
                currentDate = new Date(end.getTime() + 1); // day after current end
                break;
            case 'month':
                currentDate = new Date(end.getFullYear(), end.getMonth() + 1, 1);
                break;
            case 'day':
            default:
                currentDate = new Date(end.getTime() + 1);
                break;
        }
    }
    return buckets;
}

// Format date to YYYY-MM-DD for response
function formatDate(date) {
    return formatISO(date, { representation: 'date' });
}

// Controller function for GET /dashboard/products
async function getProductTrends(req, res) {
    try {
        const { startDate, endDate, bucket = 'day' } = req.query;

        // Set default date range - last 7 days if not provided
        const start = startDate ? parseISO(startDate) : new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
        const end = endDate ? parseISO(endDate) : new Date();

        // Generate bucket ranges for grouping
        const buckets = generateBuckets(startOfDay(start), endOfDay(end), bucket);

        // Query all product trend data within range
        const trends = await prisma.productTrend.findMany({
            where: {
                trendDate: {
                    gte: startOfDay(start),
                    lte: endOfDay(end)
                }
            },
            orderBy: {
                trendDate: 'asc'
            }
        });

        // Prepare response buckets with zeroed counters
        const groupedData = buckets.map(({ start, end }) => ({
            startDate: formatDate(start),
            endDate: formatDate(end),
            productsAdded: 0,
            productsRemoved: 0,
            totalProducts: 0 // Will calculate below
        }));

        // Build an index mapping bucket by startDate string for quick aggregation
        const bucketMap = {};
        groupedData.forEach(bucket => {
            bucketMap[bucket.startDate] = bucket;
        });

        // Aggregate productsAdded and productsRemoved per bucket
        trends.forEach(trend => {
            // Find which bucket this trendDate belongs to
            const trendDate = trend.trendDate;
            for (const bucket of buckets) {
                if (trendDate >= bucket.start && trendDate <= bucket.end) {
                    const bucketKey = formatDate(bucket.start);
                    if (trend.action === 'added') {
                        bucketMap[bucketKey].productsAdded += trend.count;
                    } else if (trend.action === 'removed') {
                        bucketMap[bucketKey].productsRemoved += trend.count;
                    }
                    break;
                }
            }
        });

        // To calculate totalProducts for each bucket, we do a running total of added - removed
        // Starting with total products before start date (if any)
        // Get total products count before start date
        // Assuming you have a "Product" table to count all active products before start date
        const totalBeforeStart = await prisma.product.count({
            where: {
                createdAt: { lt: startOfDay(start) },
                // Assuming soft-delete or deactivation tracked, e.g., deletedAt is null
                deletedAt: null,
            }
        });

        let runningTotal = totalBeforeStart;

        groupedData.forEach(bucket => {
            runningTotal += bucket.productsAdded - bucket.productsRemoved;
            bucket.totalProducts = runningTotal;
        });

        // Total current products as latest runningTotal (or count all active products)
        const currentTotal = runningTotal;

        return res.json({
            currentTotal,
            trend: groupedData
        });

    } catch (error) {
        console.error("Error in getProductTrends:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

// Controller function for GET /dashboard/visitors
async function getVisitorStats(req, res) {
    try {
        const { startDate, endDate, bucket = 'day' } = req.query;

        const start = startDate ? parseISO(startDate) : new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
        const end = endDate ? parseISO(endDate) : new Date();

        // Generate bucket ranges
        const buckets = generateBuckets(startOfDay(start), endOfDay(end), bucket);

        // Query all visitor logs in range
        const visits = await prisma.visitorLog.findMany({
            where: {
                visitDate: {
                    gte: startOfDay(start),
                    lte: endOfDay(end)
                }
            },
            orderBy: {
                visitDate: 'asc',
            }
        });

        // Initialize bucket data
        const groupedData = buckets.map(({ start, end }) => ({
            startDate: formatDate(start),
            endDate: formatDate(end),
            visitors: 0
        }));

        const bucketMap = {};
        groupedData.forEach(bucket => {
            bucketMap[bucket.startDate] = bucket;
        });

        // For visitor count, count unique sessionId per bucket to avoid duplicates
        // Aggregate visits per bucket with sessionId deduplication
        // To optimize, group visits by bucket and sessionId

        // Map bucketStartDate => Set of sessionIds counted
        const bucketVisitorSessions = {};
        groupedData.forEach(bucket => {
            bucketVisitorSessions[bucket.startDate] = new Set();
        });

        visits.forEach(visit => {
            const visitDate = visit.visitDate;
            for (const bucket of buckets) {
                if (visitDate >= bucket.start && visitDate <= bucket.end) {
                    const bucketKey = formatDate(bucket.start);
                    bucketVisitorSessions[bucketKey].add(visit.sessionId);
                    break;
                }
            }
        });

        // Assign unique visitor counts to each bucket
        Object.entries(bucketVisitorSessions).forEach(([bucketKey, sessionSet]) => {
            bucketMap[bucketKey].visitors = sessionSet.size;
        });

        // Calculate totalVisitors as unique sessionIds over entire period
        const uniqueVisitors = new Set(visits.map(v => v.sessionId));
        const totalVisitors = uniqueVisitors.size;

        return res.json({
            totalVisitors,
            visitorsByBucket: groupedData
        });
    } catch (error) {
        console.error("Error in getVisitorStats:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports = {
    getProductTrends,
    getVisitorStats
};
