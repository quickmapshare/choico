// Các tính năng có thể giới hạn theo người dùng (ví dụ làm tính năng trả phí sau này). Dùng chung cho trình duyệt và
// Pages Function: trình duyệt dựa vào đây để ẩn hoặc hiện nút, server dựa vào đây để cho hay không cho lấy dữ liệu.
// Muốn thu phí một tính năng: đổi duocDung để đọc gói của người dùng (ví dụ trường goi trên co_tuong_nguoi_choi) và cho
// server truyền người dùng vào. Hiện mọi tính năng đều mở cho tất cả.
//   xem_lai: xem lại ván đấu máy và trận giữa hai người (trên trang chơi và qua link /xem-van/)
export const TINH_NANG = ["xem_lai"];

// nguoi: { id, tai_khoan, goi? } hoặc null nếu chưa đăng nhập
export function duocDung(tinhNang, nguoi = null) {
  void nguoi;
  return TINH_NANG.includes(tinhNang);
}
