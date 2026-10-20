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
- Lịch âm dùng thuật toán Việt Nam tự viết trong `src/lib/am-lich-vn.js` (UTC+7, theo Hồ Ngọc Đức). Không dùng thư viện Trung Quốc (UTC+8) vì lệch một ngày ở một số tháng.
- Mọi quy tắc lịch cần có bộ test với các trường hợp biên (tháng nhuận, cuối tháng âm).

## Phạm vi và thứ tự làm việc
1. Schema PocketBase: chợ, khu vực, lịch phiên, trạng thái xác minh.
2. Astro: trang khu vực và trang từng chợ, lấy dữ liệu lúc build, có schema dữ liệu có cấu trúc.
3. Cloudflare Pages: kết nối repo, cấu hình build hook.
4. Widget "hôm nay có phiên không" và test lịch.
5. Nhập thủ công một quận (20–30 chợ) để kiểm chứng.

Chỉ mở rộng sang quận khác khi đã có tín hiệu nhu cầu (lượt hiển thị và nhấp trong Google Search Console tăng đều).

## Quyết định đã chốt
- 2026-10-20: PocketBase cho Chợ phiên dùng chung instance của botgap (`api.botgap.dev`), collection tiền tố `cho_phien_`. Không dùng PocketBase của FormMail Hub.
- 2026-10-20: Lịch âm dùng thuật toán Việt Nam UTC+7 tự viết (`src/lib/am-lich-vn.js`), không dùng `lunar-javascript`. Đã khớp mùng 1 Tết 2020–2026 và tháng nhuận 6/2025. Chưa đối chiếu với lịch vạn niên Việt Nam ngoài các mốc đó.
- 2026-10-20: Dùng miền miễn phí của Cloudflare Pages `https://chophien.pages.dev/` cho giai đoạn đầu. Repo: `quickmapshare/cho-phien`, branch `main`, không cần build command (trang tĩnh).

## Trạng thái hiện tại
- Đã có trang lịch âm `/am-lich/` (và `/en/am-lich/`): xem từng tháng dương kèm ngày âm, lưới vẽ phía client theo `luoiThang()` trong `src/lib/lich-phien.js`. Dòng "Âm lịch:" dưới header link vào trang này. Chưa deploy lên Cloudflare Pages.
- Đã có trang tạm `index.html` deploy lên Cloudflare Pages tại `https://chophien.pages.dev/`.
- Đã có `docs/ideas.md` (ý tưởng và câu hỏi mở, cập nhật 2026-10-20).
- Đã tạo schema PocketBase trên PocketBase của botgap (`api.botgap.dev`, cùng VPS, không phải PocketBase của FormMail Hub): collection `cho_phien_khu_vuc` và `cho_phien_cho`, rule null. Migration ghi trong `pocketbase/pb_migrations/1792000000_cho_phien_schema.js`. Migration này đã áp dụng bằng API, chưa chạy qua `deploy-pb.sh` của snapask.me, nên không copy file này sang repo snapask.me nếu chưa xử lý.
- Đã có engine lịch phiên `src/lib/lich-phien.js` (ngày âm, ngày cuối tháng âm, chu kỳ), 11 test Vitest (`npm test`) gồm tháng nhuận 2025 và Tết 2026.
- Đã có Astro (`npm run build`): trang chủ có widget "hôm nay có phiên", trang khu vực `/khu-vuc/[slug]/`, trang chợ `/cho/[slug]/`. Build lấy dữ liệu từ PocketBase bằng `PB_URL`, `PB_ADMIN_EMAIL`, `PB_ADMIN_PASSWORD`. Đã kiểm tra build với PocketBase thật (chưa có chợ nào nên trang còn trống). Widget chưa kiểm thử trên trình duyệt.
- Cần làm trên Cloudflare Pages: build command `npm run build`, output directory `dist`, thêm 3 biến môi trường trên. Trước khi đổi, `index.html` tạm ở root vẫn được giữ để trang không hỏng.
- Đã có hàng chờ góp ý `cho_phien_gop_y` (báo sai, đề xuất chợ mới), ai cũng gửi được, không đọc được công khai. Form ở trang chợ và trang khu vực.
- AI sơ duyệt: `scripts/ai-duyet-gop-y.mjs` gắn nhãn `ai_khuyen_nghi` và `ai_ly_do`. Không đổi trạng thái, không đưa lên web. Cần `ANTHROPIC_API_KEY` và chạy thủ công hoặc theo lịch. Chưa chạy được thực tế vì chưa có khóa.
- Chưa làm: nhập chợ thật (cần nguồn đã xác minh).

## Lưu ý khi làm việc
- Commit sau mỗi bước nhỏ, message rõ ràng.
- Khi kết thúc phiên, cập nhật mục "Trạng thái hiện tại" và "Quyết định đã chốt".
