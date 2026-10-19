require('dotenv').config();

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const username = process.env.TEST_ADMIN_USERNAME || 'admin.test';
const plainPassword = process.env.TEST_ADMIN_PASSWORD || 'Admin@123456';

async function main() {
    const password = await bcrypt.hash(plainPassword, 10);
    const account = await prisma.user.upsert({
        where: { username },
        update: { password, role: 'ADMIN', isActive: true },
        create: { username, password, role: 'ADMIN', isActive: true }
    });

    console.log(`Admin test account ready: ${account.username} (${account.role})`);
}

main()
    .catch((error) => {
        console.error('Could not create the admin test account:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => prisma.$disconnect());
