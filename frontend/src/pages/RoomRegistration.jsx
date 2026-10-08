import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowLeft, Building, CheckCircle2, Fan, Wind } from 'lucide-react';
import { authApi } from '../services/authApi';
import { housingApi } from '../services/housingApi';

const roomTypes = [
  { value: 'QUAT', label: 'Phòng quạt', detail: 'Phòng tiêu chuẩn sử dụng quạt trần.', icon: Fan },
  { value: 'DIEU_HOA', label: 'Phòng điều hòa', detail: 'Phòng có trang bị điều hòa.', icon: Wind },
];

const RoomRegistration = () => {
  const navigate = useNavigate();
  const authenticatedUser = useSelector((state) => state.auth.user);
  const [student, setStudent] = useState(authenticatedUser);
  const [applications, setApplications] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileResponse, applicationResponse] = await Promise.all([authApi.me(), housingApi.myApplications()]);
      setStudent(profileResponse.user);
      setApplications(applicationResponse.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tải hồ sơ hoặc đơn đăng ký.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const chooseRoomType = async (type) => {
    setSelectedType(type);
    setSelectedRoom('');
    setRooms([]);
    setError('');
    setLoadingRooms(true);
    try {
      const response = await housingApi.availableRooms(type);
      setRooms(response.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tải danh sách phòng.');
    } finally {
      setLoadingRooms(false);
    }
  };

  const submitRegistration = async (event) => {
    event.preventDefault();
    if (!selectedType || !selectedRoom) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const response = await housingApi.apply(selectedType, selectedRoom);
      setSuccess(`Đã gửi đơn ${response.data.maDangKy} với phòng mong muốn ${selectedRoom}. Đơn đang chờ Ban quản lý xác nhận.`);
      setSelectedType('');
      setSelectedRoom('');
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể gửi đơn đăng ký.');
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabel = { PENDING: 'Chờ xác nhận', APPROVED: 'Đã xác nhận', REJECTED: 'Đã từ chối' };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="sticky top-0 z-10 border-b bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <button onClick={() => navigate('/student-portal')} className="rounded-full p-2 text-gray-500 hover:bg-gray-100" aria-label="Quay lại"><ArrowLeft className="h-5 w-5" /></button>
          <Building className="h-6 w-6 text-blue-800" />
          <h1 className="text-lg font-bold">Đăng ký nội trú KTX</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Gửi nguyện vọng loại phòng</h2>
          <p className="mt-1 text-sm text-gray-500">Thông tin sinh viên được lấy từ hồ sơ đã đăng nhập. Ban quản lý sẽ chọn phòng và xác nhận đơn.</p>
          <div className="mt-5 grid grid-cols-1 gap-3 rounded-xl bg-blue-50 p-4 text-sm sm:grid-cols-2">
            <p><span className="text-gray-500">Sinh viên:</span> <strong>{student?.hoTen || student?.username || 'Đang tải...'}</strong></p>
            <p><span className="text-gray-500">Mã sinh viên:</span> <strong>{student?.maSV || '—'}</strong></p>
            <p><span className="text-gray-500">Lớp:</span> <strong>{student?.lop || '—'}</strong></p>
            <p><span className="text-gray-500">Khoa:</span> <strong>{student?.khoa || '—'}</strong></p>
          </div>

          <form onSubmit={submitRegistration}>
            <fieldset className="mt-6" disabled={loading || submitting || applications.some((item) => item.trangThai === 'PENDING') || Boolean(student?.maPhong)}>
              <legend className="mb-3 font-semibold">Chọn nguyện vọng</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                {roomTypes.map(({ value, label, detail, icon: Icon }) => (
                  <button type="button" key={value} onClick={() => chooseRoomType(value)} className={`rounded-2xl border-2 p-5 text-left transition ${selectedType === value ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                    <div className="flex items-start gap-3"><Icon className="mt-1 h-6 w-6 text-blue-700" /><div><p className="font-bold">{label}</p><p className="mt-1 text-sm text-gray-500">{detail}</p></div>{selectedType === value && <CheckCircle2 className="ml-auto h-5 w-5 text-blue-600" />}</div>
                  </button>
                ))}
              </div>
              {selectedType && <div className="mt-6">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><h3 className="font-semibold">Chọn phòng mong muốn</h3><p className="text-sm text-gray-500">Các phòng bên dưới được tải trực tiếp từ danh sách phòng hiện có.</p></div>{loadingRooms && <span className="text-sm text-blue-700">Đang tải phòng...</span>}</div>
                {!loadingRooms && rooms.length === 0 ? <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Hiện không có phòng {selectedType === 'DIEU_HOA' ? 'điều hòa' : 'quạt'} còn chỗ.</p> : <div className="grid gap-3 sm:grid-cols-2">
                  {rooms.map((room) => <button type="button" key={room.maPhong} onClick={() => setSelectedRoom(room.maPhong)} className={`rounded-xl border-2 p-4 text-left transition ${selectedRoom === room.maPhong ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100' : 'border-gray-200 hover:border-blue-300'}`}>
                    <div className="flex items-start justify-between gap-2"><div><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Phòng {room.loaiPhong === 'DIEU_HOA' ? 'điều hòa' : 'quạt'}</p><p className="mt-1 text-xl font-bold text-gray-900">{room.soPhong || room.maPhong}</p><p className="mt-1 text-xs text-gray-500">Mã phòng: {room.maPhong}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${selectedRoom === room.maPhong ? 'bg-blue-700 text-white' : 'bg-green-100 text-green-800'}`}>{selectedRoom === room.maPhong ? 'Đã chọn' : 'Còn chỗ'}</span></div>
                    <div className="mt-4"><div className="mb-1 flex justify-between text-xs text-gray-500"><span>Sức chứa</span><span>{room.soSinhVienHienTai}/{room.soSinhVienToiDa} sinh viên</span></div><div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, (room.soSinhVienHienTai / room.soSinhVienToiDa) * 100)}%` }} /></div><p className="mt-2 text-xs font-medium text-green-700">Còn {room.choConTrong} chỗ</p></div>
                  </button>)}
                </div>}
              </div>}
            </fieldset>
            {student?.maPhong && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Hồ sơ đang có phòng {student.soPhong || student.maPhong}; bạn không thể gửi nguyện vọng mới.</p>}
            {applications.some((item) => item.trangThai === 'PENDING') && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Bạn đang có đơn chờ xác nhận.</p>}
            {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {success && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</p>}
            <button type="submit" disabled={!selectedType || !selectedRoom || loadingRooms || loading || submitting || applications.some((item) => item.trangThai === 'PENDING') || Boolean(student?.maPhong)} className="mt-6 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? 'Đang gửi...' : 'Gửi đơn đăng ký'}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Đơn đăng ký của tôi</h2>
          {loading ? <p className="mt-4 text-sm text-gray-500">Đang tải...</p> : applications.length === 0 ? <p className="mt-4 text-sm text-gray-500">Bạn chưa gửi đơn đăng ký nào.</p> : (
            <div className="mt-4 divide-y">
              {applications.map((application) => <div key={application.maDangKy} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div><p className="font-semibold">{application.loaiPhongYeuCau === 'DIEU_HOA' ? 'Phòng điều hòa' : 'Phòng quạt'} · Nguyện vọng {application.phongYeuCau?.soPhong || application.maPhongYeuCau || '—'}</p><p className="text-xs text-gray-500">Mã đơn {application.maDangKy} · {new Date(application.ngayDangKy).toLocaleDateString('vi-VN')}</p></div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${application.trangThai === 'PENDING' ? 'bg-amber-100 text-amber-800' : application.trangThai === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{statusLabel[application.trangThai] || application.trangThai}</span>
              </div>)}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default RoomRegistration;
