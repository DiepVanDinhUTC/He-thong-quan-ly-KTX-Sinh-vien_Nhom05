import AdminUserProfile from '../components/AdminUserProfile';
import AdminLogoutButton from '../components/AdminLogoutButton';
import Link from '../components/RoleLink';
import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowRightLeft, Bed, Building, CheckCircle2, DoorOpen, Download, FileSignature, Home,
  MoreVertical, Pencil, Plus, Receipt, Search, Settings, Trash2, UserPlus, Users, Wrench, X
} from 'lucide-react';
import { housingApi } from '../services/housingApi';

const facilityStatuses = [
  { value: 'TOT', label: 'Tốt' },
  { value: 'HU_HONG', label: 'Hư hỏng' },
  { value: 'DANG_BAO_TRI', label: 'Đang bảo trì' },
];
const facilityStatusLabels = { TOT: 'Tốt', HU_HONG: 'Hư hỏng', DANG_BAO_TRI: 'Đang bảo trì' };
const roomStatusLabels = { TOT: 'Tốt', CO_HU_HONG: 'Có thiết bị hư hỏng', DANG_BAO_TRI: 'Đang bảo trì', CHUA_CAP_NHAT: 'Chưa có dữ liệu CSVC' };
const memberHousingStatusLabels = {
  DANG_O: 'Đang ở', 'Đang lưu trú': 'Đang ở', CHO_DUYET: 'Chờ duyệt', 'Chờ duyệt': 'Chờ duyệt',
  TAM_VANG: 'Tạm vắng', 'Tạm vắng': 'Tạm vắng', DA_ROI: 'Đã rời KTX', 'Đã rời KTX': 'Đã rời KTX',
  'Chưa đăng ký': 'Chưa đăng ký'
};
const contractStatusLabels = { ACTIVE: 'Hợp đồng hiệu lực', PENDING_PAYMENT: 'Chờ thanh toán' };
const roomTypeLabel = (type) => type === 'DIEU_HOA' ? 'Điều hòa' : type === 'QUAT' ? 'Quạt' : type;

const RoomManagement = () => {
  const [rooms, setRooms] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [campusFilter, setCampusFilter] = useState('ALL');
  const [buildingFilter, setBuildingFilter] = useState('ALL');
  const [floorFilter, setFloorFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [facilityForm, setFacilityForm] = useState(null);
  const [roomForm, setRoomForm] = useState(null);
  const [roomFormError, setRoomFormError] = useState('');
  const [memberMenuId, setMemberMenuId] = useState('');
  const [moveMember, setMoveMember] = useState(null);
  const [moveTargetRoomId, setMoveTargetRoomId] = useState('');

  const loadRooms = async (preferredRoomId = '') => {
    setLoading(true);
    setError('');
    try {
      const [response, locationResponse] = await Promise.all([
        housingApi.roomMap(),
        housingApi.roomLocations(),
      ]);
      const data = response.data || [];
      setLocations(locationResponse.data || []);
      setRooms(data);
      setSelectedRoomId((current) => {
        const preferred = preferredRoomId || current;
        return data.some((room) => room.maPhong === preferred) ? preferred : data[0]?.maPhong || '';
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tải sơ đồ phòng từ database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRooms(); }, []);

  const selectedRoom = rooms.find((room) => room.maPhong === selectedRoomId);
  const selectedCampus = locations.find((campus) => campus.maCoSo === campusFilter);
  const buildingOptions = (campusFilter === 'ALL'
    ? locations.flatMap((campus) => campus.toaNhas.map((building) => ({ ...building, tenHienThi: `${building.tenToaNha} · ${campus.tenCoSo}` })))
    : selectedCampus?.toaNhas || []);
  const floorOptions = useMemo(() => {
    const buildings = buildingFilter === 'ALL'
      ? buildingOptions
      : buildingOptions.filter((building) => building.maToaNha === buildingFilter);
    return [...new Set(buildings.flatMap((building) => Array.from({ length: Math.max(0, Number(building.soTang) || 0) }, (_, index) => index + 1)))].sort((a, b) => a - b);
  }, [buildingOptions, buildingFilter]);
  const filteredRooms = useMemo(() => rooms.filter((room) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesQuery = !query || `${room.soPhong} ${room.maPhong} ${room.loaiPhong} ${room.tenCoSo || ''} ${room.tenToaNha || ''}`.toLowerCase().includes(query);
    const matchesType = typeFilter === 'ALL' || room.loaiPhong === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || room.trangThaiCSVC === statusFilter;
    const matchesCampus = campusFilter === 'ALL' || room.maCoSo === campusFilter;
    const matchesBuilding = buildingFilter === 'ALL' || room.maToaNha === buildingFilter;
    const matchesFloor = floorFilter === 'ALL' || String(room.tang) === floorFilter;
    return matchesQuery && matchesType && matchesStatus && matchesCampus && matchesBuilding && matchesFloor;
  }), [rooms, searchQuery, typeFilter, statusFilter, campusFilter, buildingFilter, floorFilter]);

  useEffect(() => {
    if (!filteredRooms.some((room) => room.maPhong === selectedRoomId)) {
      setSelectedRoomId(filteredRooms[0]?.maPhong || '');
    }
  }, [filteredRooms, selectedRoomId]);

  const counts = useMemo(() => ({
    total: filteredRooms.length,
    occupied: filteredRooms.reduce((sum, room) => sum + room.soSinhVienHienTai, 0),
    capacity: filteredRooms.reduce((sum, room) => sum + room.soSinhVienToiDa, 0),
    issues: filteredRooms.filter((room) => ['CO_HU_HONG', 'DANG_BAO_TRI'].includes(room.trangThaiCSVC)).length,
  }), [filteredRooms]);

  const openCreateRoom = () => {
    setRoomFormError('');
    setRoomForm({
      mode: 'create', maPhong: '', soPhong: '', loaiPhong: 'QUAT', soSinhVienToiDa: '8', maToaNha: '', tang: ''
    });
  };
  const openEditRoom = (room) => {
    setRoomFormError('');
    setRoomForm({
      mode: 'edit', maPhong: room.maPhong, soPhong: room.soPhong || '', loaiPhong: room.loaiPhong,
      soSinhVienToiDa: String(room.soSinhVienToiDa), maToaNha: room.maToaNha || '', tang: room.tang ? String(room.tang) : ''
    });
  };

  const saveRoom = async (event) => {
    event.preventDefault();
    if (!roomForm) return;
    setSaving(true);
    setRoomFormError('');
    setNotice('');
    const payload = {
      maPhong: roomForm.maPhong.trim(),
      soPhong: roomForm.soPhong.trim(),
      loaiPhong: roomForm.loaiPhong,
      soSinhVienToiDa: Number(roomForm.soSinhVienToiDa),
      maToaNha: roomForm.maToaNha || null,
      tang: roomForm.tang ? Number(roomForm.tang) : null,
    };
    try {
      if (roomForm.mode === 'create') await housingApi.createRoom(payload);
      else await housingApi.updateRoom(roomForm.maPhong, payload);
      const savedRoomId = roomForm.maPhong;
      setRoomForm(null);
      setNotice(roomForm.mode === 'create' ? 'Đã thêm phòng mới.' : 'Đã cập nhật thông tin phòng.');
      await loadRooms(savedRoomId);
    } catch (requestError) {
      setRoomFormError(requestError.response?.data?.message || 'Không thể lưu thông tin phòng.');
    } finally {
      setSaving(false);
    }
  };

  const deleteRoom = async () => {
    if (!selectedRoom) return;
    const confirmed = window.confirm(`Xóa phòng ${selectedRoom.soPhong}? Các thiết bị CSVC của phòng cũng sẽ bị xóa. Phòng có hợp đồng hoặc đơn đăng ký sẽ không được xóa.`);
    if (!confirmed) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await housingApi.deleteRoom(selectedRoom.maPhong);
      setNotice('Đã xóa phòng.');
      await loadRooms();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể xóa phòng.');
    } finally {
      setSaving(false);
    }
  };

  const openCreateFacility = () => setFacilityForm({ mode: 'create', maThietBi: '', tenThietBi: '', soLuong: 1, trangThai: 'TOT', ghiChu: '' });
  const openEditFacility = (item) => setFacilityForm({ mode: 'edit', ...item, soLuong: String(item.soLuong), ghiChu: item.ghiChu || '' });

  const saveFacility = async (event) => {
    event.preventDefault();
    if (!selectedRoom) return;
    setSaving(true);
    setError('');
    setNotice('');
    const payload = {
      tenThietBi: facilityForm.tenThietBi,
      soLuong: Number(facilityForm.soLuong),
      trangThai: facilityForm.trangThai,
      ghiChu: facilityForm.ghiChu || null,
    };
    try {
      if (facilityForm.mode === 'create') await housingApi.createFacility(selectedRoom.maPhong, payload);
      else await housingApi.updateFacility(selectedRoom.maPhong, facilityForm.maThietBi, payload);
      setFacilityForm(null);
      setNotice(facilityForm.mode === 'create' ? 'Đã ghi nhận thiết bị vào database.' : 'Đã cập nhật tình trạng thiết bị.');
      await loadRooms();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể lưu thông tin CSVC.');
    } finally {
      setSaving(false);
    }
  };

  const deleteFacility = async (item) => {
    if (!window.confirm(`Xóa ${item.tenThietBi} khỏi danh sách CSVC của phòng?`)) return;
    setSaving(true);
    setError('');
    try {
      await housingApi.deleteFacility(selectedRoom.maPhong, item.maThietBi);
      setNotice('Đã xóa thiết bị khỏi danh sách.');
      await loadRooms();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể xóa thiết bị.');
    } finally {
      setSaving(false);
    }
  };

  const exportRooms = async () => {
    const XLSX = await import('xlsx');
    const roomRows = filteredRooms.map((room) => ({
      'Mã phòng': room.maPhong,
      'Phòng': room.soPhong,
      'Cơ sở': room.tenCoSo || 'Chưa gán',
      'Địa chỉ': room.diaChiCoSo || '',
      'Tòa nhà': room.tenToaNha || 'Chưa gán',
      'Tầng': room.tang ?? '',
      'Loại phòng': roomTypeLabel(room.loaiPhong),
      'Số sinh viên hiện tại': room.soSinhVienHienTai,
      'Sức chứa tối đa': room.soSinhVienToiDa,
      'Chỗ còn trống': room.choConTrong,
      'Trạng thái CSVC': roomStatusLabels[room.trangThaiCSVC] || room.trangThaiCSVC,
      'Số thành viên': room.thanhVien.length,
      'Thiết bị': room.thietBis.map((item) => `${item.tenThietBi} (${item.soLuong}) - ${facilityStatusLabels[item.trangThai] || item.trangThai}${item.ghiChu ? `; ${item.ghiChu}` : ''}`).join('\n'),
    }));
    const memberRows = filteredRooms.flatMap((room) => room.thanhVien.map((member) => ({
      'Mã phòng': room.maPhong, 'Phòng': room.soPhong, 'Mã sinh viên': member.maSinhVien,
      'Họ tên': member.hoTen, 'Lớp': member.lop || '', 'Điện thoại': member.phone || '',
      'Trạng thái nội trú': memberHousingStatusLabels[member.trangThaiNoiTru] || member.trangThaiNoiTru || '',
      'Trạng thái hợp đồng': contractStatusLabels[member.trangThaiHopDong] || member.trangThaiHopDong,
      'Mã hợp đồng': member.maHopDong,
    })));
    const facilityRows = filteredRooms.flatMap((room) => room.thietBis.map((item) => ({
      'Mã phòng': room.maPhong, 'Phòng': room.soPhong, 'Thiết bị': item.tenThietBi,
      'Số lượng': item.soLuong, 'Tình trạng': facilityStatusLabels[item.trangThai] || item.trangThai,
      'Ghi chú': item.ghiChu || '',
    })));
    const workbook = XLSX.utils.book_new();
    [
      ['Phòng', roomRows, ['Mã phòng', 'Phòng', 'Cơ sở', 'Địa chỉ', 'Tòa nhà', 'Tầng', 'Loại phòng', 'Số sinh viên hiện tại', 'Sức chứa tối đa', 'Chỗ còn trống', 'Trạng thái CSVC', 'Số thành viên', 'Thiết bị']],
      ['Thành viên', memberRows, ['Mã phòng', 'Phòng', 'Mã sinh viên', 'Họ tên', 'Lớp', 'Điện thoại', 'Trạng thái nội trú', 'Trạng thái hợp đồng', 'Mã hợp đồng']],
      ['Thiết bị', facilityRows, ['Mã phòng', 'Phòng', 'Thiết bị', 'Số lượng', 'Tình trạng', 'Ghi chú']],
    ].forEach(([name, rows, headers]) => {
      const sheet = XLSX.utils.json_to_sheet(rows, { header: headers });
      sheet['!cols'] = headers.map((header) => ({ wch: Math.min(32, Math.max(14, header.length + 3)) }));
      sheet['!margins'] = { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 };
      if (sheet['!ref']) sheet['!autofilter'] = { ref: sheet['!ref'] };
      XLSX.utils.book_append_sheet(workbook, sheet, name);
    });
    XLSX.writeFile(workbook, `Danh-sach-phong-KTX-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const submitMoveMember = async (event) => {
    event.preventDefault();
    if (!moveMember || !moveTargetRoomId) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await housingApi.moveRoomMember(moveMember.room.maPhong, moveMember.member.maHopDong, moveTargetRoomId);
      setMoveMember(null);
      setMemberMenuId('');
      setNotice(`Đã chuyển ${moveMember.member.hoTen} sang phòng mới.`);
      await loadRooms(moveMember.room.maPhong);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể chuyển sinh viên sang phòng mới.');
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (room, member) => {
    if (!window.confirm(`Xóa ${member.hoTen} khỏi phòng ${room.soPhong}? Hợp đồng sẽ chuyển sang trạng thái đã hủy, hồ sơ và lịch sử thanh toán vẫn được giữ.`)) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await housingApi.removeRoomMember(room.maPhong, member.maHopDong);
      setMemberMenuId('');
      setNotice(`Đã xóa ${member.hoTen} khỏi phòng và giữ lại lịch sử hợp đồng.`);
      await loadRooms(room.maPhong);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể xóa sinh viên khỏi phòng.');
    } finally {
      setSaving(false);
    }
  };

  const getRoomStatusClass = (status) => {
    if (status === 'TOT') return 'bg-green-100 text-green-800';
    if (status === 'CO_HU_HONG') return 'bg-red-100 text-red-800';
    if (status === 'DANG_BAO_TRI') return 'bg-amber-100 text-amber-800';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-800">
      <aside className="flex h-full w-64 shrink-0 flex-col bg-blue-900 text-white shadow-lg">
        <div className="flex items-center justify-center border-b border-blue-800 p-6"><Building className="mr-3 h-8 w-8" /><h1 className="text-xl font-bold tracking-wider">KTX GTVT</h1></div>
        <nav className="flex-1 space-y-2 px-4 py-6">
          <Link to="/" className="flex items-center rounded-lg px-4 py-3 text-blue-200 hover:bg-blue-800"><Home className="h-5 w-5" /><span className="ml-3">Trang chủ</span></Link>
          <Link to="/students" className="flex items-center rounded-lg px-4 py-3 text-blue-200 hover:bg-blue-800"><UserPlus className="h-5 w-5" /><span className="ml-3">Quản lý Sinh viên</span></Link>
          <Link to="/rooms" className="flex items-center rounded-lg bg-blue-800 px-4 py-3 font-medium text-white"><DoorOpen className="h-5 w-5" /><span className="ml-3">Quản lý Phòng & CSVC</span></Link>
          <Link to="/contracts" className="flex items-center rounded-lg px-4 py-3 text-blue-200 hover:bg-blue-800"><FileSignature className="h-5 w-5" /><span className="ml-3">Quản lý Hợp đồng</span></Link>
          <Link to="/tickets" className="flex items-center rounded-lg px-4 py-3 text-blue-200 hover:bg-blue-800"><Wrench className="h-5 w-5" /><span className="ml-3">Ticket báo hỏng</span></Link>
          <Link to="/technician" className="flex items-center rounded-lg px-4 py-3 text-blue-200 hover:bg-blue-800"><Wrench className="h-5 w-5" /><span className="ml-3">Bảng kỹ thuật</span></Link>
          <Link to="/financial-dashboard" className="flex items-center rounded-lg px-4 py-3 text-blue-200 hover:bg-blue-800"><Receipt className="h-5 w-5" /><span className="ml-3">Quản lý Hóa đơn & Điện nước</span></Link>
          <Link to="/settings" className="flex items-center rounded-lg px-4 py-3 text-blue-200 hover:bg-blue-800"><Settings className="h-5 w-5" /><span className="ml-3">Cài đặt hệ thống</span></Link>
        </nav>
        <div className="border-t border-blue-800 p-4"><AdminUserProfile /></div><AdminLogoutButton />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-white px-5 shadow-sm sm:px-8"><h2 className="text-lg font-semibold sm:text-xl">Sơ đồ phòng & cơ sở vật chất</h2><div className="flex items-center gap-2"><button type="button" disabled={!filteredRooms.length} onClick={exportRooms} className="flex items-center gap-2 rounded-lg border border-green-200 px-3 py-2 text-sm font-semibold text-green-800 hover:bg-green-50 disabled:opacity-50"><Download className="h-4 w-4" /><span className="hidden sm:inline">Xuất Excel</span></button><button type="button" onClick={openCreateRoom} className="flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"><Plus className="h-4 w-4" />Thêm phòng mới</button><button onClick={loadRooms} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">Làm mới</button></div></header>
        <main className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 lg:flex-row lg:overflow-hidden lg:p-6">
          <section className="flex min-h-[360px] min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-white shadow-sm lg:min-h-0">
            <div className="grid grid-cols-2 gap-3 border-b p-4 sm:grid-cols-4">
              <div className="rounded-lg bg-blue-50 p-3"><p className="text-xs text-gray-500">Tổng số phòng</p><p className="mt-1 text-xl font-bold text-blue-800">{counts.total}</p></div>
              <div className="rounded-lg bg-indigo-50 p-3"><p className="text-xs text-gray-500">Sinh viên / sức chứa</p><p className="mt-1 text-xl font-bold text-indigo-800">{counts.occupied} / {counts.capacity}</p></div>
              <div className="rounded-lg bg-green-50 p-3"><p className="text-xs text-gray-500">Chỗ còn trống</p><p className="mt-1 text-xl font-bold text-green-800">{Math.max(0, counts.capacity - counts.occupied)}</p></div>
              <div className="rounded-lg bg-amber-50 p-3"><p className="text-xs text-gray-500">Phòng có CSVC cần xử lý</p><p className="mt-1 text-xl font-bold text-amber-800">{counts.issues}</p></div>
            </div>

            <div className="flex flex-wrap gap-2 border-b p-4">
              <select aria-label="Lọc theo cơ sở" value={campusFilter} onChange={(event) => { setCampusFilter(event.target.value); setBuildingFilter('ALL'); setFloorFilter('ALL'); }} className="rounded-lg border bg-white px-3 py-2 text-sm"><option value="ALL">Tất cả cơ sở</option>{locations.map((campus) => <option key={campus.maCoSo} value={campus.maCoSo}>{campus.tenCoSo}</option>)}</select>
              <select aria-label="Lọc theo tòa nhà" value={buildingFilter} onChange={(event) => { setBuildingFilter(event.target.value); setFloorFilter('ALL'); }} className="rounded-lg border bg-white px-3 py-2 text-sm"><option value="ALL">Tất cả tòa nhà</option>{buildingOptions.map((building) => <option key={building.maToaNha} value={building.maToaNha}>{building.tenHienThi || building.tenToaNha}</option>)}</select>
              <select aria-label="Lọc theo tầng" value={floorFilter} onChange={(event) => setFloorFilter(event.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm"><option value="ALL">Tất cả tầng</option>{floorOptions.map((floor) => <option key={floor} value={floor}>Tầng {floor}</option>)}</select>
              <label className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border px-3"><Search className="h-4 w-4 text-gray-400" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Tìm số phòng, mã phòng..." className="w-full py-2 text-sm outline-none" /></label>
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm"><option value="ALL">Tất cả loại phòng</option><option value="QUAT">Phòng quạt</option><option value="DIEU_HOA">Phòng điều hòa</option></select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm"><option value="ALL">Tất cả trạng thái CSVC</option><option value="TOT">CSVC tốt</option><option value="CO_HU_HONG">Có thiết bị hư</option><option value="DANG_BAO_TRI">Đang bảo trì</option><option value="CHUA_CAP_NHAT">Chưa có dữ liệu</option></select>
            </div>

            {error && <p role="alert" className="mx-4 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {notice && <p role="status" className="mx-4 mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{notice}</p>}
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {loading ? <p className="p-8 text-center text-sm text-gray-500">Đang tải sơ đồ phòng từ database...</p> : filteredRooms.length === 0 ? <p className="p-8 text-center text-sm text-gray-500">Không tìm thấy phòng phù hợp.</p> : <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredRooms.map((room) => {
                  const fullness = room.soSinhVienToiDa > 0 ? Math.min(100, (room.soSinhVienHienTai / room.soSinhVienToiDa) * 100) : 0;
                  const full = room.soSinhVienHienTai >= room.soSinhVienToiDa;
                  return <button key={room.maPhong} onClick={() => setSelectedRoomId(room.maPhong)} className={`rounded-xl border-2 p-4 text-left transition hover:shadow-md ${selectedRoomId === room.maPhong ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-100' : 'border-gray-200 bg-white hover:border-blue-300'}`}>
                    <p className="mb-2 text-xs text-gray-500">{room.tenCoSo || 'Chưa gán cơ sở'} · {room.tenToaNha || 'Chưa gán tòa'}{room.tang ? ` · Tầng ${room.tang}` : ''}</p>
                    <div className="flex items-start justify-between gap-2"><div><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{roomTypeLabel(room.loaiPhong)}</p><h3 className="mt-1 text-xl font-bold">{room.soPhong}</h3><p className="text-xs text-gray-500">Mã phòng: {room.maPhong}</p></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getRoomStatusClass(room.trangThaiCSVC)}`}>{roomStatusLabels[room.trangThaiCSVC]}</span></div>
                    <div className="mt-4"><div className="mb-1 flex justify-between text-xs"><span className="font-medium text-gray-500">Sức chứa</span><span className={`font-bold ${full ? 'text-red-700' : 'text-gray-800'}`}>{room.soSinhVienHienTai} / {room.soSinhVienToiDa}</span></div><div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className={`h-full rounded-full ${full ? 'bg-red-500' : fullness >= 75 ? 'bg-amber-500' : 'bg-blue-600'}`} style={{ width: `${fullness}%` }} /></div><p className="mt-2 text-xs text-gray-500">{room.choConTrong} chỗ còn trống · {room.thietBis.length} nhóm thiết bị</p></div>
                  </button>;
                })}
              </div>}
            </div>
          </section>

          <aside className="flex min-h-[280px] w-full shrink-0 flex-col overflow-visible rounded-xl border bg-white shadow-sm lg:min-h-0 lg:w-[390px] lg:overflow-hidden">
            {selectedRoom ? <>
              <div className="border-b bg-gray-50 p-5"><div className="mb-3 flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => openEditRoom(selectedRoom)} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 disabled:opacity-50"><Pencil className="h-4 w-4" />Chỉnh sửa</button><button type="button" disabled={saving} onClick={deleteRoom} className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-4 w-4" />Xóa phòng</button></div><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase text-blue-700">{roomTypeLabel(selectedRoom.loaiPhong)}</p><h3 className="mt-1 text-2xl font-bold">Phòng {selectedRoom.soPhong}</h3><p className="text-xs text-gray-500">Mã phòng: {selectedRoom.maPhong}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${getRoomStatusClass(selectedRoom.trangThaiCSVC)}`}>{roomStatusLabels[selectedRoom.trangThaiCSVC]}</span></div>
                <div className="mt-4 rounded-xl border bg-white p-4"><div className="mb-2 flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-gray-600"><Bed className="h-4 w-4" />Sức chứa hiện tại</span><strong>{selectedRoom.soSinhVienHienTai} / {selectedRoom.soSinhVienToiDa} sinh viên</strong></div><div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className={`h-full ${selectedRoom.soSinhVienHienTai >= selectedRoom.soSinhVienToiDa ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${selectedRoom.soSinhVienToiDa > 0 ? Math.min(100, selectedRoom.soSinhVienHienTai / selectedRoom.soSinhVienToiDa * 100) : 0}%` }} /></div><p className="mt-2 text-xs text-gray-500">Còn {selectedRoom.choConTrong} chỗ</p></div>
              </div>
              <div className="border-b p-4">
                <div className="mb-3 flex items-center justify-between"><div><h4 className="flex items-center gap-2 font-semibold"><Users className="h-4 w-4 text-blue-700" />Thành viên trong phòng</h4><p className="text-xs text-gray-500">{selectedRoom.thanhVien.length} hồ sơ có hợp đồng đang hiệu lực hoặc chờ thanh toán</p></div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800">{selectedRoom.thanhVien.length}</span></div>
                {selectedRoom.thanhVien.length === 0 ? <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">Chưa có thành viên được ghi nhận trong phòng.</p> : <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                  {selectedRoom.thanhVien.map((member) => <div key={member.maHopDong} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2"><div className="flex min-w-0 items-start gap-2"><div className="min-w-0"><p className="truncate text-sm font-semibold">{member.hoTen || 'Chưa có họ tên'}</p><p className="mt-0.5 text-xs text-gray-500">{member.maSinhVien}{member.lop ? ` · ${member.lop}` : ''}</p></div><button type="button" disabled={saving} onClick={() => setMemberMenuId((current) => current === member.maHopDong ? '' : member.maHopDong)} className="shrink-0 rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50" aria-label={`Thao tác với ${member.hoTen}`} aria-expanded={memberMenuId === member.maHopDong}><MoreVertical className="h-4 w-4" /></button></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${member.trangThaiNoiTru === 'TAM_VANG' || member.trangThaiNoiTru === 'Tạm vắng' ? 'bg-amber-100 text-amber-800' : member.trangThaiNoiTru === 'DA_ROI' || member.trangThaiNoiTru === 'Đã rời KTX' ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-800'}`}>{memberHousingStatusLabels[member.trangThaiNoiTru] || member.trangThaiNoiTru || 'Chưa cập nhật'}</span></div>
                    {memberMenuId === member.maHopDong && <div className="mt-2 flex flex-wrap gap-2 border-t pt-2"><button type="button" disabled={saving} onClick={() => { const candidates = rooms.filter((room) => room.maPhong !== selectedRoom.maPhong && room.loaiPhong === selectedRoom.loaiPhong && room.soSinhVienHienTai < room.soSinhVienToiDa); setError(''); setMoveMember({ room: selectedRoom, member }); setMoveTargetRoomId(candidates[0]?.maPhong || ''); }} className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"><ArrowRightLeft className="h-3.5 w-3.5" />Chuyển phòng</button><button type="button" disabled={saving} onClick={() => removeMember(selectedRoom, member)} className="flex items-center gap-1.5 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />Xóa khỏi phòng</button></div>}
                    <p className="mt-2 text-[11px] text-blue-700">{contractStatusLabels[member.trangThaiHopDong] || member.trangThaiHopDong} · HĐ {member.maHopDong}</p>
                  </div>)}
                </div>}
              </div>
              <div className="flex items-center justify-between border-b p-4"><div><h4 className="font-semibold">Cơ sở vật chất</h4><p className="text-xs text-gray-500">Tình trạng thiết bị ghi trong database</p></div><button onClick={openCreateFacility} className="flex items-center gap-1 rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800"><Plus className="h-4 w-4" />Thêm thiết bị</button></div>
              <div className="min-h-[160px] shrink-0 space-y-3 overflow-visible p-4 lg:min-h-0 lg:flex-1 lg:shrink lg:overflow-y-auto">
                {selectedRoom.thietBis.length === 0 ? <div className="rounded-xl border border-dashed p-6 text-center"><AlertTriangle className="mx-auto mb-2 h-6 w-6 text-gray-400" /><p className="text-sm font-medium text-gray-700">Chưa có dữ liệu CSVC</p><p className="mt-1 text-xs text-gray-500">Thêm thiết bị thực tế để bắt đầu theo dõi tình trạng phòng.</p></div> : selectedRoom.thietBis.map((item) => <div key={item.maThietBi} className="rounded-xl border p-3">
                  <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="font-medium">{item.tenThietBi}</p><p className="mt-1 text-xs text-gray-500">Số lượng: {item.soLuong} · Cập nhật {new Date(item.ngayCapNhat).toLocaleDateString('vi-VN')}</p>{item.ghiChu && <p className="mt-1 text-xs text-gray-500">{item.ghiChu}</p>}</div><div className="flex shrink-0 gap-1"><button onClick={() => openEditFacility(item)} title="Sửa thiết bị" className="rounded p-1.5 text-blue-700 hover:bg-blue-50"><Pencil className="h-4 w-4" /></button><button disabled={saving} onClick={() => deleteFacility(item)} title="Xóa thiết bị" className="rounded p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div></div>
                  <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${item.trangThai === 'TOT' ? 'bg-green-100 text-green-800' : item.trangThai === 'HU_HONG' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>{item.trangThai === 'TOT' ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}{facilityStatusLabels[item.trangThai]}</span>
                </div>)}
              </div>
            </> : <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-gray-400"><DoorOpen className="mb-3 h-10 w-10" /><p>Chọn phòng trên sơ đồ để xem sức chứa và CSVC.</p></div>}
          </aside>
        </main>
      </div>

      {moveMember && <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setMoveMember(null); }}>
        <form onSubmit={submitMoveMember} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
          <div className="flex items-start justify-between"><div><h3 className="text-lg font-bold">Chuyển phòng</h3><p className="mt-1 text-sm text-gray-500">{moveMember.member.hoTen} · Phòng hiện tại {moveMember.room.soPhong}</p></div><button type="button" disabled={saving} onClick={() => setMoveMember(null)} className="rounded p-1 text-gray-500 hover:bg-gray-100" aria-label="Đóng"><X className="h-5 w-5" /></button></div>
          <label className="block text-sm font-medium">Phòng mới<select required value={moveTargetRoomId} onChange={(event) => setMoveTargetRoomId(event.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2.5"><option value="">Chọn phòng còn chỗ</option>{rooms.filter((room) => room.maPhong !== moveMember.room.maPhong && room.loaiPhong === moveMember.room.loaiPhong && room.soSinhVienHienTai < room.soSinhVienToiDa).map((room) => <option key={room.maPhong} value={room.maPhong}>{room.soPhong} · {room.tenToaNha || 'Chưa gán tòa'} · còn {room.soSinhVienToiDa - room.soSinhVienHienTai} chỗ</option>)}</select></label>
          {!rooms.some((room) => room.maPhong !== moveMember.room.maPhong && room.loaiPhong === moveMember.room.loaiPhong && room.soSinhVienHienTai < room.soSinhVienToiDa) && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Hiện không có phòng cùng loại còn chỗ.</p>}
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2 border-t pt-4"><button type="button" disabled={saving} onClick={() => setMoveMember(null)} className="rounded-lg border px-4 py-2 text-sm">Hủy</button><button disabled={saving || !moveTargetRoomId} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Đang chuyển...' : 'Xác nhận chuyển'}</button></div>
        </form>
      </div>}
      {roomForm && <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setRoomForm(null); }}>
        <form onSubmit={saveRoom} className="w-full max-w-xl space-y-4 rounded-2xl bg-white p-6 shadow-xl">
          <div className="flex items-start justify-between"><div><h3 className="text-lg font-bold">{roomForm.mode === 'create' ? 'Thêm phòng mới' : 'Chỉnh sửa phòng'}</h3><p className="mt-1 text-sm text-gray-500">Cập nhật thông tin phòng trong cơ sở dữ liệu.</p></div><button type="button" onClick={() => setRoomForm(null)} className="rounded p-1 text-gray-500 hover:bg-gray-100" aria-label="Đóng"><X className="h-5 w-5" /></button></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-700">Mã phòng<input required maxLength={100} disabled={roomForm.mode === 'edit'} value={roomForm.maPhong} onChange={(event) => setRoomForm({ ...roomForm, maPhong: event.target.value })} className="mt-1 w-full rounded-lg border p-2.5 disabled:bg-gray-100" placeholder="Ví dụ: T10PH01" /></label>
            <label className="text-sm font-medium text-gray-700">Số phòng hiển thị<input required maxLength={100} value={roomForm.soPhong} onChange={(event) => setRoomForm({ ...roomForm, soPhong: event.target.value })} className="mt-1 w-full rounded-lg border p-2.5" placeholder="Ví dụ: T10-01" /></label>
            <label className="text-sm font-medium text-gray-700">Loại phòng<select value={roomForm.loaiPhong} onChange={(event) => setRoomForm({ ...roomForm, loaiPhong: event.target.value })} className="mt-1 w-full rounded-lg border bg-white p-2.5"><option value="QUAT">Phòng quạt</option><option value="DIEU_HOA">Phòng điều hòa</option></select></label>
            <label className="text-sm font-medium text-gray-700">Sức chứa tối đa<input required min="1" max="200" type="number" value={roomForm.soSinhVienToiDa} onChange={(event) => setRoomForm({ ...roomForm, soSinhVienToiDa: event.target.value })} className="mt-1 w-full rounded-lg border p-2.5" /></label>
            <label className="text-sm font-medium text-gray-700">Tòa nhà<select value={roomForm.maToaNha} onChange={(event) => setRoomForm({ ...roomForm, maToaNha: event.target.value, tang: '' })} className="mt-1 w-full rounded-lg border bg-white p-2.5"><option value="">Chưa gán tòa</option>{locations.flatMap((campus) => campus.toaNhas.map((building) => <option key={building.maToaNha} value={building.maToaNha}>{building.tenToaNha} · {campus.tenCoSo}</option>))}</select></label>
            <label className="text-sm font-medium text-gray-700">Tầng<select required={Boolean(roomForm.maToaNha)} disabled={!roomForm.maToaNha} value={roomForm.tang} onChange={(event) => setRoomForm({ ...roomForm, tang: event.target.value })} className="mt-1 w-full rounded-lg border bg-white p-2.5 disabled:bg-gray-100"><option value="">{roomForm.maToaNha ? 'Chọn tầng' : 'Chọn tòa nhà trước'}</option>{(() => { const building = locations.flatMap((campus) => campus.toaNhas).find((item) => item.maToaNha === roomForm.maToaNha); return Array.from({ length: Number(building?.soTang) || 0 }, (_, index) => index + 1).map((floor) => <option key={floor} value={floor}>Tầng {floor}</option>); })()}</select></label>
          </div>
          {roomFormError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{roomFormError}</p>}
          <div className="flex justify-end gap-2 border-t pt-4"><button type="button" onClick={() => setRoomForm(null)} className="rounded-lg border px-4 py-2 text-sm">Hủy</button><button disabled={saving} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Đang lưu...' : roomForm.mode === 'create' ? 'Thêm phòng' : 'Lưu thay đổi'}</button></div>
        </form>
      </div>}
      {facilityForm && <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"><form onSubmit={saveFacility} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between"><div><h3 className="text-lg font-bold">{facilityForm.mode === 'create' ? 'Ghi nhận CSVC' : 'Cập nhật CSVC'}</h3><p className="text-sm text-gray-500">Phòng {selectedRoom?.soPhong}</p></div><button type="button" onClick={() => setFacilityForm(null)} className="rounded p-1 text-gray-500 hover:bg-gray-100" aria-label="Đóng"><X className="h-5 w-5" /></button></div>
        <label className="block text-sm font-medium">Tên thiết bị<input autoFocus required maxLength={120} value={facilityForm.tenThietBi} onChange={(event) => setFacilityForm({ ...facilityForm, tenThietBi: event.target.value })} className="mt-1 w-full rounded-lg border p-2.5" placeholder="Ví dụ: Quạt trần" /></label>
        <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium">Số lượng<input required min="1" type="number" value={facilityForm.soLuong} onChange={(event) => setFacilityForm({ ...facilityForm, soLuong: event.target.value })} className="mt-1 w-full rounded-lg border p-2.5" /></label><label className="text-sm font-medium">Tình trạng<select value={facilityForm.trangThai} onChange={(event) => setFacilityForm({ ...facilityForm, trangThai: event.target.value })} className="mt-1 w-full rounded-lg border bg-white p-2.5">{facilityStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label></div>
        <label className="block text-sm font-medium">Ghi chú<textarea maxLength={255} value={facilityForm.ghiChu} onChange={(event) => setFacilityForm({ ...facilityForm, ghiChu: event.target.value })} rows="2" className="mt-1 w-full rounded-lg border p-2.5" /></label>
        <div className="flex justify-end gap-2"><button type="button" onClick={() => setFacilityForm(null)} className="rounded-lg border px-4 py-2 text-sm">Hủy</button><button disabled={saving} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu vào database'}</button></div>
      </form></div>}
    </div>
  );
};

export default RoomManagement;
