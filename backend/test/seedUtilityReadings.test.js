const test = require('node:test');
const assert = require('node:assert/strict');
const { parsePeriod, planReadings } = require('../scripts/seedUtilityReadings');

test('tạo chỉ số kiểm thử cho từng phòng, nối tiếp chỉ số trước và giữ nguyên dữ liệu hiện có', () => {
    const periodStart = parsePeriod('2026-10').start;
    const contracts = [{ maPhong: 'P1' }, { maPhong: 'P1' }, { maPhong: 'P2' }];
    const readings = [
        { maPhong: 'P1', utilityType: 'ELECTRICITY', periodStart: parsePeriod('2026-09').start, currentReading: 1500 },
        { maPhong: 'P1', utilityType: 'WATER', periodStart, currentReading: 200 },
        { maPhong: 'P2', utilityType: 'ELECTRICITY', periodStart: parsePeriod('2026-11').start, currentReading: 2000 }
    ];
    const plan = planReadings(contracts, readings, periodStart, 'admin');
    assert.equal(plan.rooms, 2);
    assert.equal(plan.existing, 1);
    assert.equal(plan.blockedByLaterReading, 1);
    assert.equal(plan.planned.length, 2);
    const electric = plan.planned.find((row) => row.maPhong === 'P1');
    assert.equal(electric.previousReading, 1500);
    assert.ok(electric.currentReading > electric.previousReading);
    assert.match(electric.memo, /kiểm thử/);
    assert.deepEqual(planReadings(contracts, [...readings, ...plan.planned], periodStart, 'admin').planned, []);
});

test('kiểm tra định dạng kỳ', () => {
    assert.equal(parsePeriod('2026-10').end.toISOString(), '2026-11-01T00:00:00.000Z');
    assert.throws(() => parsePeriod('2026-13'));
    assert.throws(() => parsePeriod('1999-01'));
});
