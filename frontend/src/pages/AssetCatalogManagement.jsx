import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Loader2, Pencil, Plus, RefreshCw, Search, Trash2, Wrench, X } from 'lucide-react';
import FacilitiesLayout from '../components/FacilitiesLayout';
import { housingApi } from '../services/housingApi';

const STATUS_OPTIONS = [
  { value: 'TOT', label: 'Tốt' },
  { value: 'HU_HONG', label: 'Hư hỏng' },
  { value: 'DANG_BAO_TRI', label: 'Đang bảo trì' },
];
const statusStyle = { TOT: 'bg-emerald-50 text-emerald-700', HU_HONG: 'bg-rose-50 text-rose-700', DANG_BAO_TRI: 'bg-amber-50 text-amber-800' };
const statusLabel = Object.fromEntries(STATUS_OPTIONS.map(({ value, label }) => [value, label]));
const inputClass = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

const AssetCatalogManagement = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  const loadAssets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await housingApi.roomMap();
      setRooms(response.data || []);
    } catch (requestError) {
      setRooms([]);
      setError(requestError.response?.data?.message || 'Không thể tải danh mục tài sản.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAssets(); }, [loadAssets]);

  const assets = useMemo(() => rooms.flatMap((room) => (room.thietBis || []).map((asset) => ({
    ...asset,
    maPhong: room.maPhong,
    soPhong: room.soPhong,
    maToaNha: room.maToaNha,
    tenToaNha: room.tenToaNha,
    tenKhu: room.tenKhu,
  }))), [rooms]);
  const buildingOptions = useMemo(() => [...new Map(rooms.filter((room) => room.maToaNha).map((room) => [room.maToaNha, { maToaNha: room.maToaNha, tenToaNha: room.tenToaNha }])).values()], [rooms]);
  const filteredAssets = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    return assets.filter((asset) => {
      const matchesQuery = !query || `${asset.tenThietBi} ${asset.maThietBi} ${asset.soPhong} ${asset.maPhong} ${asset.tenToaNha} ${asset.tenKhu}`.toLocaleLowerCase('vi').includes(query);
      const matchesBuilding = buildingFilter === 'ALL' || asset.maToaNha === buildingFilter;
      const matchesStatus = statusFilter === 'ALL' || asset.trangThai === statusFilter;
      return matchesQuery && matchesBuilding && matchesStatus;
    });
  }, [assets, search, buildingFilter, statusFilter]);
  const damagedCount = assets.filter((asset) => asset.trangThai !== 'TOT').length;
  const totalQuantity = assets.reduce((sum, asset) => sum + Number(asset.soLuong || 0), 0);

  const openCreate = () => {
    setFormError('');
    setForm({ mode: 'create', maPhong: rooms[0]?.maPhong || '', tenThietBi: '', soLuong: '1', trangThai: 'TOT', ghiChu: '' });
  };
  const openEdit = (asset) => {
    setFormError('');
    setForm({ mode: 'edit', maPhong: asset.maPhong, maThietBi: asset.maThietBi, tenThietBi: asset.tenThietBi, soLuong: String(asset.soLuong), trangThai: asset.trangThai, ghiChu: asset.ghiChu || '' });
  };

  const saveAsset = async (event) => {
    event.preventDefault();
    if (!form) return;
    const quantity = Number(form.soLuong);
    if (!form.tenThietBi.trim() || !Number.isInteger(quantity) || quantity < 1) {
      setFormError('Nhập tên tài sản và số lượng nguyên lớn hơn 0.');
      return;
    }
    setSaving(true);
    setFormError('');
    setError('');
    setNotice('');
    const payload = { tenThietBi: form.tenThietBi.trim(), soLuong: quantity, trangThai: form.trangThai, ghiChu: form.ghiChu.trim() || null };
    try {
      if (form.mode === 'create') await housingApi.createFacility(form.maPhong, payload);
      else await housingApi.updateFacility(form.maPhong, form.maThietBi, payload);
      setForm(null);
      setNotice(form.mode === 'create' ? 'Đã thêm tài sản vào phòng.' : 'Đã cập nhật tài sản.');
      await loadAssets();
    } catch (requestError) {
      setFormError(requestError.response?.data?.message || 'Không thể lưu tài sản.');
    } finally {
      setSaving(false);
    }
  };

  const deleteAsset = async (asset) => {
    if (!window.confirm(`Xóa “${asset.tenThietBi}” khỏi phòng ${asset.soPhong}?`)) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await housingApi.deleteFacility(asset.maPhong, asset.maThietBi);
      setNotice('Đã xóa tài sản khỏi danh mục.');
      await loadAssets();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể xóa tài sản.');
    } finally {
      setSaving(false);
    }
  };

  return <FacilitiesLayout
    title="Danh mục tài sản"
    description="Quản lý thiết bị theo phòng trong phạm vi được phân công."
    actions={<>
      <button type="button" onClick={loadAssets} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Tải lại</button>
      <button type="button" onClick={openCreate} disabled={!rooms.length || saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"><Plus className="h-4 w-4" />Thêm tài sản</button>
    </>}
  >
    <div className="space-y-5">
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Danh mục thiết bị</p><p className="mt-1 text-2xl font-bold text-slate-900">{assets.length}</p></div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Tổng số lượng</p><p className="mt-1 text-2xl font-bold text-blue-800">{totalQuantity}</p></div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Cần xử lý</p><p className="mt-1 text-2xl font-bold text-amber-700">{damagedCount}</p></div>
      </section>

      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

      <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b p-4 sm:p-5">
          <label className="relative min-w-52 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tài sản, phòng, tòa nhà" className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm" /></label>
          <select aria-label="Lọc theo tòa nhà" value={buildingFilter} onChange={(event) => setBuildingFilter(event.target.value)} className="rounded-xl border bg-white px-3 py-2.5 text-sm"><option value="ALL">Tất cả tòa nhà</option>{buildingOptions.map((building) => <option key={building.maToaNha} value={building.maToaNha}>{building.tenToaNha} ({building.maToaNha})</option>)}</select>
          <select aria-label="Lọc theo tình trạng" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border bg-white px-3 py-2.5 text-sm"><option value="ALL">Tất cả tình trạng</option>{STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select>
        </div>
        {loading ? <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Đang tải danh mục tài sản...</div>
          : filteredAssets.length === 0 ? <div className="p-12 text-center text-sm text-slate-500">{assets.length ? 'Không có tài sản khớp điều kiện lọc.' : 'Chưa có tài sản nào được ghi nhận trong phạm vi này.'}</div>
            : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Tài sản</th><th className="px-5 py-3">Vị trí</th><th className="px-5 py-3">Số lượng</th><th className="px-5 py-3">Tình trạng</th><th className="px-5 py-3">Ghi chú</th><th className="px-5 py-3 text-right">Thao tác</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredAssets.map((asset) => <tr key={asset.maThietBi} className="hover:bg-slate-50/70">
              <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="rounded-lg bg-blue-50 p-2 text-blue-700"><Wrench className="h-4 w-4" /></span><div><p className="font-semibold text-slate-900">{asset.tenThietBi}</p><p className="mt-0.5 text-xs text-slate-500">Mã: {asset.maThietBi.slice(0, 8)}</p></div></div></td>
              <td className="px-5 py-4"><p className="font-medium text-slate-800">Phòng {asset.soPhong}</p><p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><Building2 className="h-3 w-3" />{asset.tenToaNha || 'Chưa gán tòa nhà'}{asset.tenKhu ? ` · ${asset.tenKhu}` : ''}</p></td>
              <td className="px-5 py-4 font-semibold text-slate-800">{asset.soLuong}</td>
              <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[asset.trangThai] || 'bg-slate-100 text-slate-700'}`}>{statusLabel[asset.trangThai] || asset.trangThai}</span></td>
              <td className="max-w-56 px-5 py-4 text-xs text-slate-500">{asset.ghiChu || '—'}</td>
              <td className="px-5 py-4"><div className="flex justify-end gap-1"><button type="button" disabled={saving} onClick={() => openEdit(asset)} aria-label={`Sửa ${asset.tenThietBi}`} className="rounded-lg p-2 text-blue-700 hover:bg-blue-50 disabled:opacity-50"><Pencil className="h-4 w-4" /></button><button type="button" disabled={saving} onClick={() => deleteAsset(asset)} aria-label={`Xóa ${asset.tenThietBi}`} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button></div></td>
            </tr>)}</tbody></table></div>}
      </section>
    </div>

    {form && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setForm(null); }}>
      <form onSubmit={saveAsset} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between"><div><h2 className="text-lg font-bold text-slate-900">{form.mode === 'create' ? 'Thêm tài sản vào phòng' : 'Cập nhật tài sản'}</h2><p className="mt-1 text-sm text-slate-500">Danh mục và số lượng được lưu theo từng phòng.</p></div><button type="button" disabled={saving} onClick={() => setForm(null)} aria-label="Đóng" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
        <label className="block text-sm font-semibold text-slate-700">Phòng<select required disabled={form.mode === 'edit'} value={form.maPhong} onChange={(event) => setForm({ ...form, maPhong: event.target.value })} className={`${inputClass} disabled:bg-slate-100`}>{rooms.map((room) => <option key={room.maPhong} value={room.maPhong}>{room.tenToaNha || 'Chưa gán tòa'} · Phòng {room.soPhong}</option>)}</select></label>
        <label className="block text-sm font-semibold text-slate-700">Tên tài sản<input required maxLength="120" value={form.tenThietBi} onChange={(event) => setForm({ ...form, tenThietBi: event.target.value })} className={inputClass} placeholder="Ví dụ: Quạt trần" /></label>
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Số lượng<input required type="number" min="1" max="100000" step="1" value={form.soLuong} onChange={(event) => setForm({ ...form, soLuong: event.target.value })} className={inputClass} /></label><label className="text-sm font-semibold text-slate-700">Tình trạng<select value={form.trangThai} onChange={(event) => setForm({ ...form, trangThai: event.target.value })} className={inputClass}>{STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label></div>
        <label className="block text-sm font-semibold text-slate-700">Ghi chú<textarea maxLength="255" rows="3" value={form.ghiChu} onChange={(event) => setForm({ ...form, ghiChu: event.target.value })} className={inputClass} placeholder="Tình trạng chi tiết, thông tin bàn giao..." /></label>
        {formError && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</p>}
        <div className="flex justify-end gap-2 border-t pt-4"><button type="button" disabled={saving} onClick={() => setForm(null)} className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700">Hủy</button><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{form.mode === 'create' ? 'Thêm tài sản' : 'Lưu thay đổi'}</button></div>
      </form>
    </div>}
  </FacilitiesLayout>;
};

export default AssetCatalogManagement;
