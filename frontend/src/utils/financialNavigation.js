import { History, Receipt, WalletCards } from 'lucide-react';

export const financialSections = [
  {
    id: 'invoices',
    to: '/financial-dashboard/invoices',
    label: 'Hóa đơn tháng',
    description: 'Lập hóa đơn từ chỉ số CSVC đã ghi, thu phí và hoàn tiền.',
    Icon: Receipt,
  },
  {
    id: 'transactions',
    to: '/financial-dashboard/transactions',
    label: 'Giao dịch',
    description: 'Tra cứu sổ giao dịch và xác minh các khoản cần đối chiếu.',
    Icon: History,
  },
  {
    id: 'reconciliation',
    to: '/financial-dashboard/reconciliation',
    label: 'Đối soát thu chi',
    description: 'Tổng hợp khoản thu, hoàn tiền, chi sửa chữa và xuất sổ thu chi.',
    Icon: WalletCards,
  },
];
