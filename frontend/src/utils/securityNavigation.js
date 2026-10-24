import { Home, ShieldAlert, Users } from 'lucide-react';

export const securitySections = [
  { id: 'home', to: '/security', label: 'Trang chủ', Icon: Home },
  {
    id: 'visitors', to: '/security/visitors', label: 'Quản lý khách', Icon: Users,
    description: 'Ghi nhận khách đến, người được thăm, mục đích ra vào và cập nhật thời điểm khách rời KTX.',
  },
  {
    id: 'violations', to: '/security/violations', label: 'Ghi nhận vi phạm nội quy', Icon: ShieldAlert,
    description: 'Lập biên bản sự việc, ghi nhận mức độ vi phạm và biện pháp đã thực hiện đối với sinh viên nội trú.',
  },
];
