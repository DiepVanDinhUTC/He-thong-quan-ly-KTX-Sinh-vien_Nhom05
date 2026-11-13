import React from 'react';

const articles = [
  ['Điều 1: Quy định chung', [
    'Giờ mở cửa: 5h00; giờ đóng cửa: 23h00.',
    'Thực hiện nếp sống văn minh, chấp hành nội quy, quy định của Nhà trường và Ký túc xá.',
    'Chấp hành nghiêm túc sự bố trí, sắp xếp chỗ ở và kiểm tra của cán bộ Phòng Chăm sóc người học.',
    'Nộp đủ và đúng hạn các khoản phí theo quy định.',
  ]],
  ['Điều 2: Quy định về sinh hoạt', [
    'Ra vào Ký túc xá đúng thời gian quy định.',
    'Không sử dụng rượu, bia, đồ uống có cồn; không đánh bạc dưới mọi hình thức.',
    'Không tàng trữ, sử dụng vũ khí, chất dễ gây cháy, nổ, các chất kích thích, chất gây nghiện, ma túy, các ấn phẩm đồi trụy, phản động.',
    'Không nấu ăn, không tàng trữ dụng cụ nấu trong phòng ở và trong khu vực Ký túc xá.',
    'Không viết, vẽ, đóng đinh, dán quảng cáo lên tường, trần nhà, trong khuôn viên Ký túc xá.',
    'Không che chắn gây mất mỹ quan trong phòng ở và khu vực sinh hoạt chung của Ký túc xá.',
    'Vệ sinh phòng ở phải gọn gàng, sạch sẽ; đồ dùng, phương tiện cá nhân phải để đúng nơi quy định.',
  ]],
  ['Điều 3: Quy định về an ninh trật tự - an ninh chính trị', [
    'Không đưa người khác vào phòng khi chưa được phép của Phòng Chăm sóc người học.',
    'Không tuyên truyền, tham gia các hoạt động liên quan đến tệ nạn xã hội, mê tín dị đoan, các hoạt động trái với quy định của Đảng và Nhà nước.',
    'Không gây gổ, đánh nhau, gây mất trật tự trong Ký túc xá.',
    'Không trèo tường, rào để vào, ra khỏi Ký túc xá; không tự ý lên sân thượng các tòa nhà.',
    'Chấp hành nghiêm túc các quy định về phòng cháy chữa cháy.',
  ]],
  ['Điều 4: Quy định về bảo vệ và giữ gìn tài sản', [
    'Sinh viên nội trú phải tự bảo quản tài sản cá nhân.',
    'Có ý thức giữ gìn, bảo vệ tài sản chung; chịu trách nhiệm đền bù những hư hỏng, mất mát do mình gây ra đối với trang thiết bị của Ký túc xá.',
    'Bàn giao phòng và tài sản trong phòng cho Phòng Chăm sóc người học khi hết thời hạn hợp đồng nội trú.',
  ]],
  ['Điều 5: Quy định về vệ sinh môi trường', [
    'Giữ gìn vệ sinh môi trường, vệ sinh phòng ở, hành lang, cầu thang, ban công và khu vực công cộng.',
    'Phân công người trực nhật, tập kết, đổ rác đúng nơi quy định.',
  ]],
];

export default function DormitoryRules() {
  return <div className="space-y-6 text-sm leading-7 text-slate-700">
    {articles.map(([title, items]) => <section key={title}>
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      <ol className="mt-2 list-decimal space-y-2 pl-6">{items.map((item) => <li key={item}>{item}</li>)}</ol>
    </section>)}
    <p className="rounded-xl bg-blue-50 p-4 font-medium text-blue-900">Mọi hành vi trái với nội quy trên tùy theo mức độ vi phạm sẽ bị xử lý theo quy định hiện hành.</p>
  </div>;
}
