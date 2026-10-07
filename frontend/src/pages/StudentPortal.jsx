import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout, userUpdated } from '../store/authSlice';
import { authApi } from '../services/authApi';
import { housingApi } from '../services/housingApi';
import { Building, DoorOpen, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';

const applicationStatus = { PENDING: 'Chờ Ban quản lý xác nhận', APPROVED: 'Đã xác nhận', REJECTED: 'Đã từ chối' };
const contractStatus = { PENDING_PAYMENT: 'Chờ thanh toán', ACTIVE: 'Có hiệu lực', CANCELLED: 'Đã hủy', PAID: 'Đã thanh toán' };
const roomTypeLabel = (type) => type === 'DIEU_HOA' ? 'Điều hòa' : type === 'QUAT' ? 'Quạt' : '—';

const StudentPortal = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const authenticatedUser = useSelector((state) => state.auth.user);
  const [student, setStudent] = useState(authenticatedUser);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const studentName = student?.hoTen || student?.username || 'Sinh viên';
  const initials = studentName.split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase();

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [profileResponse, applicationResponse] = await Promise.all([authApi.me(), housingApi.myApplications()]);
      if (profileResponse.user.role !== 'STUDENT') {
        navigate('/', { replace: true });
        return;
      }
      setStudent(profileResponse.user);
      dispatch(userUpdated(profileResponse.user));
      setApplications(applicationResponse.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tải dữ liệu sinh viên.');
      if (requestError.response?.status === 401) {
        dispatch(logout());
        navigate('/login', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [dispatch, navigate]);

  const contract = student?.currentContract;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="sticky top-0 z-10 border-b bg-white/95 px-4 py-3 shadow-sm sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3"><div className="rounded-lg bg-blue-900 p-2 text-white"><Building className="h-5 w-5" /></div><div><p className="font-bold text-blue-900">Cổng sinh viên KTX</p><p className="text-xs text-gray-500">Thông tin lưu trú cá nhân</p></div></div>
          <div className="flex items-center gap-3"><button disabled={loading} onClick={loadData} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" title="Làm mới"><RefreshCw className="h-5 w-5" /></button><div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">{initials}</div><div className="hidden sm:block"><p className="text-sm font-semibold">{studentName}</p><p className="text-xs text-gray-500">{student?.maSV || student?.username}</p></div><button onClick={() => { dispatch(logout()); navigate('/login'); }} className="rounded-lg p-2 text-red-600 hover:bg-red-50" title="Đăng xuất"><LogOut className="h-5 w-5" /></button></div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-7 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold">Xin chào, {student?.hoTen || student?.username || 'bạn'}!</h1><p className="mt-1 text-sm text-gray-500">Thông tin hiển thị được tải từ hồ sơ và dữ liệu lưu trú của bạn.</p></div><button onClick={() => navigate('/room-registration')} className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800"><DoorOpen className="h-4 w-4" />Đăng ký nội trú</button></div>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <section className="grid grid-cols-2 gap-3 rounded-2xl border bg-white p-5 shadow-sm sm:grid-cols-3 lg:grid-cols-6">
          {[['Mã sinh viên', student?.maSV], ['Lớp', student?.lop], ['Khoa', student?.khoa], ['Email', student?.email], ['Điện thoại', student?.phone], ['Trạng thái nội trú', student?.trangThaiNoiTru]].map(([label, value]) => <div key={label} className="min-w-0"><p className="text-xs text-gray-500">{label}</p><p title={value || ''} className="mt-1 truncate text-sm font-semibold">{value || '—'}</p></div>)}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b p-5"><ShieldCheck className="h-6 w-6 text-blue-700" /><div><h2 className="font-bold">Hợp đồng lưu trú</h2><p className="text-xs text-gray-500">Đồng bộ từ hồ sơ hợp đồng trong database</p></div></div>
            {loading ? <p className="p-6 text-sm text-gray-500">Đang tải...</p> : contract ? <div className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-3"><div><p className="text-xs text-gray-500">Mã hợp đồng</p><p className="font-semibold">{contract.maHopDong}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${contract.trangThai === 'PENDING_PAYMENT' ? 'bg-amber-100 text-amber-800' : contract.trangThai === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{contractStatus[contract.trangThai] || contract.trangThai}</span></div>
              <div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-gray-500">Phòng</p><p className="mt-1 font-semibold">{contract.soPhong || contract.maPhong} · {roomTypeLabel(contract.loaiPhong)}</p></div><div><p className="text-gray-500">Tổng tiền</p><p className="mt-1 font-semibold">{Number(contract.tongTien).toLocaleString('vi-VN')} đ</p></div><div><p className="text-gray-500">Ngày bắt đầu</p><p className="mt-1 font-semibold">{new Date(contract.ngayBatDau).toLocaleDateString('vi-VN')}</p></div><div><p className="text-gray-500">Ngày kết thúc</p><p className="mt-1 font-semibold">{new Date(contract.ngayKetThuc).toLocaleDateString('vi-VN')}</p></div></div>
            </div> : <p className="p-6 text-sm text-gray-500">Bạn chưa có hợp đồng đang chờ thanh toán hoặc còn hiệu lực.</p>}
          </article>

          <article className="rounded-2xl border bg-white shadow-sm">
            <div className="border-b p-5"><h2 className="font-bold">Đơn đăng ký nội trú</h2><p className="text-xs text-gray-500">Nguyện vọng và trạng thái xử lý</p></div>
            {loading ? <p className="p-6 text-sm text-gray-500">Đang tải...</p> : applications.length ? <div className="divide-y px-5">{applications.map((application) => <div key={application.maDangKy} className="flex items-center justify-between gap-3 py-4">
              <div><p className="font-semibold">Phòng {roomTypeLabel(application.loaiPhongYeuCau)}</p><p className="mt-1 text-xs text-gray-500">{application.maDangKy} · {new Date(application.ngayDangKy).toLocaleDateString('vi-VN')}</p></div><span className={`rounded-full px-3 py-1 text-center text-xs font-semibold ${application.trangThai === 'PENDING' ? 'bg-amber-100 text-amber-800' : application.trangThai === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{applicationStatus[application.trangThai] || application.trangThai}</span>
            </div>)}</div> : <p className="p-6 text-sm text-gray-500">Bạn chưa gửi nguyện vọng. Chọn loại phòng để bắt đầu đăng ký.</p>}
          </article>
        </section>
      </main>
    </div>
  );
};

export default StudentPortal;
