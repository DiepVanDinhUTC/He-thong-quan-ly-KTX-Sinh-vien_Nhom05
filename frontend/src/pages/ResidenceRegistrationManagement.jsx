/* eslint-disable react/prop-types */
import React, { useMemo, useState } from 'react';
import {
  Check, CheckCircle2, ChevronDown, ClipboardList, Search, Users, X
} from 'lucide-react';

const INITIAL_STUDENTS = [
  { id: 'SV001', name: 'Nguyễn Văn A', status: 'NOT_REGISTERED' },
  { id: 'SV002', name: 'Trần Văn B', status: 'NOT_REGISTERED' },
  { id: 'SV003', name: 'Lê Văn C', status: 'NOT_REGISTERED' },
  { id: 'SV004', name: 'Phạm Văn D', status: 'NOT_REGISTERED' },
  { id: 'SV005', name: 'Hoàng Văn E', status: 'NOT_REGISTERED' },
];

const STATUS_OPTIONS = [
  { value: 'NOT_REGISTERED', label: 'Chưa đăng ký', style: 'bg-slate-100 text-slate-700' },
  { value: 'PENDING', label: 'Đang chờ xử lý', style: 'bg-amber-100 text-amber-800' },
  { value: 'NEEDS_INFO', label: 'Cần bổ sung hồ sơ', style: 'bg-orange-100 text-orange-800' },
  { value: 'SUCCESS', label: 'Đã đăng ký thành công', style: 'bg-emerald-100 text-emerald-800' },
];

const statusDetails = Object.fromEntries(STATUS_OPTIONS.map((status) => [status.value, status]));

const ResidenceRegistrationManagement = () => {
  const [students, setStudents] = useState(INITIAL_STUDENTS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(['SV001', 'SV002', 'SV003']);
  const [targetStatus, setTargetStatus] = useState('PENDING');
  const [notice, setNotice] = useState('');

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    return students.filter((student) => (
      (statusFilter === 'ALL' || student.status === statusFilter)
      && `${student.name} ${student.id}`.toLocaleLowerCase('vi').includes(query)
    ));
  }, [students, search, statusFilter]);

  const counts = useMemo(() => students.reduce((summary, student) => {
    summary[student.status] = (summary[student.status] || 0) + 1;
    return summary;
  }, {}), [students]);

  const toggleStudent = (studentId) => {
    setSelectedIds((current) => current.includes(studentId)
      ? current.filter((id) => id !== studentId)
      : [...current, studentId]);
    setNotice('');
  };

  const toggleAll = () => {
    const studentIds = students.map((student) => student.id);
    const allStudentsSelected = studentIds.length > 0 && studentIds.every((id) => selectedIds.includes(id));
    setSelectedIds((current) => allStudentsSelected
      ? current.filter((id) => !studentIds.includes(id))
      : [...new Set([...current, ...studentIds])]);
    setNotice('');
  };

  const applyStatus = () => {
    if (!selectedIds.length) return;
    setStudents((current) => current.map((student) => (
      selectedIds.includes(student.id) ? { ...student, status: targetStatus } : student
    )));
    setNotice(`Đã cập nhật trạng thái cho ${selectedIds.length} sinh viên.`);
    setDialogOpen(false);
  };

  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Quản lý hồ sơ đăng ký tạm trú</h2>
        <p className="mt-1 text-sm text-slate-500">Theo dõi tiến độ đăng ký tạm trú của sinh viên theo từng đợt. Dữ liệu hiện tại là dữ liệu mẫu trên giao diện.</p>
      </div>
      <button type="button" onClick={() => { setSelectedIds(['SV001', 'SV002', 'SV003']); setDialogOpen(true); setNotice(''); }} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">
        <ClipboardList className="h-4 w-4" />Cập nhật trạng thái
      </button>
    </div>

    {notice && <div role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4 shrink-0" />{notice}</div>}

    <section aria-label="Thống kê hồ sơ DKTT" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <SummaryCard label="Tổng sinh viên" value={students.length} icon={<Users className="h-5 w-5" />} />
      {STATUS_OPTIONS.map((status) => <SummaryCard key={status.value} label={status.label} value={counts[status.value] || 0} />)}
    </section>

    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
        <div>
          <h3 className="font-semibold text-slate-900">Đợt DKTT-001</h3>
          <p className="mt-1 text-sm text-slate-500">Danh sách sinh viên và tình trạng hồ sơ đăng ký tạm trú.</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{students.length} sinh viên</span>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-slate-200 p-4">
        <label className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input aria-label="Tìm sinh viên DKTT" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên hoặc mã sinh viên..." className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        </label>
        <select aria-label="Lọc theo trạng thái DKTT" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500">
          <option value="ALL">Tất cả trạng thái</option>
          {STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="px-5 py-3">Sinh viên</th><th className="px-5 py-3">Mã sinh viên</th><th className="px-5 py-3">Trạng thái DKTT</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStudents.map((student) => <tr key={student.id} className="hover:bg-slate-50/70">
              <td className="px-5 py-4 font-medium text-slate-800">{student.name}</td>
              <td className="px-5 py-4 text-slate-600">{student.id}</td>
              <td className="px-5 py-4"><StatusBadge status={student.status} /></td>
            </tr>)}
            {!filteredStudents.length && <tr><td colSpan="3" className="px-5 py-10 text-center text-slate-500">Không tìm thấy hồ sơ phù hợp.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>

    {dialogOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialogOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="dktt-dialog-title" className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div><h3 id="dktt-dialog-title" className="text-lg font-bold text-slate-900">Đợt DKTT-001</h3><p className="mt-1 text-sm text-slate-500">Chọn sinh viên và cập nhật trạng thái hồ sơ.</p></div>
          <button type="button" aria-label="Đóng" onClick={() => setDialogOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </header>
        <div className="overflow-y-auto px-5">
          <label className="flex cursor-pointer items-center gap-3 border-b border-slate-200 py-4 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={students.length > 0 && students.every((student) => selectedIds.includes(student.id))} onChange={toggleAll} className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600" />
            Chọn tất cả sinh viên
            <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{selectedIds.length} sinh viên được chọn</span>
          </label>
          <ul className="divide-y divide-slate-100">
            {students.map((student) => <li key={student.id}>
              <label className="flex cursor-pointer items-center gap-3 py-3.5">
                <input type="checkbox" checked={selectedIds.includes(student.id)} onChange={() => toggleStudent(student.id)} className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600" />
                <span className="min-w-0 flex-1"><span className="block font-semibold text-slate-800">{student.name}</span><span className="mt-0.5 block text-xs text-slate-500">{student.id}</span></span>
                <StatusBadge status={student.status} />
              </label>
            </li>)}
          </ul>
        </div>
        <footer className="space-y-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <label className="block text-sm font-semibold text-slate-700">Chuyển trạng thái thành
            <span className="relative mt-2 block">
              <select value={targetStatus} onChange={(event) => setTargetStatus(event.target.value)} className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-3 pr-10 text-sm font-normal text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                {STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </span>
          </label>
          <button type="button" disabled={!selectedIds.length} onClick={applyStatus} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
            <Check className="h-4 w-4" />Áp dụng cho {selectedIds.length} sinh viên
          </button>
        </footer>
      </section>
    </div>}
  </div>;
};

const SummaryCard = ({ label, value, icon }) => <article className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
  <div><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value}</p></div>
  {icon && <span className="rounded-lg bg-blue-50 p-2.5 text-blue-700">{icon}</span>}
</article>;

const StatusBadge = ({ status }) => {
  const details = statusDetails[status];
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${details.style}`}>{details.label}</span>;
};

export default ResidenceRegistrationManagement;
