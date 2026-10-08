import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BedDouble, Building, CalendarDays, DoorOpen, Fan, Wind } from 'lucide-react';
import { authApi } from '../services/authApi';
import { useDispatch, useSelector } from 'react-redux';
import { userUpdated } from '../store/authSlice';

const formatDate = (value) => value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa cập nhật';

const MyRoom = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const cachedUser = useSelector((state) => state.auth.user);
  const [student, setStudent] = useState(cachedUser);
  const [loading, setLoading] = useState(!cachedUser);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    authApi.me().then((response) => {
      if (!active) return;
      setStudent(response.user);
      dispatch(userUpdated(response.user));
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.message || 'Không thể tải thông tin phòng.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [dispatch]);

  const room = student?.currentContract;
  const members = room?.thanhVien || [];
  const isPending = room?.trangThai === 'PENDING_PAYMENT';
  const RoomTypeIcon = room?.loaiPhong === 'DIEU_HOA' ? Wind : Fan;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 text-gray-800 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 flex items-center gap-3">
          <span className="rounded-xl bg-blue-100 p-3 text-blue-800"><BedDouble className="h-6 w-6" /></span>
          <div><h1 className="text-2xl font-bold">Phòng của tôi</h1><p className="mt-1 text-sm text-gray-500">Thông tin phòng và thời gian lưu trú</p></div>
        </header>
        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {loading ? <div className="rounded-2xl border bg-white p-8 text-center text-sm text-gray-500">Đang tải thông tin phòng...</div> : room ? <section className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
            <div className="flex items-center gap-3"><span className="rounded-xl bg-blue-50 p-3 text-blue-700"><Building className="h-5 w-5" /></span><div><p className="text-sm text-gray-500">Phòng lưu trú</p><p className="mt-1 text-xl font-bold">{room.soPhong || room.maPhong || 'Chưa cập nhật'}</p></div></div>
            <span className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700"><RoomTypeIcon className="h-4 w-4" />{room.loaiPhong === 'DIEU_HOA' ? 'Điều hòa' : room.loaiPhong === 'QUAT' ? 'Quạt' : 'Chưa cập nhật loại phòng'}</span>
          </div>
          <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-gray-800"><CalendarDays className="h-4 w-4 text-blue-700" />{isPending ? 'Thời gian lưu trú dự kiến' : 'Thời gian hiệu lực trong phòng'}</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-500">Từ ngày</p><p className="mt-1 font-semibold">{formatDate(room.ngayBatDau)}</p></div>
            <div className="rounded-xl bg-gray-50 p-4"><p className="text-xs text-gray-500">Đến ngày</p><p className="mt-1 font-semibold">{formatDate(room.ngayKetThuc)}</p></div>
          </div>
          <div className="mt-7 border-t pt-5">
            <div className="mb-3 flex items-center justify-between"><div><h2 className="font-bold">Thành viên trong phòng</h2><p className="mt-1 text-xs text-gray-500">Thông tin sinh viên đang có đăng ký lưu trú tại phòng này</p></div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">{members.length}</span></div>
            {members.length ? <div className="overflow-hidden rounded-xl border">
              <div className="hidden grid-cols-[1fr_1fr_0.7fr] gap-3 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-500 sm:grid"><span>Họ và tên</span><span>Mã sinh viên</span><span>Niên khóa</span></div>
              <div className="divide-y">{members.map((member) => <div key={member.maHopDong || member.maSV} className="grid gap-1 px-4 py-3 sm:grid-cols-[1fr_1fr_0.7fr] sm:items-center sm:gap-3">
                <div><span className="text-[11px] font-medium text-gray-400 sm:hidden">Họ và tên · </span><span className="text-sm font-semibold">{member.hoTen || 'Chưa cập nhật'}</span></div>
                <div><span className="text-[11px] font-medium text-gray-400 sm:hidden">Mã sinh viên · </span><span className="text-sm text-gray-700">{member.maSV || 'Chưa cập nhật'}</span></div>
                <div><span className="text-[11px] font-medium text-gray-400 sm:hidden">Niên khóa · </span><span className="text-sm text-gray-700">{member.nienKhoa || 'Chưa cập nhật'}</span></div>
              </div>)}</div>
            </div> : <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">Chưa có dữ liệu thành viên trong phòng.</p>}
          </div>
        </section> : <section className="rounded-2xl border bg-white p-8 text-center shadow-sm">
          <DoorOpen className="mx-auto h-9 w-9 text-gray-400" />
          <h2 className="mt-3 font-semibold">Bạn chưa có phòng lưu trú</h2>
          <p className="mt-1 text-sm text-gray-500">Đăng ký nội trú để gửi nguyện vọng phòng.</p>
          <button type="button" onClick={() => navigate('/room-registration')} className="mt-4 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">Đăng ký nội trú</button>
        </section>}
      </div>
    </div>
  );
};

export default MyRoom;
