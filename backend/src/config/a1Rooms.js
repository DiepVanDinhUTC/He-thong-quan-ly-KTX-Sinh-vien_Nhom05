const A1_MILITARY_ROOM_NUMBERS = Object.freeze([
    ...Array.from({ length: 5 }, (_, index) => String(103 + index)),
    ...Array.from({ length: 9 }, (_, index) => String(201 + index)),
    ...Array.from({ length: 9 }, (_, index) => String(301 + index)),
    ...Array.from({ length: 9 }, (_, index) => String(401 + index))
]);

const militaryRoomNumbers = new Set(A1_MILITARY_ROOM_NUMBERS);

const isA1MilitaryRoom = (room) => room.maToaNha === 'A1'
    && militaryRoomNumbers.has(String(room.soPhong).trim());

module.exports = { A1_MILITARY_ROOM_NUMBERS, isA1MilitaryRoom };
