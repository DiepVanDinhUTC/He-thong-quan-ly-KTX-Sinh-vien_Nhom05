import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowRight, Building2, ClipboardCheck, DoorOpen, FileText, Shield, WalletCards, Wrench, Zap } from 'lucide-react';
import { financialSections } from '../utils/financialNavigation';
import { archivistSections, militarySections } from '../utils/staffNavigation';
import { roleCanAccess } from '../utils/accessControl';

const facilityFunctions = [
  { to: '/rooms', label: 'Quản lý phòng & CSVC', Icon: DoorOpen, description: 'Tra cứu sơ đồ phòng, sức chứa và tình trạng thiết bị tại từng phòng.' },
  { to: '/buildings', label: 'Danh mục tòa nhà', Icon: Building2, description: 'Tra cứu và cập nhật thông tin các tòa nhà trong phạm vi phụ trách.' },
  { to: '/assets', label: 'Kho tài sản, thiết bị', Icon: Wrench, description: 'Quản lý danh mục, số lượng và tình trạng tài sản phục vụ nội trú.' },
  { to: '/meter-readings', label: 'Ghi chỉ số điện nước', Icon: Zap, description: 'Ghi nhận chỉ số theo phòng, theo kỳ để chuyển lập hóa đơn.' },
  { to: '/tickets', label: 'Yêu cầu sửa chữa', Icon: Wrench, description: 'Tiếp nhận báo hỏng, phân công và theo dõi tiến độ xử lý sự cố.' },
];

const homeContent = {
  ACCOUNTANT: {
    title: 'Nhân viên kế toán', eyebrow: 'Kế toán ký túc xá', Icon: WalletCards,
    introduction: 'Quản lý hóa đơn và sổ kế toán nội trú. Kiểm tra các khoản phải thu, đối chiếu giao dịch và tổng hợp thu chi theo từng kỳ để bảo đảm số liệu đầy đủ, chính xác.',
    functions: financialSections,
    steps: ['Kiểm tra kỳ tính phí và chỉ số điện nước trước khi lập hóa đơn tháng.', 'Tra cứu giao dịch, đối chiếu chứng từ và xác minh các khoản cần kiểm tra.', 'Rà soát thu chi, khoản hoàn và chi sửa chữa trước khi xuất sổ đối soát.'],
    scope: 'Hóa đơn, giao dịch và sổ thu chi của KTX được tổ chức theo kỳ. Chọn đúng tháng tại trang nghiệp vụ trước khi kiểm tra hoặc cập nhật số liệu.',
  },
  TREASURER: {
    title: 'Nhân viên tài chính · thủ quỹ', eyebrow: 'Tài chính và thủ quỹ', Icon: WalletCards,
    introduction: 'Theo dõi các khoản thu, hoàn tiền và chi trả của ký túc xá. Ghi nhận thanh toán, kiểm tra giao dịch và phối hợp đối soát để quản lý dòng tiền trong từng kỳ.',
    functions: [financialSections[1], financialSections[0], financialSections[2]],
    steps: ['Tra cứu hóa đơn và kiểm tra số tiền cần thu hoặc hoàn cho sinh viên.', 'Ghi nhận thanh toán, phương thức thu và mã tham chiếu; xác minh giao dịch cần đối chiếu.', 'Đối chiếu các khoản thu, hoàn và chi sửa chữa với sổ thu chi trong kỳ.'],
    scope: 'Các nghiệp vụ thu phí, hoàn tiền và chi sửa chữa được theo dõi trong sổ giao dịch. Kiểm tra chứng từ và trạng thái xác minh khi đối chiếu số tiền.',
  },
  ARCHIVIST: {
    title: 'Nhân viên hồ sơ lưu trữ', eyebrow: 'Hồ sơ và lưu trú sinh viên', Icon: FileText,
    introduction: 'Quản lý thông tin sinh viên xuyên suốt quá trình nội trú: từ tiếp nhận hồ sơ, xét duyệt lưu trú đến xếp phòng, chuyển phòng và lưu thông tin kỷ luật.',
    functions: archivistSections,
    steps: ['Tiếp nhận hoặc đồng bộ hồ sơ sinh viên, kiểm tra thông tin trước khi xét duyệt.', 'Kiểm tra đăng ký lưu trú và hợp đồng, sau đó thực hiện xếp phòng phù hợp.', 'Xử lý yêu cầu chuyển phòng và cập nhật hồ sơ, thông tin kỷ luật khi có phát sinh.'],
    scope: 'Không gian hồ sơ tập trung thông tin sinh viên, đăng ký lưu trú, hợp đồng và lịch sử xử lý. Chọn đúng sinh viên và kiểm tra chỗ ở hiện tại trước khi cập nhật.',
  },
  FACILITIES_MANAGER: {
    title: 'Nhân viên quản lý cơ sở vật chất', eyebrow: 'Cơ sở vật chất ký túc xá', Icon: Building2,
    introduction: 'Theo dõi phòng ở, tài sản và thiết bị tại các tòa được phân công. Chủ động ghi nhận điện nước, tiếp nhận báo hỏng và tổ chức sửa chữa để duy trì điều kiện sinh hoạt cho sinh viên.',
    functions: facilityFunctions,
    steps: ['Kiểm tra sơ đồ phòng và tình trạng tài sản tại các tòa phụ trách.', 'Ghi chỉ số điện nước đúng phòng, đúng kỳ để phục vụ tính phí.', 'Rà soát yêu cầu sửa chữa, phân công xử lý và cập nhật kết quả.'],
    scope: 'Dữ liệu phòng, điện nước và yêu cầu sửa chữa được hiển thị theo phạm vi tòa nhà phân công cho tài khoản. Liên hệ người quản lý tài khoản nếu thiếu tòa cần phụ trách.',
  },
  BUILDING_MANAGER: {
    title: 'Nhân viên quản lý CSVC tòa', eyebrow: 'Vận hành tòa nhà nội trú', Icon: Building2,
    introduction: 'Quản lý hoạt động nội trú tại tòa được phân công. Kết hợp theo dõi phòng và thiết bị, ghi điện nước, xử lý báo hỏng với tra cứu sinh viên, hợp đồng và yêu cầu lưu trú.',
    functions: [...facilityFunctions,
      { to: '/students', label: 'Hồ sơ sinh viên', Icon: FileText, description: 'Tra cứu sinh viên nội trú và thông tin chỗ ở trong phạm vi phụ trách.' },
      { to: '/contracts', label: 'Đăng ký & hợp đồng', Icon: ClipboardCheck, description: 'Kiểm tra đăng ký, theo dõi và cập nhật hợp đồng lưu trú.' },
      { to: '/self-service', label: 'Yêu cầu lưu trú', Icon: ClipboardCheck, description: 'Tiếp nhận các yêu cầu lưu trú và xử lý trả phòng theo phân quyền.' },
    ],
    steps: ['Kiểm tra phòng, thiết bị và danh sách sinh viên tại tòa đang phụ trách.', 'Ghi chỉ số điện nước và theo dõi tiến độ sửa chữa các sự cố phát sinh.', 'Tra cứu hợp đồng, tiếp nhận yêu cầu lưu trú và xử lý trả phòng theo phân quyền.'],
    scope: 'Các nghiệp vụ phòng ở, sinh viên, điện nước và sửa chữa gắn với tòa nhà được phân công. Kiểm tra đúng tòa, phòng và sinh viên trước khi thực hiện thay đổi.',
  },
  MILITARY_OFFICER: {
    title: 'Nhân viên quản lý quân sự', eyebrow: 'Quản lý học viên quân sự', Icon: Shield,
    introduction: 'Tổ chức lưu trú và bảo đảm điều kiện sinh hoạt cho học viên giáo dục quốc phòng. Tiếp nhận danh sách từ SIS, sắp xếp phòng, quản lý quân tư trang và điều phối lịch phòng giao ban.',
    functions: militarySections,
    steps: ['Tiếp nhận danh sách học viên từ SIS và kiểm tra kết quả đồng bộ.', 'Kiểm tra việc xếp phòng quân sự theo đợt học và chỗ ở hiện có.', 'Cấp phát, thu hồi quân tư trang và sắp xếp lịch sử dụng phòng giao ban.'],
    scope: 'Không gian quân sự tập trung danh sách học viên giáo dục quốc phòng, phòng ở quân sự, kho quân tư trang và phòng giao ban. Kiểm tra đúng học viên, đợt học và phòng trước khi cập nhật.',
  },
};

const StaffHomeContent = ({ role }) => {
  const user = useSelector((state) => state.auth.user);
  const content = homeContent[role || user?.role];
  if (!content) return null;
  const { Icon } = content;
  const functions = content.functions.filter(({ to }) => roleCanAccess(user.role, to.split('?')[0]));

  return <div className="mx-auto w-full max-w-7xl space-y-6">
    <section className="rounded-2xl bg-blue-900 p-6 text-white shadow-sm sm:p-8">
      <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-blue-100"><Icon className="h-4 w-4" />{content.eyebrow}</span>
      <h2 className="mt-5 text-2xl font-bold sm:text-3xl">Xin chào, {user.hoTen || user.username || 'bạn'}!</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-blue-100 sm:text-base">{content.introduction}</p>
    </section>

    <section aria-labelledby="staff-functions-title">
      <h2 id="staff-functions-title" className="text-lg font-bold text-slate-900">Nghiệp vụ của bạn</h2>
      <p className="mt-1 text-sm text-slate-500">Chọn một chức năng để bắt đầu công việc.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {functions.map(({ to, label, description, Icon: FunctionIcon }) => <Link key={to} to={to} className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><FunctionIcon className="h-5 w-5" /></span>
          <h3 className="mt-4 font-bold text-slate-900">{label}</h3>
          <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{description}</p>
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">Mở chức năng<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
        </Link>)}
      </div>
    </section>

    <section className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="flex items-center gap-2 font-bold text-slate-900"><ClipboardCheck className="h-5 w-5 text-blue-700" />Gợi ý công việc</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-slate-600">{content.steps.map((step) => <li key={step}>{step}</li>)}</ol>
      </div>
      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-6">
        <h2 className="flex items-center gap-2 font-bold text-blue-950"><Icon className="h-5 w-5 text-blue-700" />{content.title}</h2>
        <p className="mt-4 text-sm leading-7 text-slate-700">{content.scope}</p>
      </div>
    </section>
  </div>;
};

export default StaffHomeContent;
