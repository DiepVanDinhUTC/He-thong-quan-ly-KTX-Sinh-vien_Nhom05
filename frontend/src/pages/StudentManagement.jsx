import React, { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { useSelector } from 'react-redux';
import { studentApi } from '../services/studentApi';
import { studentRecordPermissions } from '../utils/accessControl';
import {
  Search,
  Filter,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';

const StudentManagement = ({ embedded = false }) => {
  const role = useSelector((state) => state.auth.user?.role);
  const isArchivist = role === 'ARCHIVIST';
  const canCreate = studentRecordPermissions.create.includes(role);
  const canUpdate = studentRecordPermissions.update.includes(role);
  const canDelete = studentRecordPermissions.delete.includes(role);
  const canSync = studentRecordPermissions.sync.includes(role);
  const isReadOnly = !canCreate && !canUpdate && !canDelete && !canSync;
  const emptyForm = {
    maSV: '', hoTen: '', ngaySinh: '', gioiTinh: 'true', lop: '', nienKhoa: 'K64', khoa: '',
    cccd: '', phone: '', email: '', dienUuTien: '',
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncMessage, setSyncMessage] = useState('');
  const [formMode, setFormMode] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const response = await studentApi.list();
      setStudents(Array.isArray(response.data) ? response.data : []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách sinh viên. Hãy đăng nhập bằng tài khoản quản lý.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStudents(); }, []);

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('vi');
    if (!query) return students;
    return students.filter((student) => [
      student.maSV,
      student.hoTen,
      student.lop,
      student.khoa,
      student.phone,
      student.email,
      student.cccd,
      student.hopDongs?.[0]?.phong?.soPhong,
    ].filter(Boolean).join(' ').toLocaleLowerCase('vi').includes(query));
  }, [students, searchQuery]);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMessage('');
    try {
      const response = await studentApi.sync();
      await loadStudents();
      setSyncMessage(response.message || 'Đã đồng bộ dữ liệu sinh viên từ trường thành công.');
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể đồng bộ dữ liệu sinh viên.');
    } finally {
      setIsSyncing(false);
    }
  };

  const openForm = (mode, student = null) => {
    setFormMode(mode);
    setFormError('');
    setForm(student ? {
      maSV: student.maSV || '',
      hoTen: student.hoTen || '',
      ngaySinh: student.ngaySinh ? new Date(student.ngaySinh).toISOString().slice(0, 10) : '',
      gioiTinh: String(Boolean(student.gioiTinh)),
      lop: student.lop || '',
      nienKhoa: student.nienKhoa || 'K64',
      khoa: student.khoa || '',
      cccd: student.cccd || '',
      phone: student.phone || '',
      email: student.email || '',
      dienUuTien: student.dienUuTien || '',
    } : { ...emptyForm });
  };

  const viewStudent = async (student) => {
    try {
      const response = await studentApi.get(student.maSV);
      openForm('view', response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải chi tiết hồ sơ sinh viên.');
    }
  };

  const submitStudent = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setFormError('');
    const payload = {
      ...form,
      ngaySinh: new Date(`${form.ngaySinh}T00:00:00.000Z`).toISOString(),
      gioiTinh: form.gioiTinh === 'true',
      dienUuTien: form.dienUuTien || null,
    };
    try {
      if (formMode === 'create') {
        await studentApi.create(payload);
      } else {
        await studentApi.update(form.maSV, payload);
      }
      setFormMode(null);
      await loadStudents();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Không thể lưu hồ sơ sinh viên.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteStudent = async (student) => {
    if (!window.confirm(`Bạn có chắc muốn xóa hồ sơ sinh viên ${student.maSV} - ${student.hoTen}?`)) return;
    try {
      await studentApi.remove(student.maSV);
      await loadStudents();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể xóa hồ sơ sinh viên.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CHUA_DANG_KY':
      case 'Chưa đăng ký':
        return <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">Chưa đăng ký</span>;
      case 'CHO_THANH_TOAN':
        return <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">Chờ thanh toán</span>;
      case 'DANG_O':
      case 'Đang lưu trú':
        return <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Đang ở</span>;
      case 'CHO_DUYET':
      case 'Chờ duyệt':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">Chờ duyệt</span>;
      case 'TAM_VANG':
      case 'Tạm vắng':
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">Tạm vắng</span>;
      case 'DA_ROI':
      case 'Đã rời KTX':
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">Đã rời KTX</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">Không rõ</span>;
    }
  };

  return (
    <AdminLayout showShell={!embedded}>
      <div className="flex flex-col">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Quản lý hồ sơ sinh viên</h1>
              <p className="mt-1 text-sm text-slate-500">{isArchivist
                ? 'Tra cứu toàn bộ hồ sơ sinh viên trong KTX và đồng bộ dữ liệu từ SIS.'
                : 'Tra cứu danh sách và thông tin lưu trú trong hệ thống KTX.'}</p>
            </div>
            {isReadOnly && <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Chế độ chỉ xem</span>}
          </div>
          {syncMessage && <div role="status" className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">{syncMessage}</div>}

          {/* Top Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex flex-1 w-full sm:w-auto gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Tìm tên, mã SV, lớp, khoa, phòng..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full bg-white shadow-sm"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
                <Filter className="w-4 h-4" />
                <span>Lọc</span>
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={loadStudents}
                disabled={loading || isSyncing}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'Đang tải...' : 'Làm mới'}</span>
              </button>
              {/* Nút Đồng bộ dữ liệu thiết kế theo tính năng API đã nêu trong dự án */}
              {canSync && <button
                onClick={handleSync}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-blue-200 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-50 shadow-sm transition-colors"
                disabled={isSyncing}
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Đang đồng bộ SIS...' : 'Đồng bộ SIS'}</span>
              </button>}
              {canCreate && <button onClick={() => openForm('create')} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors">
                <Plus className="w-4 h-4" />
                <span>Thêm thủ công</span>
              </button>}
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                    <th className="px-6 py-4">Mã SV</th>
                    <th className="px-6 py-4">Họ và tên</th>
                    <th className="px-6 py-4">Niên khóa</th>
                    <th className="px-6 py-4">Diện GDQP</th>
                    <th className="px-6 py-4">Ngày sinh</th>
                    <th className="px-6 py-4">Giới tính</th>
                    <th className="px-6 py-4">Phòng</th>
                    <th className="px-6 py-4">Số điện thoại</th>
                    <th className="px-6 py-4">Trạng thái</th>
                    <th className="px-6 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {loading && <tr><td className="px-6 py-8 text-center" colSpan="10">Đang tải...</td></tr>}
                  {!loading && error && <tr><td className="px-6 py-8 text-center text-red-600" colSpan="10">{error}</td></tr>}
                  {!loading && !error && filteredStudents.length === 0 && <tr><td className="px-6 py-8 text-center text-gray-500" colSpan="10">Không có sinh viên phù hợp.</td></tr>}
                  {!loading && !error && filteredStudents.map((student) => (
                    <tr key={student.maSV} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-blue-600">{student.maSV}</td>
                      <td className="px-6 py-4 font-semibold text-gray-800">{student.hoTen}</td>
                      <td className="px-6 py-4 text-gray-600">{student.nienKhoa || '—'}</td>
                      <td className="px-6 py-4">{student.laHocVienQuanSu
                        ? <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-800">Học viên quân sự</span>
                        : <span className="text-gray-500">Sinh viên</span>}</td>
                      <td className="px-6 py-4 text-gray-600">{student.ngaySinh ? new Date(student.ngaySinh).toLocaleDateString('vi-VN') : '—'}</td>
                      <td className="px-6 py-4 text-gray-600">{student.gioiTinh ? 'Nam' : 'Nữ'}</td>
                      <td className="px-6 py-4 text-gray-800 font-medium">{student.hopDongs?.[0]?.phong?.soPhong || '—'}</td>
                      <td className="px-6 py-4 text-gray-600">{student.phone || '—'}</td>
                      <td className="px-6 py-4">{getStatusBadge(student.trangThaiNoiTru)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => viewStudent(student)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Xem chi tiết">
                            <Eye className="w-4 h-4" />
                          </button>
                          {canUpdate && <button onClick={() => openForm('edit', student)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors" title="Chỉnh sửa">
                            <Edit className="w-4 h-4" />
                          </button>}
                          {canDelete && <button onClick={() => deleteStudent(student)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Xóa hồ sơ">
                            <Trash2 className="w-4 h-4" />
                          </button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-gray-200 text-sm text-gray-500 bg-gray-50 mt-auto">
              Hiển thị {filteredStudents.length} / {students.length} sinh viên
            </div>
          </div>
      </div>

      {formMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormMode(null); }}>
          <section className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="student-form-title">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
              <div>
                <h2 id="student-form-title" className="text-lg font-bold text-gray-800">
                  {formMode === 'create' ? 'Thêm hồ sơ sinh viên' : formMode === 'edit' ? 'Cập nhật hồ sơ sinh viên' : 'Chi tiết hồ sơ sinh viên'}
                </h2>
                <p className="mt-1 text-sm text-gray-500">Thông tin được lưu trực tiếp vào hệ thống quản lý KTX.</p>
              </div>
              <button type="button" onClick={() => setFormMode(null)} className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100" aria-label="Đóng">✕</button>
            </div>

            <form onSubmit={submitStudent} className="space-y-5 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-gray-700">Mã sinh viên
                  <input required disabled={formMode !== 'create'} value={form.maSV} onChange={(e) => setForm({ ...form, maSV: e.target.value })} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 disabled:bg-gray-100" />
                </label>
                <label className="text-sm font-medium text-gray-700">Họ và tên
                  <input required disabled={formMode === 'view'} value={form.hoTen} onChange={(e) => setForm({ ...form, hoTen: e.target.value })} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 disabled:bg-gray-100" />
                </label>
                <label className="text-sm font-medium text-gray-700">Ngày sinh
                  <input required type="date" disabled={formMode === 'view'} value={form.ngaySinh} onChange={(e) => setForm({ ...form, ngaySinh: e.target.value })} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 disabled:bg-gray-100" />
                </label>
                <label className="text-sm font-medium text-gray-700">Giới tính
                  <select disabled={formMode === 'view'} value={form.gioiTinh} onChange={(e) => setForm({ ...form, gioiTinh: e.target.value })} className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 disabled:bg-gray-100">
                    <option value="true">Nam</option><option value="false">Nữ</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-gray-700">Lớp
                  <input required disabled={formMode === 'view'} value={form.lop} onChange={(e) => setForm({ ...form, lop: e.target.value })} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 disabled:bg-gray-100" />
                </label>
                <label className="text-sm font-medium text-gray-700">Niên khóa
                  <select required disabled={formMode === 'view'} value={form.nienKhoa} onChange={(e) => setForm({ ...form, nienKhoa: e.target.value })} className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 disabled:bg-gray-100">
                    {['K62', 'K63', 'K64', 'K65', 'K66', 'K67'].map((cohort) => <option key={cohort} value={cohort}>{cohort}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium text-gray-700">Khoa
                  <input required disabled={formMode === 'view'} value={form.khoa} onChange={(e) => setForm({ ...form, khoa: e.target.value })} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 disabled:bg-gray-100" />
                </label>
                <label className="text-sm font-medium text-gray-700">CCCD
                  <input required disabled={formMode === 'view'} value={form.cccd} onChange={(e) => setForm({ ...form, cccd: e.target.value })} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 disabled:bg-gray-100" />
                </label>
                <label className="text-sm font-medium text-gray-700">Số điện thoại
                  <input required disabled={formMode === 'view'} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 disabled:bg-gray-100" />
                </label>
                <label className="text-sm font-medium text-gray-700">Email
                  <input required type="email" disabled={formMode === 'view'} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 disabled:bg-gray-100" />
                </label>

                <label className="text-sm font-medium text-gray-700 sm:col-span-2">Diện ưu tiên (nếu có)
                  <input disabled={formMode === 'view'} value={form.dienUuTien} onChange={(e) => setForm({ ...form, dienUuTien: e.target.value })} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 disabled:bg-gray-100" />
                </label>
              </div>
              {formError && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</p>}
              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button type="button" onClick={() => setFormMode(null)} className="rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50">{formMode === 'view' ? 'Đóng' : 'Hủy'}</button>
                {formMode === 'view' ? (
                  canUpdate && <button type="button" onClick={() => openForm('edit', students.find((student) => student.maSV === form.maSV))} className="rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700">Chỉnh sửa</button>
                ) : (
                  <button type="submit" disabled={isSaving} className="rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{isSaving ? 'Đang lưu...' : formMode === 'create' ? 'Tạo hồ sơ' : 'Lưu thay đổi'}</button>
                )}
              </div>
            </form>
          </section>
        </div>
      )}
    </AdminLayout>
  );
};

export default StudentManagement;
