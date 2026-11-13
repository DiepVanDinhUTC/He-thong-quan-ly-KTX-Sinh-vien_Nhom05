require('dotenv').config();
const prisma = require('../src/config/prisma');

async function main() {
    const [bookings, students] = await Promise.all([
        prisma.meetingRoomBooking.findMany({
            where: { status: 'BOOKED', startsAt: { gt: new Date() } },
            include: { meetingRoom: true }
        }),
        prisma.sinhVien.findMany({
            where: { OR: [{ laHocVienQuanSu: true }, { user: { is: { role: 'MILITARY_STUDENT' } } }], user: { is: { isActive: true, role: { in: ['STUDENT', 'MILITARY_STUDENT'] } } } },
            select: { maSV: true }
        })
    ]);
    const time = (date) => date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    let created = 0;
    for (const booking of bookings) {
        const existing = await prisma.militaryNotification.findMany({ where: { bookingId: booking.id }, select: { maSinhVien: true } });
        const alreadyNotified = new Set(existing.map((item) => item.maSinhVien));
        const message = `${booking.title}\n${time(booking.startsAt)} – ${time(booking.endsAt)}\n${booking.meetingRoom.name} · ${booking.meetingRoom.location}\n${booking.purpose}`.slice(0, 500);
        const data = students.filter((student) => !alreadyNotified.has(student.maSV)).map((student) => ({ maSinhVien: student.maSV, bookingId: booking.id, title: 'Lịch giao ban sắp tới', message }));
        if (data.length) created += (await prisma.militaryNotification.createMany({ data })).count;
    }
    console.log(`Đã tạo ${created} thông báo cho ${bookings.length} lịch sắp tới.`);
}

main().catch((error) => { console.error('Không thể bổ sung thông báo:', error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
