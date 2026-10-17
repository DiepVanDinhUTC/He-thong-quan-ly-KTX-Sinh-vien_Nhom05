import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Building, DoorOpen, FileSignature, Receipt, ShieldCheck, Wrench } from 'lucide-react';

const StudentPortal = () => {
  const navigate = useNavigate();
  const student = useSelector((state) => state.auth.user);
  const studentName = student?.hoTen || student?.username || 'bạn';

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="sticky top-0 z-10 border-b bg-white/95 px-4 py-3 shadow-sm sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="rounded-lg bg-blue-900 p-2 text-white"><Building className="h-5 w-5" /></div>
          <div><p className="font-bold text-blue-900">Cổng sinh viên KTX</p><p className="text-xs text-gray-500">Thông tin và dịch vụ nội trú</p></div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
        <section className="rounded-2xl border bg-white p-6 shadow-sm sm:p-9">
          <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-blue-700">CỔNG THÔNG TIN SINH VIÊN</p>
              <h1 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">Xin chào, {studentName}!</h1>
              <p className="mt-3 max-w-2xl leading-7 text-gray-600">Cổng sinh viên KTX giúp bạn thực hiện các thủ tục lưu trú và theo dõi dịch vụ nội trú tại Đại học Giao thông Vận tải.</p>
            </div>
            <button type="button" onClick={() => navigate('/room-registration')} className="flex shrink-0 items-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800"><DoorOpen className="h-4 w-4" />Đăng ký nội trú</button>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-3"><ShieldCheck className="h-6 w-6 text-blue-700" /><div><h2 className="font-bold text-gray-900">Giới thiệu các dịch vụ</h2><p className="mt-1 text-sm text-gray-500">Chọn chức năng trong menu bên trái để tiếp tục.</p></div></div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-blue-50 p-4"><FileSignature className="h-5 w-5 text-blue-700" /><h3 className="mt-3 text-sm font-semibold">Lưu trú</h3><p className="mt-1 text-sm leading-6 text-gray-600">Đăng ký nội trú và xem thông tin phòng đang ở.</p></div>
            <div className="rounded-xl bg-emerald-50 p-4"><Receipt className="h-5 w-5 text-emerald-700" /><h3 className="mt-3 text-sm font-semibold">Tài chính</h3><p className="mt-1 text-sm leading-6 text-gray-600">Theo dõi hóa đơn và thực hiện thanh toán phí nội trú.</p></div>
            <div className="rounded-xl bg-amber-50 p-4"><Wrench className="h-5 w-5 text-amber-700" /><h3 className="mt-3 text-sm font-semibold">Hỗ trợ</h3><p className="mt-1 text-sm leading-6 text-gray-600">Gửi báo cáo khi phòng hoặc thiết bị cần sửa chữa.</p></div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default StudentPortal;
