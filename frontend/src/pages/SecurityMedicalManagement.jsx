/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowDownToLine, Building2, ClipboardList, Clock3, HeartPulse, Loader2, RefreshCw, ShieldAlert, ShieldCheck, Stethoscope, UserRound, Users, Pill } from 'lucide-react';
import FacilitiesLayout from '../components/FacilitiesLayout';
import MedicalLayout, { MedicalPanel, MedicalStat } from '../components/MedicalLayout';
import SecurityLayout from '../components/SecurityLayout';
import { securityMedicalApi } from '../services/securityMedicalApi';

const facilityControlClass = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
const labelClass = 'block text-sm font-semibold text-slate-700';
const medicalButtonClass = 'inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60';
const formatDate = (value) => {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Chưa cập nhật' : date.toLocaleString('vi-VN');
};
const localDateTime = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};
const emptyHealthRecord = () => ({ bloodType: '', allergies: '', medicalConditions: '', currentMedications: '', emergencyContactName: '', emergencyContactPhone: '', notes: '' });
const recordValues = (record) => record ? Object.fromEntries(Object.keys(emptyHealthRecord()).map((key) => [key, record[key] || ''])) : emptyHealthRecord();

const ResidentSearch = ({ residents, value, onChange, className }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const selected = residents.find((resident) => resident.maSV === value);
  const normalize = (text) => text.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  const matches = query.trim() ? residents.filter((resident) => normalize(`${resident.hoTen} ${resident.maSV} ${resident.soPhong} ${resident.tenToaNha}`).includes(normalize(query.trim()))).slice(0, 30) : [];
  return <div className="relative">
    <input className={className} required value={selected ? `${selected.hoTen} · ${selected.maSV} · Phòng ${selected.soPhong} (${selected.tenToaNha})` : query}
      onChange={(event) => { onChange(''); setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
      onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }} placeholder="Tìm theo tên, mã SV, phòng hoặc tòa nhà" autoComplete="off" />
    {open && !selected && query.trim() && <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border bg-white shadow-lg">
      {matches.length ? matches.map((resident) => <button type="button" key={resident.maSV} onClick={() => { onChange(resident.maSV); setQuery(''); setOpen(false); }} className="block w-full px-3 py-2 text-left text-sm font-normal hover:bg-blue-50 focus:bg-blue-50">{resident.hoTen} · {resident.maSV} · Phòng {resident.soPhong} ({resident.tenToaNha})</button>) : <p className="p-3 text-sm font-normal text-slate-500">Không tìm thấy sinh viên phù hợp.</p>}
    </div>}
    {!selected && query.trim() && <p className="mt-1 text-xs font-normal text-slate-500">Chọn một sinh viên trong kết quả tìm kiếm.</p>}
  </div>;
};

const SecurityMedicalManagement = ({ securitySection = null }) => {
  const role = useSelector((state) => state.auth.user?.role);
  const isSecurityWorkspace = ['access', 'violations'].includes(securitySection);
  const isMedicalWorkspace = role === 'MEDICAL_OFFICER';
  const canSecurity = role === 'SECURITY' || role === 'ADMIN';
  const canMedical = !isSecurityWorkspace && (role === 'MEDICAL_OFFICER' || role === 'ADMIN');
  const loadAccessLogs = canSecurity && (!isSecurityWorkspace || securitySection === 'access');
  const loadViolations = canSecurity && (!isSecurityWorkspace || securitySection === 'violations');
  const [staffTab, setStaffTab] = useState(canSecurity ? 'access' : 'health');
  const [searchParams] = useSearchParams();
  const medicalTab = searchParams.get('section') === 'incidents' ? 'incidents' : 'health';
  const staffTabAllowed = (canSecurity && ['access', 'violations'].includes(staffTab))
    || (canMedical && ['health', 'incidents'].includes(staffTab));
  const activeTab = isSecurityWorkspace ? securitySection : isMedicalWorkspace ? medicalTab : staffTabAllowed ? staffTab : canSecurity ? 'access' : 'health';
  const controlClass = isMedicalWorkspace
    ? 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
    : facilityControlClass;
  const [buildings, setBuildings] = useState([]);
  const [residents, setResidents] = useState([]);
  const [accessLogs, setAccessLogs] = useState([]);
  const [violations, setViolations] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [medicalIncidents, setMedicalIncidents] = useState([]);
  const [selectedHealthResident, setSelectedHealthResident] = useState('');
  const [healthForm, setHealthForm] = useState(emptyHealthRecord);
  const [accessForm, setAccessForm] = useState({ visitorName: '', visitorPhone: '', visitorType: 'GUEST', vehiclePlate: '', maToaNha: '', maSinhVien: '', purpose: '', note: '', checkedInAt: localDateTime() });
  const [violationForm, setViolationForm] = useState({ maSinhVien: '', category: 'NOISE', severity: 'LOW', description: '', actionTaken: '', occurredAt: localDateTime() });
  const [incidentForm, setIncidentForm] = useState({ maSinhVien: '', incidentType: 'ILLNESS', symptoms: '', treatment: '', medicationName: '', medicationDose: '', medicationQuantity: '', followUp: '', occurredAt: localDateTime() });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const requests = [securityMedicalApi.residents(isSecurityWorkspace && securitySection === 'access' ? 'assigned' : undefined)];
      if (loadAccessLogs) requests.push(securityMedicalApi.accessLogs());
      if (loadViolations) requests.push(securityMedicalApi.violations());
      if (canMedical) requests.push(securityMedicalApi.healthRecords(), securityMedicalApi.medicalIncidents());
      const results = await Promise.all(requests);
      const directory = results[0] || { buildings: [], residents: [] };
      setBuildings(directory.buildings || []);
      setResidents(directory.residents || []);
      let resultIndex = 1;
      if (loadAccessLogs) setAccessLogs(results[resultIndex++] || []);
      if (loadViolations) setViolations(results[resultIndex++] || []);
      if (canMedical) {
        const records = results[resultIndex++] || [];
        setHealthRecords(records);
        setMedicalIncidents(results[resultIndex++] || []);
        setSelectedHealthResident((current) => current || directory.residents?.[0]?.maSV || '');
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể tải dữ liệu. Hãy kiểm tra kết nối và thử lại.');
    } finally {
      setLoading(false);
    }
  }, [canMedical, loadAccessLogs, loadViolations, isSecurityWorkspace, securitySection]);

  useEffect(() => { load(); }, [load]);

  const healthRecordByStudent = useMemo(() => new Map(healthRecords.map((record) => [record.maSinhVien, record])), [healthRecords]);
  const currentHealthRecord = healthRecordByStudent.get(selectedHealthResident);

  useEffect(() => {
    setHealthForm(recordValues(currentHealthRecord));
  }, [selectedHealthResident, currentHealthRecord]);

  const runAction = async (action, successMessage, onSuccess) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await action();
      if (onSuccess) onSuccess(response);
      setNotice(response.message || successMessage);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể lưu thông tin. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const submitAccessLog = (event) => {
    event.preventDefault();
    runAction(() => securityMedicalApi.createAccessLog({
      ...accessForm,
      maSinhVien: accessForm.maSinhVien || null,
      checkedInAt: new Date(accessForm.checkedInAt).toISOString(),
    }), 'Đã ghi nhận khách vào KTX.', (response) => {
      setAccessLogs((current) => [response.data, ...current]);
      setAccessForm((current) => ({ visitorName: '', visitorPhone: '', visitorType: 'GUEST', vehiclePlate: '', maToaNha: current.maToaNha, maSinhVien: '', purpose: '', note: '', checkedInAt: localDateTime() }));
    });
  };

  const checkOut = (id) => runAction(
    () => securityMedicalApi.checkoutAccessLog(id),
    'Đã cập nhật giờ khách ra.',
    (response) => setAccessLogs((current) => current.map((item) => item.id === id ? response.data : item))
  );

  const submitViolation = (event) => {
    event.preventDefault();
    if (!violationForm.maSinhVien) { setError('Vui lòng chọn sinh viên từ kết quả tìm kiếm.'); return; }
    runAction(() => securityMedicalApi.createViolation({ ...violationForm, occurredAt: new Date(violationForm.occurredAt).toISOString() }), 'Đã ghi nhận vi phạm nội quy.', (response) => {
      setViolations((current) => [response.data, ...current]);
      setViolationForm((current) => ({ ...current, description: '', actionTaken: '', occurredAt: localDateTime() }));
    });
  };

  const submitHealthRecord = (event) => {
    event.preventDefault();
    if (!selectedHealthResident) return;
    runAction(() => securityMedicalApi.saveHealthRecord(selectedHealthResident, healthForm), 'Đã lưu hồ sơ sức khỏe.', (response) => {
      setHealthRecords((current) => [response.data, ...current.filter((record) => record.maSinhVien !== selectedHealthResident)]);
    });
  };

  const submitMedicalIncident = (event) => {
    event.preventDefault();
    runAction(() => securityMedicalApi.createMedicalIncident({
      ...incidentForm,
      medicationQuantity: incidentForm.medicationQuantity || null,
      occurredAt: new Date(incidentForm.occurredAt).toISOString(),
    }), 'Đã ghi nhận sự cố y tế.', (response) => {
      setMedicalIncidents((current) => [response.data, ...current]);
      setIncidentForm((current) => ({ ...current, symptoms: '', treatment: '', medicationName: '', medicationDose: '', medicationQuantity: '', followUp: '', occurredAt: localDateTime() }));
    });
  };

  const tabs = [
    ...(canSecurity ? [
      { key: 'access', label: 'Khách ra vào', Icon: ArrowDownToLine },
      { key: 'violations', label: 'Vi phạm nội quy', Icon: ShieldAlert },
    ] : []),
    ...(canMedical ? [
      { key: 'health', label: 'Hồ sơ sức khỏe', Icon: HeartPulse },
      { key: 'incidents', label: 'Sự cố y tế & thuốc', Icon: Stethoscope },
    ] : []),
  ];
  const selectedResident = residents.find((resident) => resident.maSV === selectedHealthResident);
  const violationResident = residents.find((resident) => resident.maSV === violationForm.maSinhVien);
  const pageTitle = isSecurityWorkspace
    ? activeTab === 'access' ? 'Quản lý khách' : 'Ghi nhận vi phạm nội quy'
    : isMedicalWorkspace ? activeTab === 'incidents' ? 'Sự cố y tế & thuốc' : 'Hồ sơ sức khỏe' : canMedical ? 'An ninh & y tế' : 'Trật tự - trị an';
  const pageDescription = isSecurityWorkspace
    ? activeTab === 'access' ? 'Ghi nhận khách vào, theo dõi lượt thăm và cập nhật giờ ra.' : 'Lập biên bản và theo dõi vi phạm nội quy của sinh viên nội trú.'
    : canMedical && !canSecurity
    ? 'Tra cứu hồ sơ sinh viên nội trú toàn KTX và quản lý thông tin sức khỏe.'
    : 'Ghi nhận và theo dõi nghiệp vụ theo vai trò được cấp.';
  const additionalMenuItems = [
    ...(canMedical ? [{ to: '/students', label: 'Hồ sơ sinh viên', Icon: Users }] : []),
    { to: '/security-medical', label: canMedical ? 'Quản lý y tế' : 'Trật tự - trị an', Icon: canMedical ? HeartPulse : ShieldCheck },
  ];
  const WorkspaceLayout = isSecurityWorkspace ? SecurityLayout : isMedicalWorkspace ? MedicalLayout : FacilitiesLayout;

  const renderResidentSelect = (value, onChange, required = true) => <select required={required} value={value} onChange={(event) => onChange(event.target.value)} className={controlClass}>
    <option value="">{required ? 'Chọn sinh viên đang lưu trú' : 'Khách không gắn với một sinh viên cụ thể'}</option>
    {residents.map((resident) => <option key={resident.maSV} value={resident.maSV}>{resident.hoTen} · {resident.maSV} · Phòng {resident.soPhong} ({resident.tenToaNha})</option>)}
  </select>;

  const renderHeader = (title, description, Icon) => <div className="mb-5 flex items-start gap-3">
    <span className="rounded-xl bg-blue-50 p-3 text-blue-800"><Icon className="h-5 w-5" /></span>
    <div><h2 className="text-lg font-bold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div>
  </div>;

  return <WorkspaceLayout
    title={pageTitle}
    description={pageDescription}
    additionalMenuItems={additionalMenuItems}
    actions={<button type="button" onClick={load} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Làm mới</button>}
  >
        <div className={isMedicalWorkspace ? 'space-y-5' : 'mx-auto w-full max-w-7xl space-y-5'}>
          {isMedicalWorkspace ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MedicalStat label="Cư dân đang lưu trú" value={residents.length} Icon={Users} />
            <MedicalStat label="Tòa nhà trong KTX" value={buildings.length} Icon={Building2} color="emerald" />
            <MedicalStat label="Hồ sơ sức khỏe" value={healthRecords.length} Icon={HeartPulse} color="amber" />
            <MedicalStat label="Sự cố y tế" value={medicalIncidents.length} Icon={Stethoscope} color="violet" />
          </div> : !isSecurityWorkspace && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3"><span className="rounded-xl bg-indigo-50 p-3 text-indigo-700"><ShieldCheck className="h-6 w-6" /></span><div><h2 className="text-lg font-bold">{canMedical ? 'Cư dân trong toàn KTX' : 'Công việc trong phạm vi được phân công'}</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{canSecurity && canMedical ? 'Ghi nhận lượt khách, vi phạm nội quy, hồ sơ sức khỏe và sự cố trên toàn KTX.' : canMedical ? 'Tra cứu hồ sơ sinh viên đang lưu trú tại tất cả tòa nhà; cập nhật sức khỏe, sơ cứu và cấp thuốc.' : 'Kiểm soát khách ra vào và ghi nhận biên bản vi phạm của cư dân trong tòa nhà được phân công.'}</p></div></div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><Users className="h-5 w-5 text-blue-700" /><div><p className="text-xs text-slate-500">Cư dân đang lưu trú</p><p className="font-bold">{residents.length}</p></div></div>
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><UserRound className="h-5 w-5 text-indigo-700" /><div><p className="text-xs text-slate-500">{canMedical ? 'Tòa nhà trong KTX' : 'Tòa nhà được phân công'}</p><p className="font-bold">{buildings.length}</p></div></div>
            </div>
          </section>}

          {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
          {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}

          {!isMedicalWorkspace && !isSecurityWorkspace && <div role="group" aria-label="Chức năng nghiệp vụ" className="grid grid-cols-2 gap-2 rounded-xl bg-slate-200/70 p-1 sm:flex sm:flex-wrap">
            {tabs.map(({ key, label, Icon }) => <button key={key} type="button" aria-pressed={activeTab === key} onClick={() => setStaffTab(key)} className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-center text-xs font-semibold transition sm:text-sm ${activeTab === key ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-600 hover:bg-white/60'}`}><Icon className="h-4 w-4 shrink-0" />{label}</button>)}
          </div>}

          {loading ? <section className="flex items-center justify-center gap-2 rounded-2xl border bg-white p-10 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin text-blue-700" />{canMedical ? 'Đang tải dữ liệu toàn KTX…' : 'Đang tải dữ liệu trong phạm vi được phân công…'}</section> : <>
            {activeTab === 'access' && canSecurity && <div className="grid items-start gap-5 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                {renderHeader('Ghi nhận khách vào', 'Ghi thông tin khách, người được thăm và giờ vào. Không lưu số định danh cá nhân của khách.', ClipboardList)}
                {!buildings.length && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Tài khoản chưa được gán tòa nhà. Hãy nhờ quản trị viên phân công tòa nhà trước.</p>}
                <form onSubmit={submitAccessLog} className="space-y-4">
                  <label className={labelClass}>Họ tên khách<input required maxLength={120} value={accessForm.visitorName} onChange={(event) => setAccessForm({ ...accessForm, visitorName: event.target.value })} className={controlClass} placeholder="Nhập họ tên khách" /></label>
                  <div className="grid gap-3 sm:grid-cols-2"><label className={labelClass}>Loại khách<select value={accessForm.visitorType} onChange={(event) => setAccessForm({ ...accessForm, visitorType: event.target.value })} className={controlClass}><option value="GUEST">Khách thăm</option><option value="DELIVERY">Giao hàng</option><option value="SERVICE">Nhà cung cấp dịch vụ</option><option value="OTHER">Khác</option></select></label><label className={labelClass}>Tòa nhà<select required value={accessForm.maToaNha} onChange={(event) => setAccessForm({ ...accessForm, maToaNha: event.target.value })} className={controlClass}><option value="">Chọn tòa nhà</option>{buildings.map((building) => <option key={building.maToaNha} value={building.maToaNha}>{building.tenToaNha} · {building.maKhu}</option>)}</select></label></div>
                  <label className={labelClass}>Người được thăm <span className="font-normal text-slate-500">(không bắt buộc)</span>{renderResidentSelect(accessForm.maSinhVien, (maSinhVien) => { const host = residents.find((resident) => resident.maSV === maSinhVien); setAccessForm({ ...accessForm, maSinhVien, ...(host ? { maToaNha: host.maToaNha } : {}) }); }, false)}</label>
                  <div className="grid gap-3 sm:grid-cols-2"><label className={labelClass}>Số điện thoại<input type="tel" maxLength={20} value={accessForm.visitorPhone} onChange={(event) => setAccessForm({ ...accessForm, visitorPhone: event.target.value })} className={controlClass} placeholder="Không bắt buộc" /></label><label className={labelClass}>Biển số xe<input maxLength={20} value={accessForm.vehiclePlate} onChange={(event) => setAccessForm({ ...accessForm, vehiclePlate: event.target.value })} className={controlClass} placeholder="Không bắt buộc" /></label></div>
                  <label className={labelClass}>Mục đích vào KTX<input required maxLength={500} value={accessForm.purpose} onChange={(event) => setAccessForm({ ...accessForm, purpose: event.target.value })} className={controlClass} placeholder="Ví dụ: thăm người thân, giao đồ" /></label>
                  <div className="grid gap-3 sm:grid-cols-2"><label className={labelClass}>Thời điểm vào<input required type="datetime-local" value={accessForm.checkedInAt} onChange={(event) => setAccessForm({ ...accessForm, checkedInAt: event.target.value })} className={controlClass} /></label><label className={labelClass}>Ghi chú<textarea maxLength={500} rows={1} value={accessForm.note} onChange={(event) => setAccessForm({ ...accessForm, note: event.target.value })} className={controlClass} placeholder="Ghi chú thêm" /></label></div>
                  <button disabled={busy || !buildings.length} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"><ArrowDownToLine className="h-4 w-4" />{busy ? 'Đang lưu…' : 'Ghi nhận khách vào'}</button>
                </form>
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b p-5"><div><h2 className="font-bold">Sổ khách ra vào</h2><p className="mt-1 text-xs text-slate-500">Hiển thị tối đa 200 lượt gần nhất</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">{accessLogs.length}</span></div>
                {accessLogs.length === 0 ? <div className="p-8 text-center"><Clock3 className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-2 text-sm font-medium text-slate-700">Chưa có lượt khách nào</p><p className="mt-1 text-xs text-slate-500">Lượt khách mới sẽ xuất hiện sau khi được ghi nhận.</p></div> : <div className="divide-y">{accessLogs.map((entry) => <article key={entry.id} className="p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{entry.visitorName}<span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">{{ GUEST: 'Khách thăm', DELIVERY: 'Giao hàng', SERVICE: 'Dịch vụ', OTHER: 'Khác' }[entry.visitorType] || entry.visitorType}</span></p><p className="mt-1 text-xs text-slate-500">{entry.toaNha?.tenToaNha} · {entry.phong?.soPhong ? `Phòng ${entry.phong.soPhong}` : 'Không ghi phòng'}{entry.sinhVien ? ` · ${entry.sinhVien.hoTen}` : ''}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${entry.checkedOutAt ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-800'}`}>{entry.checkedOutAt ? 'Đã ra' : 'Đang ở trong KTX'}</span></div><div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2"><p>Vào: {formatDate(entry.checkedInAt)}</p><p>Ra: {formatDate(entry.checkedOutAt)}</p><p className="sm:col-span-2">Mục đích: {entry.purpose}</p>{entry.visitorPhone && <p>Điện thoại: {entry.visitorPhone}</p>}{entry.vehiclePlate && <p>Biển số: {entry.vehiclePlate}</p>}{entry.note && <p className="whitespace-pre-wrap sm:col-span-2">Ghi chú: {entry.note}</p>}</div>{!entry.checkedOutAt && <button type="button" disabled={busy} onClick={() => checkOut(entry.id)} className="mt-3 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-50 disabled:opacity-50">Ghi nhận khách ra</button>}</article>)}</div>}
              </section>
            </div>}

            {activeTab === 'violations' && canSecurity && <div className="grid items-start gap-5 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                {renderHeader('Ghi nhận vi phạm nội quy', 'Biên bản gắn với sinh viên và phòng đang lưu trú trong toàn KTX.', ShieldAlert)}
                <form onSubmit={submitViolation} className="space-y-4">
                  <label className={labelClass}>Sinh viên nội trú<ResidentSearch residents={residents} value={violationForm.maSinhVien} onChange={(maSinhVien) => setViolationForm({ ...violationForm, maSinhVien })} className={controlClass} /></label>
                  {violationResident && <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><p className="font-semibold">Thông tin sinh viên</p><p className="mt-1">Lớp: {violationResident.lop || '—'} · Khoa: {violationResident.khoa || '—'} · Niên khóa: {violationResident.nienKhoa || '—'}</p><p>Ngày sinh: {violationResident.ngaySinh ? new Date(violationResident.ngaySinh).toLocaleDateString('vi-VN') : '—'} · Giới tính: {violationResident.gioiTinh == null ? '—' : violationResident.gioiTinh ? 'Nam' : 'Nữ'}</p><p>CCCD: {violationResident.cccd || '—'} · SĐT: {violationResident.phone || '—'}</p><p>Email: {violationResident.email || '—'} · Diện ưu tiên: {violationResident.dienUuTien || 'Không'}</p></div>}
                  <div className="grid gap-3 sm:grid-cols-2"><label className={labelClass}>Nhóm vi phạm<select value={violationForm.category} onChange={(event) => setViolationForm({ ...violationForm, category: event.target.value })} className={controlClass}><option value="NOISE">Gây tiếng ồn</option><option value="CURFEW">Vi phạm giờ giấc</option><option value="GUEST_POLICY">Vi phạm quy định khách</option><option value="SMOKING">Hút thuốc / chất cấm</option><option value="DAMAGE">Làm hư hỏng tài sản</option><option value="OTHER">Khác</option></select></label><label className={labelClass}>Mức độ<select value={violationForm.severity} onChange={(event) => setViolationForm({ ...violationForm, severity: event.target.value })} className={controlClass}><option value="LOW">Nhẹ</option><option value="MEDIUM">Trung bình</option><option value="HIGH">Nghiêm trọng</option></select></label></div>
                  <label className={labelClass}>Thời điểm xảy ra<input type="datetime-local" required value={violationForm.occurredAt} onChange={(event) => setViolationForm({ ...violationForm, occurredAt: event.target.value })} className={controlClass} /></label>
                  <label className={labelClass}>Nội dung sự việc<textarea required minLength={5} maxLength={2000} rows={4} value={violationForm.description} onChange={(event) => setViolationForm({ ...violationForm, description: event.target.value })} className={controlClass} placeholder="Ghi nhận sự việc khách quan, thời gian và địa điểm cụ thể." /></label>
                  <label className={labelClass}>Biện pháp đã thực hiện <span className="font-normal text-slate-500">(không bắt buộc)</span><textarea maxLength={1000} rows={2} value={violationForm.actionTaken} onChange={(event) => setViolationForm({ ...violationForm, actionTaken: event.target.value })} className={controlClass} placeholder="Nhắc nhở, lập biên bản, báo người phụ trách…" /></label>
                  <button disabled={busy || !residents.length} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"><ShieldAlert className="h-4 w-4" />{busy ? 'Đang lưu…' : 'Lưu biên bản'}</button>
                </form>
              </section>
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b p-5"><div><h2 className="font-bold">Biên bản đã ghi nhận</h2><p className="mt-1 text-xs text-slate-500">200 biên bản mới nhất trong toàn KTX</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">{violations.length}</span></div>{violations.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Chưa có biên bản vi phạm.</p> : <div className="divide-y">{violations.map((record) => <article key={record.id} className="p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{record.sinhVien?.hoTen} · {record.sinhVien?.maSV}</p><p className="mt-1 text-xs text-slate-500">{record.toaNha?.tenToaNha} · Phòng {record.phong?.soPhong || '—'} · {formatDate(record.occurredAt)}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${record.severity === 'HIGH' ? 'bg-rose-100 text-rose-800' : record.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>{record.severity === 'HIGH' ? 'Nghiêm trọng' : record.severity === 'MEDIUM' ? 'Trung bình' : 'Nhẹ'}</span></div><p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{record.description}</p>{record.actionTaken && <p className="mt-2 whitespace-pre-wrap text-xs text-slate-500">Biện pháp: {record.actionTaken}</p>}</article>)}</div>}</section>
            </div>}

            {activeTab === 'health' && canMedical && <div className="grid items-start gap-5 xl:grid-cols-[minmax(320px,0.72fr)_minmax(0,1.28fr)]">
              <MedicalPanel title="Hồ sơ sức khỏe" description="Thông tin sức khỏe của sinh viên đang lưu trú tại mọi tòa nhà trong KTX.">
                <label className={labelClass}>Chọn cư dân{renderResidentSelect(selectedHealthResident, setSelectedHealthResident)}</label>
                {selectedResident && <div className="mt-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">{selectedResident.hoTen} · {selectedResident.maSV}<br />{selectedResident.tenToaNha} · Phòng {selectedResident.soPhong}</div>}
                {!residents.length && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Chưa có cư dân nội trú trong KTX.</p>}
              </MedicalPanel>
              <MedicalPanel title="Thông tin y tế" description={currentHealthRecord ? `Cập nhật gần nhất ${formatDate(currentHealthRecord.updatedAt)}` : 'Chưa tạo hồ sơ cho sinh viên này'} actions={<span className="rounded-lg bg-rose-50 p-2 text-rose-700"><HeartPulse className="h-5 w-5" /></span>}>
                <form onSubmit={submitHealthRecord} className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2"><label className={labelClass}>Nhóm máu<select value={healthForm.bloodType} onChange={(event) => setHealthForm({ ...healthForm, bloodType: event.target.value })} className={controlClass}><option value="">Chưa rõ</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((type) => <option key={type}>{type}</option>)}</select></label><label className={labelClass}>Người liên hệ khẩn cấp<input maxLength={120} value={healthForm.emergencyContactName} onChange={(event) => setHealthForm({ ...healthForm, emergencyContactName: event.target.value })} className={controlClass} /></label></div>
                  <label className={labelClass}>Số điện thoại liên hệ khẩn cấp<input type="tel" maxLength={20} value={healthForm.emergencyContactPhone} onChange={(event) => setHealthForm({ ...healthForm, emergencyContactPhone: event.target.value })} className={controlClass} /></label>
                  <label className={labelClass}>Dị ứng<textarea rows={2} maxLength={1000} value={healthForm.allergies} onChange={(event) => setHealthForm({ ...healthForm, allergies: event.target.value })} className={controlClass} placeholder="Thuốc, thực phẩm hoặc tác nhân cần lưu ý" /></label>
                  <label className={labelClass}>Bệnh nền / tiền sử bệnh<textarea rows={2} maxLength={2000} value={healthForm.medicalConditions} onChange={(event) => setHealthForm({ ...healthForm, medicalConditions: event.target.value })} className={controlClass} /></label>
                  <label className={labelClass}>Thuốc đang sử dụng<textarea rows={2} maxLength={1000} value={healthForm.currentMedications} onChange={(event) => setHealthForm({ ...healthForm, currentMedications: event.target.value })} className={controlClass} /></label>
                  <label className={labelClass}>Ghi chú chuyên môn<textarea rows={3} maxLength={2000} value={healthForm.notes} onChange={(event) => setHealthForm({ ...healthForm, notes: event.target.value })} className={controlClass} /></label>
                  <button disabled={busy || !selectedHealthResident} className={medicalButtonClass}><ClipboardList className="h-4 w-4" />{busy ? 'Đang lưu…' : currentHealthRecord ? 'Cập nhật hồ sơ sức khỏe' : 'Tạo hồ sơ sức khỏe'}</button>
                </form>
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />Chỉ ghi thông tin cần thiết cho chăm sóc sức khỏe và xử lý tình huống khẩn cấp.</div>
              </MedicalPanel>
            </div>}

            {activeTab === 'incidents' && canMedical && <div className="grid items-start gap-5 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
              <MedicalPanel title="Ghi nhận sự cố y tế / cấp thuốc" description="Lưu biểu hiện, cách sơ cứu, thuốc và hướng dẫn theo dõi sau khi xử lý.">
                <form onSubmit={submitMedicalIncident} className="space-y-4">
                  <label className={labelClass}>Sinh viên{renderResidentSelect(incidentForm.maSinhVien, (maSinhVien) => setIncidentForm({ ...incidentForm, maSinhVien }))}</label>
                  <div className="grid gap-3 sm:grid-cols-2"><label className={labelClass}>Loại sự cố<select value={incidentForm.incidentType} onChange={(event) => setIncidentForm({ ...incidentForm, incidentType: event.target.value })} className={controlClass}><option value="ILLNESS">Ốm / bệnh</option><option value="INJURY">Chấn thương</option><option value="EMERGENCY">Cấp cứu</option><option value="MEDICATION">Cấp thuốc</option><option value="OTHER">Khác</option></select></label><label className={labelClass}>Thời điểm<input type="datetime-local" required value={incidentForm.occurredAt} onChange={(event) => setIncidentForm({ ...incidentForm, occurredAt: event.target.value })} className={controlClass} /></label></div>
                  <label className={labelClass}>Biểu hiện / tình trạng<textarea required minLength={3} maxLength={2000} rows={3} value={incidentForm.symptoms} onChange={(event) => setIncidentForm({ ...incidentForm, symptoms: event.target.value })} className={controlClass} /></label>
                  <label className={labelClass}>Sơ cứu / hướng xử lý<textarea required minLength={3} maxLength={2000} rows={3} value={incidentForm.treatment} onChange={(event) => setIncidentForm({ ...incidentForm, treatment: event.target.value })} className={controlClass} /></label>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><h3 className="flex items-center gap-2 text-sm font-bold text-slate-800"><Pill className="h-4 w-4 text-blue-700" />Thông tin thuốc đã cấp <span className="font-normal text-slate-500">(nếu có)</span></h3><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className={labelClass}>Tên thuốc<input maxLength={160} value={incidentForm.medicationName} onChange={(event) => setIncidentForm({ ...incidentForm, medicationName: event.target.value })} className={controlClass} /></label><label className={labelClass}>Liều dùng<input maxLength={120} value={incidentForm.medicationDose} onChange={(event) => setIncidentForm({ ...incidentForm, medicationDose: event.target.value })} className={controlClass} placeholder="Ví dụ: 1 viên sau ăn" /></label><label className={`${labelClass} sm:col-span-2`}>Số lượng<input type="number" min="1" step="1" value={incidentForm.medicationQuantity} onChange={(event) => setIncidentForm({ ...incidentForm, medicationQuantity: event.target.value })} className={controlClass} /></label></div></div>
                  <label className={labelClass}>Hướng dẫn theo dõi <span className="font-normal text-slate-500">(không bắt buộc)</span><textarea maxLength={1000} rows={2} value={incidentForm.followUp} onChange={(event) => setIncidentForm({ ...incidentForm, followUp: event.target.value })} className={controlClass} /></label>
                  <button disabled={busy || !residents.length} className={medicalButtonClass}><HeartPulse className="h-4 w-4" />{busy ? 'Đang lưu…' : 'Lưu sự cố y tế'}</button>
                </form>
              </MedicalPanel>
              <MedicalPanel title="Sự cố y tế gần đây" description="Lịch sử sự cố trên toàn KTX" noPadding actions={<span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">{medicalIncidents.length}</span>}>
                {medicalIncidents.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Chưa có sự cố y tế được ghi nhận.</p> : <div className="divide-y">{medicalIncidents.map((incident) => <article key={incident.id} className="p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{incident.sinhVien?.hoTen} · {incident.sinhVien?.maSV}</p><p className="mt-1 text-xs text-slate-500">{incident.toaNha?.tenToaNha} · Phòng {incident.phong?.soPhong || '—'} · {formatDate(incident.occurredAt)}</p></div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">{incident.incidentType}</span></div><p className="mt-3 text-sm text-slate-700"><strong>Biểu hiện:</strong> {incident.symptoms}</p><p className="mt-1 text-sm text-slate-700"><strong>Hướng xử lý:</strong> {incident.treatment}</p>{incident.medicationName && <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-indigo-800"><Pill className="h-4 w-4" />{incident.medicationName}{incident.medicationDose ? ` · ${incident.medicationDose}` : ''}{incident.medicationQuantity ? ` · ${incident.medicationQuantity} đơn vị` : ''}</p>}{incident.followUp && <p className="mt-2 whitespace-pre-wrap text-xs text-slate-500">Theo dõi: {incident.followUp}</p>}</article>)}</div>}
              </MedicalPanel>
            </div>}
          </>}
        </div>
  </WorkspaceLayout>;
};

export default SecurityMedicalManagement;
