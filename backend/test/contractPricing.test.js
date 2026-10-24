const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateContractRent } = require('../src/services/contractPricing');

const contract = { ngayBatDau: '2026-10-24', ngayKetThuc: '2027-08-24' };

test('rent uses the destination monthly fee and the full calendar duration of the contract', () => {
    assert.equal(calculateContractRent(contract, { phiNoiTruThang: 625000 }), 6250000);
    assert.equal(calculateContractRent({ ngayBatDau: '2026-12-15', ngayKetThuc: '2027-06-15' }, { phiNoiTruThang: 150000 }), 900000);
});

test('calendar pricing handles partial months and the end of February', () => {
    const room = { phiNoiTruThang: 300000 };
    for (const [start, end, expected] of [
        ['2026-01-01', '2026-01-15', 300000],
        ['2026-01-15', '2026-02-16', 600000],
        ['2026-01-31', '2026-02-28', 300000],
        ['2028-01-31', '2028-02-29', 300000]
    ]) {
        assert.equal(calculateContractRent({ ngayBatDau: start, ngayKetThuc: end }, room), expected);
    }
});

test('explicit room prices take precedence, including a zero fee', () => {
    const room = { loaiPhong: 'CO_BAN', soSinhVienToiDa: 4 };
    assert.equal(calculateContractRent(contract, { ...room, phiNoiTruThang: 250000 }), 2500000);
    assert.equal(calculateContractRent(contract, { ...room, phiNoiTruThang: 0 }), 0);
});

test('rooms without an explicit price use the existing type and capacity tariff', () => {
    assert.equal(calculateContractRent(contract, { loaiPhong: 'CO_BAN', soSinhVienToiDa: 6, phiNoiTruThang: null }), 2000000);
    assert.equal(calculateContractRent(contract, { loaiPhong: 'QUAT' }), 1200000);
    assert.equal(calculateContractRent(contract, { loaiPhong: 'DIEU_HOA' }), 2000000);
});

test('missing prices, negative prices, and invalid contract dates cannot produce a new rent', () => {
    for (const room of [{}, { phiNoiTruThang: -1 }, { phiNoiTruThang: NaN }]) {
        assert.throws(() => calculateContractRent(contract, room), { status: 409 });
    }
    for (const dates of [
        { ngayBatDau: 'invalid', ngayKetThuc: '2026-11-01' },
        { ngayBatDau: '2026-11-01', ngayKetThuc: '2026-11-01' },
        { ngayBatDau: '2026-11-02', ngayKetThuc: '2026-11-01' }
    ]) {
        assert.throws(() => calculateContractRent(dates, { phiNoiTruThang: 300000 }), { status: 409 });
    }
});
