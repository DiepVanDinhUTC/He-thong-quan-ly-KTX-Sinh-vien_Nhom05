import React, { useEffect, useMemo, useState } from 'react';
import Link from '../components/RoleLink';
import { Building, DoorOpen, FileSignature, Home, UserPlus, Wrench, Receipt, Settings, Search, Pencil, Check, X, ClipboardList } from 'lucide-react';
import AdminUserProfile from '../components/AdminUserProfile';
import AdminLogoutButton from '../components/AdminLogoutButton';
import { housingApi } from '../services/housingApi';

const today = () => new Date().toISOString().slice(0, 10);
const afterTenMonths = () => { const date = new Date(); date.setMonth(date.getMonth() + 10); return date.toISOString().slice(0, 10); };
const toDateInput = (value) => value ? new Date(value).toISOString().slice(0, 10) : '';
const roomTypeLabel = (type) => type === 'DIEU_HOA' ? 'Điều hòa' : 'Quạt';
const statusLabel = { PENDING: 'Chờ xác nhận', APPROVED: 'Đã xác nhận', REJECTED: 'Đã từ chối', PENDING_PAYMENT: 'Chờ thanh toán', ACTIVE: 'Có hiệu lực', PAID: 'Đã thanh toán', CANCELLED: 'Đã hủy' };

const ContractManagement = () => {
  const [tab, setTab] = useState('applications');
  const [applications, setApplications] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [approval, setApproval] = useState({ maPhong: '', ngayBatDau: today(), ngayKetThuc: afterTenMonths(), tongTien: '1200000' });
  const [editingContract, setEditingContract] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [applicationResponse, contractResponse, roomResponse] = await Promise.all([
        housingApi.applications(), housingApi.contracts(), housingApi.rooms()
      ]);
      setApplications(applicationResponse.data || []);
      setContracts(contractResponse.data || []);
      setRooms(roomResponse.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tải dữ liệu hợp đồng từ máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const selectableRooms = useMemo(() => {
    if (!selectedApplication) return [];
    return rooms.filter((room) => room.loaiPhong === selectedApplication.loaiPhongYeuCau && room.soSinhVienHienTai < room.soSinhVienToiDa);
  }, [rooms, selectedApplication]);

  const openApproval = (application) => {
    const candidates = rooms.filter((room) => room.loaiPhong === application.loaiPhongYeuCau && room.soSinhVienHienTai < room.soSinhVienToiDa);
    const selectedRoom = candidates.find((room) => room.maPhong === application.maPhongYeuCau) || candidates[0];
    setSelectedApplication(application);
    setApproval({ maPhong: selectedRoom?.maPhong || '', ngayBatDau: today(), ngayKetThuc: afterTenMonths(), tongTien: application.loaiPhongYeuCau === 'DIEU_HOA' ? '2000000' : '1200000' });
    setError('');
  };

  const confirmApplication = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await housingApi.approveApplication({ maDangKy: selectedApplication.maDangKy, ...approval, tongTien: Number(approval.tongTien) });
      setNotice(`Đã xác nhận đơn ${selectedApplication.maDangKy} và tạo hợp đồng chờ thanh toán.`);
      setSelectedApplication(null);
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể xác nhận đơn đăng ký.');
    } finally {
      setSaving(false);
    }
  };

  const rejectApplication = async (application) => {
    if (!window.confirm(`Từ chối đơn ${application.maDangKy}?`)) return;
    setSaving(true);
    setError('');
    try {
      await housingApi.rejectApplication(application.maDangKy);
      setNotice(`Đã từ chối đơn ${application.maDangKy}.`);
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể từ chối đơn.');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (contract) => setEditingContract({
    maHopDong: contract.maHopDong,
    maPhong: contract.maPhong,
    ngayBatDau: toDateInput(contract.ngayBatDau),
    ngayKetThuc: toDateInput(contract.ngayKetThuc),
    tongTien: String(contract.tongTien)
  });

  const saveContract = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await housingApi.updateContract(editingContract.maHopDong, { ...editingContract, tongTien: Number(editingContract.tongTien) });
      setNotice(`Đã cập nhật hợp đồng ${editingContract.maHopDong}.`);
      setEditingContract(null);
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể cập nhật hợp đồng.');
    } finally {
      setSaving(false);
    }
  };

  const filteredContracts = contracts.filter((contract) => `${contract.maHopDong} ${contract.sinhVien?.hoTen} ${contract.maSinhVien} ${contract.phong?.soPhong}`.toLowerCase().includes(search.toLowerCase()));
  const pendingApplications = applications.filter((application) => application.trangThai === 'PENDING');

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-800">
      <aside className="flex h-full w-64 shrink-0 flex-col bg-blue-900 text-white shadow-lg">
        <div className="flex items-center justify-center border-b border-blue-800 p-6"><Building className="mr-3 h-8 w-8" /><h1 className="text-xl font-bold">KTX GTVT</h1></div>
        <nav className="flex-1 space-y-2 px-4 py-6">
          <Link to="/" className="flex items-center rounded-lg px-4 py-3 text-blue-200 hover:bg-blue-800"><Home className="h-5 w-5" /><span className="ml-3">Trang chủ</span></Link>
          <Link to="/students" className="flex items-center rounded-lg px-4 py-3 text-blue-200 hover:bg-blue-800"><UserPlus className="h-5 w-5" /><span className="ml-3">Quản lý Sinh viên</span></Link>
          <Link to="/rooms" className="flex items-center rounded-lg px-4 py-3 text-blue-200 hover:bg-blue-800"><DoorOpen className="h-5 w-5" /><span className="ml-3">Quản lý Phòng & CSVC</span></Link>
          <Link to="/contracts" className="flex items-center rounded-lg bg-blue-800 px-4 py-3 font-medium text-white"><FileSignature className="h-5 w-5" /><span className="ml-3">Quản lý Hợp đồng</span></Link>
          <Link to="/tickets" className="flex items-center rounded-lg px-4 py-3 text-blue-200 hover:bg-blue-800"><Wrench className="h-5 w-5" /><span className="ml-3">Ticket báo hỏng</span></Link>
          <Link to="/technician" className="flex items-center rounded-lg px-4 py-3 text-blue-200 hover:bg-blue-800"><Wrench className="h-5 w-5" /><span className="ml-3">Bảng kỹ thuật</span></Link>
          <Link to="/financial-dashboard" className="flex items-center rounded-lg px-4 py-3 text-blue-200 hover:bg-blue-800"><Receipt className="h-5 w-5" /><span className="ml-3">Quản lý Hóa đơn & Điện nước</span></Link>
          <Link to="/settings" className="flex items-center rounded-lg px-4 py-3 text-blue-200 hover:bg-blue-800"><Settings className="h-5 w-5" /><span className="ml-3">Cài đặt hệ thống</span></Link>
        </nav>
        <div className="border-t border-blue-800 p-4"><AdminUserProfile /></div><AdminLogoutButton />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-white px-8 shadow-sm"><h2 className="text-xl font-semibold">Hợp đồng lưu trú</h2><button onClick={loadData} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">Làm mới</button></header>
        <main className="flex-1 overflow-auto p-4 sm:p-8">
          {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {notice && <p role="status" className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{notice}</p>}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2"><button onClick={() => setTab('applications')} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === 'applications' ? 'bg-blue-700 text-white' : 'bg-white text-gray-600'}`}>Đơn chờ xác nhận ({pendingApplications.length})</button><button onClick={() => setTab('contracts')} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === 'contracts' ? 'bg-blue-700 text-white' : 'bg-white text-gray-600'}`}>Hợp đồng ({contracts.length})</button></div>
            {tab === 'contracts' && <label className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2"><Search className="h-4 w-4 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm hợp đồng, sinh viên..." className="w-64 text-sm outline-none" /></label>}
          </div>

          <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
            {loading ? <p className="p-8 text-center text-sm text-gray-500">Đang tải dữ liệu...</p> : tab === 'applications' ? (
              <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-5 py-4">Sinh viên</th><th className="px-5 py-4">Nguyện vọng</th><th className="px-5 py-4">Ngày gửi</th><th className="px-5 py-4">Trạng thái</th><th className="px-5 py-4 text-right">Thao tác</th></tr></thead>
                <tbody className="divide-y">
                  {applications.filter((item) => item.trangThai === 'PENDING').map((application) => <tr key={application.maDangKy}>
                    <td className="px-5 py-4"><p className="font-semibold">{application.sinhVien?.hoTen || '—'}</p><p className="text-xs text-gray-500">{application.maSinhVien} · {application.maDangKy}</p></td>
                    <td className="px-5 py-4"><p>Phòng {roomTypeLabel(application.loaiPhongYeuCau)}</p><p className="mt-1 text-xs text-gray-500">Nguyện vọng: {application.phongYeuCau?.soPhong || application.maPhongYeuCau || '—'}</p></td>
                    <td className="px-5 py-4">{new Date(application.ngayDangKy).toLocaleDateString('vi-VN')}</td>
                    <td className="px-5 py-4"><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">{statusLabel[application.trangThai]}</span></td>
                    <td className="px-5 py-4 text-right"><div className="flex justify-end gap-2"><button disabled={saving} onClick={() => openApproval(application)} className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50">Xác nhận & lập hợp đồng</button><button disabled={saving} onClick={() => rejectApplication(application)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">Từ chối</button></div></td>
                  </tr>)}
                  {pendingApplications.length === 0 && <tr><td colSpan="5" className="px-5 py-12 text-center text-gray-500"><ClipboardList className="mx-auto mb-2 h-8 w-8 text-gray-300" />Không có đơn chờ xác nhận.</td></tr>}
                </tbody>
              </table></div>
            ) : (
              <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-5 py-4">Mã hợp đồng</th><th className="px-5 py-4">Sinh viên</th><th className="px-5 py-4">Phòng</th><th className="px-5 py-4">Thời hạn</th><th className="px-5 py-4">Tổng tiền</th><th className="px-5 py-4">Trạng thái</th><th className="px-5 py-4"></th></tr></thead>
                <tbody className="divide-y">
                  {filteredContracts.map((contract) => <tr key={contract.maHopDong}>
                    <td className="px-5 py-4 font-semibold text-blue-700">{contract.maHopDong}</td><td className="px-5 py-4"><p className="font-semibold">{contract.sinhVien?.hoTen || '—'}</p><p className="text-xs text-gray-500">{contract.maSinhVien}</p></td><td className="px-5 py-4">{contract.phong?.soPhong || contract.maPhong} · {roomTypeLabel(contract.phong?.loaiPhong)}</td><td className="px-5 py-4">{new Date(contract.ngayBatDau).toLocaleDateString('vi-VN')} – {new Date(contract.ngayKetThuc).toLocaleDateString('vi-VN')}</td><td className="px-5 py-4">{Number(contract.tongTien).toLocaleString('vi-VN')} đ</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${contract.trangThai === 'PENDING_PAYMENT' ? 'bg-amber-100 text-amber-800' : contract.trangThai === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{statusLabel[contract.trangThai] || contract.trangThai}</span></td><td className="px-5 py-4 text-right">{contract.trangThai === 'PENDING_PAYMENT' && <button title="Chỉnh sửa hợp đồng nháp" onClick={() => openEdit(contract)} className="rounded-lg p-2 text-blue-700 hover:bg-blue-50"><Pencil className="h-4 w-4" /></button>}</td>
                  </tr>)}
                  {filteredContracts.length === 0 && <tr><td colSpan="7" className="px-5 py-12 text-center text-gray-500">Chưa có hợp đồng phù hợp.</td></tr>}
                </tbody>
              </table></div>
            )}
          </section>
        </main>
      </div>

      {selectedApplication && <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4"><form onSubmit={confirmApplication} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between"><div><h3 className="text-lg font-bold">Xác nhận nguyện vọng</h3><p className="mt-1 text-sm text-gray-500">{selectedApplication.sinhVien?.hoTen} · {roomTypeLabel(selectedApplication.loaiPhongYeuCau)}</p></div><button type="button" onClick={() => setSelectedApplication(null)} className="rounded p-1 text-gray-500 hover:bg-gray-100" aria-label="Đóng"><X className="h-5 w-5" /></button></div>
        <label className="block text-sm font-medium">Phòng còn chỗ<select required value={approval.maPhong} onChange={(event) => setApproval({ ...approval, maPhong: event.target.value })} className="mt-1 w-full rounded-lg border p-2.5"><option value="">Chọn phòng</option>{selectableRooms.map((room) => <option key={room.maPhong} value={room.maPhong}>{room.soPhong} · {room.soSinhVienHienTai}/{room.soSinhVienToiDa} sinh viên</option>)}</select></label>
        <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium">Ngày bắt đầu<input required type="date" value={approval.ngayBatDau} onChange={(event) => setApproval({ ...approval, ngayBatDau: event.target.value })} className="mt-1 w-full rounded-lg border p-2.5" /></label><label className="text-sm font-medium">Ngày kết thúc<input required type="date" value={approval.ngayKetThuc} onChange={(event) => setApproval({ ...approval, ngayKetThuc: event.target.value })} className="mt-1 w-full rounded-lg border p-2.5" /></label></div>
        <label className="block text-sm font-medium">Tổng tiền hợp đồng<input required type="number" min="1" value={approval.tongTien} onChange={(event) => setApproval({ ...approval, tongTien: event.target.value })} className="mt-1 w-full rounded-lg border p-2.5" /></label>
        {!selectableRooms.length && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Không còn phòng phù hợp và còn chỗ cho nguyện vọng này.</p>}
        <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setSelectedApplication(null)} className="rounded-lg border px-4 py-2 text-sm">Hủy</button><button disabled={saving || !selectableRooms.length} className="flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Check className="h-4 w-4" />{saving ? 'Đang lưu...' : 'Xác nhận và tạo nháp'}</button></div>
      </form></div>}

      {editingContract && <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4"><form onSubmit={saveContract} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between"><div><h3 className="text-lg font-bold">Chỉnh sửa hợp đồng nháp</h3><p className="text-sm text-gray-500">{editingContract.maHopDong}</p></div><button type="button" onClick={() => setEditingContract(null)} className="rounded p-1 text-gray-500 hover:bg-gray-100" aria-label="Đóng"><X className="h-5 w-5" /></button></div>
        <label className="block text-sm font-medium">Phòng<select value={editingContract.maPhong} onChange={(event) => setEditingContract({ ...editingContract, maPhong: event.target.value })} className="mt-1 w-full rounded-lg border p-2.5">{rooms.map((room) => <option key={room.maPhong} value={room.maPhong}>{room.soPhong} · {room.soSinhVienHienTai}/{room.soSinhVienToiDa}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium">Ngày bắt đầu<input required type="date" value={editingContract.ngayBatDau} onChange={(event) => setEditingContract({ ...editingContract, ngayBatDau: event.target.value })} className="mt-1 w-full rounded-lg border p-2.5" /></label><label className="text-sm font-medium">Ngày kết thúc<input required type="date" value={editingContract.ngayKetThuc} onChange={(event) => setEditingContract({ ...editingContract, ngayKetThuc: event.target.value })} className="mt-1 w-full rounded-lg border p-2.5" /></label></div>
        <label className="block text-sm font-medium">Tổng tiền<input required type="number" min="1" value={editingContract.tongTien} onChange={(event) => setEditingContract({ ...editingContract, tongTien: event.target.value })} className="mt-1 w-full rounded-lg border p-2.5" /></label>
        <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setEditingContract(null)} className="rounded-lg border px-4 py-2 text-sm">Hủy</button><button disabled={saving} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button></div>
      </form></div>}
    </div>
  );
};

export default ContractManagement;
