# Dự án: Chợ phiên Việt Nam

## Mục tiêu
Trang thông tin chợ phiên ở Việt Nam, bắt đầu với một quận Hà Nội. Người dùng xem chợ nào có phiên hôm nay và lịch phiên của từng chợ. Mục tiêu giai đoạn đầu là kiểm chứng nhu cầu qua SEO, chưa kiếm tiền.

Bối cảnh chi tiết, các phương án đã cân nhắc và câu hỏi còn mở: xem `docs/ideas.md`.

## Quy tắc chung
- Ngôn ngữ: giao diện và nội dung tiếng Việt. Comment trong code và commit message bằng tiếng Việt.
- Dữ liệu chợ là thông tin thực tế. Không được tự suy đoán hay để AI điền dữ liệu chưa xác minh.
- Mỗi chợ có trạng thái xác minh: `da_xac_minh` hoặc `chua_xac_minh`. Chỉ hiển thị lịch phiên khi đã xác minh, nếu chưa thì ghi rõ nguồn và cần kiểm tra lại.
- Không cào dữ liệu từ Google Maps.
- Không tạo hàng loạt trang gần giống nhau, mỗi trang phải có thông tin thật.

## Kiến trúc
- **PocketBase** trên VPS Hetzner (2 vCPU, 4 GB RAM): nhập và quản lý dữ liệu chợ, khu vực, lịch phiên, trạng thái xác minh. Dùng giao diện admin để nhập thủ công.
- **Astro** build thành HTML tĩnh: lấy dữ liệu từ PocketBase lúc build, tạo trang cho từng khu vực và từng chợ. Đây là phần Google index.
- **Cloudflare Pages**: host bản build tĩnh. PocketBase gọi build hook khi dữ liệu thay đổi. Build hook phải có xác thực.
- **Widget "hôm nay có phiên không"**: JavaScript nhỏ chạy phía client, đọc quy tắc lịch đã nhúng sẵn, tính theo múi giờ Asia/Ho_Chi_Minh. Không cần server chạy liên tục.
- Redis: chưa dùng.

## Lịch phiên
- Lưu quy tắc phiên dạng có cấu trúc, không chỉ lưu chuỗi mô tả. Ví dụ: loại quy tắc (theo ngày âm lịch, theo chu kỳ ngày), tham số, ghi chú nguồn.
- Lịch âm dùng thư viện chuyển đổi âm dương trên npm. Ghi rõ thư viện đã chọn khi quyết định.
- Mọi quy tắc lịch cần có bộ test với các trường hợp biên (tháng nhuận, cuối tháng âm).

## Phạm vi và thứ tự làm việc
1. Schema PocketBase: chợ, khu vực, lịch phiên, trạng thái xác minh.
2. Astro: trang khu vực và trang từng chợ, lấy dữ liệu lúc build, có schema dữ liệu có cấu trúc.
3. Cloudflare Pages: kết nối repo, cấu hình build hook.
4. Widget "hôm nay có phiên không" và test lịch.
5. Nhập thủ công một quận (20–30 chợ) để kiểm chứng.

Chỉ mở rộng sang quận khác khi đã có tín hiệu nhu cầu (lượt hiển thị và nhấp trong Google Search Console tăng đều).

## Quyết định đã chốt
- 2026-10-20: Dùng miền miễn phí của Cloudflare Pages `https://chophien.pages.dev/` cho giai đoạn đầu. Repo: `quickmapshare/cho-phien`, branch `main`, không cần build command (trang tĩnh).

## Trạng thái hiện tại
- Đã có trang tạm `index.html` deploy lên Cloudflare Pages tại `https://chophien.pages.dev/`.
- Chưa bắt đầu schema PocketBase, Astro, widget. Thiếu `docs/ideas.md` trong repo.

## Lưu ý khi làm việc
- Commit sau mỗi bước nhỏ, message rõ ràng.
- Khi kết thúc phiên, cập nhật mục "Trạng thái hiện tại" và "Quyết định đã chốt".
