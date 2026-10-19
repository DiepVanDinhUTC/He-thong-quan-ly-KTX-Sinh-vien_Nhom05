import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Loader2, MapPin, Pencil, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';
import FacilitiesLayout from '../components/FacilitiesLayout';
import { housingApi } from '../services/housingApi';

const emptyForm = () => ({ mode: 'create', maToaNha: '', maKhu: '', tenToaNha: '', soTang: '10' });
const inputClass = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

const BuildingManagement = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  const loadBuildings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await housingApi.roomLocations();
      setLocations(response.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tải danh sách tòa nhà.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBuildings(); }, [loadBuildings]);

  const buildings = useMemo(() => locations.flatMap((khu) => (khu.toaNhas || []).map((toaNha) => ({
    ...toaNha,
    maKhu: khu.maKhu,
    tenKhu: khu.tenKhu,
    diaChiKhu: khu.diaChi,
  }))), [locations]);
  const filteredBuildings = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    if (!query) return buildings;
    return buildings.filter((item) => `${item.maToaNha} ${item.tenToaNha} ${item.tenKhu} ${item.diaChiKhu}`.toLocaleLowerCase('vi').includes(query));
  }, [buildings, search]);

  const openCreate = () => {
    setFormError('');
    setForm({ ...emptyForm(), maKhu: locations[0]?.maKhu || '' });
  };
  const openEdit = (building) => {
    setFormError('');
    setForm({ mode: 'edit', maToaNha: building.maToaNha, maKhu: building.maKhu, tenToaNha: building.tenToaNha, soTang: String(building.soTang) });
  };

  const saveBuilding = async (event) => {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setFormError('');
    setError('');
    setNotice('');
    const payload = {
      ...(form.mode === 'create' ? { maToaNha: form.maToaNha.trim(), maKhu: form.maKhu } : {}),
      tenToaNha: form.tenToaNha.trim(),
      soTang: Number(form.soTang),
    };
    try {
      if (form.mode === 'create') await housingApi.createBuilding(payload);
      else await housingApi.updateBuilding(form.maToaNha, payload);
      setForm(null);
      setNotice(form.mode === 'create' ? 'Đã thêm tòa nhà. Tòa nhà mới được đưa vào phạm vi của bạn.' : 'Đã cập nhật thông tin tòa nhà.');
      await loadBuildings();
    } catch (requestError) {
      setFormError(requestError.response?.data?.message || 'Không thể lưu thông tin tòa nhà.');
    } finally {
      setSaving(false);
    }
  };

  const deleteBuilding = async (building) => {
    if (!window.confirm(`Xóa tòa nhà ${building.tenToaNha}? Chỉ tòa nhà chưa có phòng hoặc lịch sử hoạt động mới xóa được.`)) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await housingApi.deleteBuilding(building.maToaNha);
      setNotice('Đã xóa tòa nhà trống.');
      await loadBuildings();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể xóa tòa nhà.');
    } finally {
      setSaving(false);
    }
  };

  return <FacilitiesLayout
    title="Danh mục phòng và tòa nhà"
    description="Quản lý thông tin tòa nhà trong khu được phân công; phòng được quản lý tại mục Phòng & CSVC."
    actions={<>
      <button type="button" onClick={loadBuildings} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Tải lại</button>
      <button type="button" onClick={openCreate} disabled={!locations.length} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"><Plus className="h-4 w-4" />Thêm tòa nhà</button>
    </>}
  >
    <div className="space-y-5">
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Khu trong phạm vi</p><p className="mt-1 text-2xl font-bold text-blue-800">{locations.length}</p></div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Tòa nhà</p><p className="mt-1 text-2xl font-bold text-slate-900">{buildings.length}</p></div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Tổng số tầng</p><p className="mt-1 text-2xl font-bold text-indigo-700">{buildings.reduce((sum, building) => sum + Number(building.soTang || 0), 0)}</p></div>
      </section>

      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

      <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:p-5">
          <div><h2 className="font-bold text-slate-900">Danh sách tòa nhà</h2><p className="mt-1 text-xs text-slate-500">Nhân viên CSVC chỉ quản lý khu đã được phân công.</p></div>
          <label className="relative block w-full sm:w-80"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo mã, tên tòa nhà hoặc khu" className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm" /></label>
        </div>
        {loading ? <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Đang tải danh mục...</div>
          : filteredBuildings.length === 0 ? <div className="p-12 text-center text-sm text-slate-500">{buildings.length ? 'Không có tòa nhà khớp nội dung tìm kiếm.' : 'Chưa có tòa nhà trong phạm vi được phân công.'}</div>
            : <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">{filteredBuildings.map((building) => <article key={building.maToaNha} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3"><span className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><Building2 className="h-5 w-5" /></span><div className="min-w-0"><h3 className="truncate font-bold text-slate-900">{building.tenToaNha}</h3><p className="mt-1 text-xs text-slate-500">Mã tòa: {building.maToaNha}</p></div></div>
                <div className="flex shrink-0 gap-1"><button type="button" disabled={saving} onClick={() => openEdit(building)} aria-label={`Sửa ${building.tenToaNha}`} className="rounded-lg p-2 text-blue-700 hover:bg-blue-50 disabled:opacity-50"><Pencil className="h-4 w-4" /></button><button type="button" disabled={saving} onClick={() => deleteBuilding(building)} aria-label={`Xóa ${building.tenToaNha}`} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button></div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700"><MapPin className="h-3 w-3" />{building.tenKhu}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">{building.soTang} tầng</span></div>
              {building.diaChiKhu && <p className="mt-3 text-xs text-slate-500">{building.diaChiKhu}</p>}
            </article>)}</div>}
      </section>
    </div>

    {form && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setForm(null); }}>
      <form onSubmit={saveBuilding} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between"><div><h2 className="text-lg font-bold text-slate-900">{form.mode === 'create' ? 'Thêm tòa nhà' : 'Cập nhật tòa nhà'}</h2><p className="mt-1 text-sm text-slate-500">Thông tin này được dùng trong danh mục phòng và ghi chỉ số điện nước.</p></div><button type="button" disabled={saving} onClick={() => setForm(null)} aria-label="Đóng" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
        {form.mode === 'create' && <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">Mã tòa nhà<input required maxLength="20" pattern="[A-Za-z0-9_-]+" value={form.maToaNha} onChange={(event) => setForm({ ...form, maToaNha: event.target.value })} className={inputClass} placeholder="Ví dụ: A7" /></label>
          <label className="text-sm font-semibold text-slate-700">Khu<select required value={form.maKhu} onChange={(event) => setForm({ ...form, maKhu: event.target.value })} className={inputClass}>{locations.map((khu) => <option key={khu.maKhu} value={khu.maKhu}>{khu.tenKhu}</option>)}</select></label>
        </div>}
        <label className="block text-sm font-semibold text-slate-700">Tên tòa nhà<input required maxLength="120" value={form.tenToaNha} onChange={(event) => setForm({ ...form, tenToaNha: event.target.value })} className={inputClass} placeholder="Ví dụ: Nhà A7" /></label>
        <label className="block text-sm font-semibold text-slate-700">Số tầng<input required type="number" min="1" max="100" step="1" value={form.soTang} onChange={(event) => setForm({ ...form, soTang: event.target.value })} className={inputClass} /></label>
        {formError && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</p>}
        <div className="flex justify-end gap-2 border-t pt-4"><button type="button" disabled={saving} onClick={() => setForm(null)} className="rounded-xl border px-4 py-2 text-sm font-medium text-slate-700">Hủy</button><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{form.mode === 'create' ? 'Thêm tòa nhà' : 'Lưu thay đổi'}</button></div>
      </form>
    </div>}
  </FacilitiesLayout>;
};

export default BuildingManagement;
