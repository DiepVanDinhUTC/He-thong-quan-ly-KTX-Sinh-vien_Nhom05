import { ArrowLeftRight, CalendarDays, ClipboardCheck, DoorOpen, ShieldAlert, Users, Warehouse } from 'lucide-react';

export const archivistSections = [
  { id: 'students', to: '/archive-management?section=students', label: 'Hồ sơ sinh viên', Icon: Users, description: 'Tiếp nhận, đồng bộ và cập nhật hồ sơ sinh viên nội trú.' },
  { id: 'applications', to: '/archive-management?section=applications', label: 'Xét duyệt lưu trú', Icon: ClipboardCheck, description: 'Kiểm tra đăng ký lưu trú, lập và tra cứu hợp đồng.' },
  { id: 'rooms', to: '/archive-management?section=rooms', label: 'Xếp / chuyển phòng', Icon: DoorOpen, description: 'Tra cứu chỗ ở và thực hiện xếp, chuyển phòng cho sinh viên.' },
  { id: 'transfers', to: '/archive-management?section=transfers', label: 'Duyệt chuyển phòng', Icon: ArrowLeftRight, description: 'Xem xét yêu cầu chuyển phòng và cập nhật kết quả xử lý.' },
  { id: 'discipline', to: '/archive-management?section=discipline', label: 'Thông tin & kỷ luật', Icon: ShieldAlert, description: 'Tra cứu thông tin nội trú và ghi nhận hồ sơ vi phạm, kỷ luật.' },
];

export const militarySections = [
  { id: 'students', to: '/military-management?section=students', label: 'Học viên từ SIS', Icon: Users, description: 'Tiếp nhận danh sách học viên giáo dục quốc phòng từ SIS và kiểm tra hồ sơ.' },
  { id: 'rooms', to: '/military-management?section=rooms', label: 'Xếp phòng quân sự', Icon: DoorOpen, description: 'Sắp xếp chỗ ở cho học viên và theo dõi danh sách phòng quân sự.' },
  { id: 'equipment', to: '/military-management?section=equipment', label: 'Kho quân tư trang', Icon: Warehouse, description: 'Quản lý tồn kho, cấp phát và thu hồi quân tư trang theo học viên.' },
  { id: 'meetings', to: '/military-management?section=meetings', label: 'Phòng giao ban', Icon: CalendarDays, description: 'Quản lý phòng giao ban, đặt lịch và tra cứu các cuộc họp sắp tới.' },
];
