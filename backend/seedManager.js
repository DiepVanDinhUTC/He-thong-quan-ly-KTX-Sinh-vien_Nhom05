require('dotenv').config();

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const username = process.env.TEST_MANAGER_USERNAME || 'admin.test';
const plainPassword = process.env.TEST_MANAGER_PASSWORD || 'Admin@123456';

async function main() {
    const password = await bcrypt.hash(plainPassword, 10);
    const account = await prisma.user.upsert({
        where: { username },
        update: { password, role: 'MANAGER', isActive: true },
        create: { username, password, role: 'MANAGER', isActive: true }
    });

    console.log(`Manager test account ready: ${account.username} (${account.role})`);
}

main()
    .catch((error) => {
        console.error('Could not create the manager test account:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => prisma.$disconnect());
