const { PrismaClient } = require("@prisma/client");

module.exports = new PrismaClient();
const { PrismaClient } = require('@prisma/client');

// Reuse one connection pool across all backend modules (and nodemon reloads).
const prisma = globalThis.__ktxPrismaClient || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalThis.__ktxPrismaClient = prisma;
}

module.exports = prisma;
