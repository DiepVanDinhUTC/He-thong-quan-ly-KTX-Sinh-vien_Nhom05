const NO_PRIORITY_VALUES = new Set(['', '0', 'không', 'khong', 'null']);

const isPriorityStudent = (student) => {
    const value = String(student?.dienUuTien ?? '').trim().toLocaleLowerCase('vi');
    return !NO_PRIORITY_VALUES.has(value);
};

// A stable sort preserves the existing order within each priority group.
const sortByStudentPriority = (items, getStudent = (item) => item) => [...items].sort(
    (left, right) => Number(isPriorityStudent(getStudent(right))) - Number(isPriorityStudent(getStudent(left)))
);

module.exports = { isPriorityStudent, sortByStudentPriority };
