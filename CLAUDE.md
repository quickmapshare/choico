# Dự án: ChoiCo (cờ tướng nhúng)

## Mục tiêu
Bàn cờ tướng chơi với máy cùng các nút cần thiết (ván mới, hoàn nước, âm thanh, phóng to, bảng điểm), làm thành một trang có thể nhúng vào web bất kỳ (iframe hoặc script).

Mã này tách ra từ dự án Chợ phiên Việt Nam (repo `quickmapshare/cho-phien`), giữ nguyên lịch sử commit.

## Quy tắc chung
- Giao diện và nội dung tiếng Việt. Comment trong code và commit message bằng tiếng Việt.
- Commit sau mỗi bước nhỏ, message rõ ràng.

## Kiến trúc
- **Astro** build tĩnh, host trên Cloudflare Pages `https://choico.pages.dev/`. Trang chính `src/pages/co-tuong.astro`, khung `src/layouts/Layout.astro`.
- **Luật và máy đánh** nằm trong `src/lib/co-tuong*.js` (máy chạy trong Web Worker), có test Vitest trong `tests/` (`npm test`).
- **Pages Functions** `functions/api/co-tuong*.js`: gợi ý nước qua Claude (cần `ANTHROPIC_API_KEY`), ghi ván và bảng điểm, đổi tên (cần `PB_URL`, `PB_ADMIN_EMAIL`, `PB_ADMIN_PASSWORD`).
- Dữ liệu bảng điểm nằm trên PocketBase của botgap (`api.botgap.dev`), collection `cho_phien_co_diem`, `cho_phien_co_van`, dùng chung với Chợ phiên. Migration trong `pocketbase/pb_migrations/` đã áp dụng sẵn.

## Trạng thái hiện tại
- Mới tách code, chưa deploy. Cần tạo project Cloudflare Pages: build command `npm run build`, output `dist`, thêm các biến môi trường nói trên.
- Các hàm API đang chỉ cho phép nguồn `https://choico.pages.dev` (hằng `NGUON_CHO_PHEP`). Khi nhúng vào web khác cần quyết định cách xử lý nguồn.
- Hướng đi: trang Chợ phiên chỉ nhúng widget bàn cờ từ ChoiCo (iframe). Cần đăng nhập, lưu tên, bảng xếp hạng thì widget link sang ChoiCo, không làm trên Chợ phiên.
- Đã có trang nhúng gọn /nhung/co-tuong/ (bàn cờ và nút, không tiêu đề, ô tên, bảng điểm, có link sang /co-tuong/). Dùng chung component src/components/CoTuong.astro với trang đầy đủ. Nhúng bằng iframe, trang nhúng báo chiều cao qua postMessage({ choicoCao }).
- Trang lấy mã nhúng cho web bất kỳ: `/nhung/` (iframe và script chỉnh chiều cao, có xem trước).
- Đăng nhập Google (PocketBase OAuth2, collection auth `co_tuong_nguoi_choi`): đăng nhập chuyển hướng cả trang qua `/dang-nhap/`, token lưu localStorage, Pages Function kiểm tra bằng auth-refresh. Chỉ người đã đăng nhập mới ghi điểm và lên bảng xếp hạng; điểm cũ theo tên (chưa gắn tài khoản) không còn hiện. Tên hiển thị lấy từ tên Google, đổi được qua `/api/co-tuong-ho-so`. Migration `1792600000_co_tuong_dang_nhap.js` đã áp dụng bằng API; Google đã bật trong admin PocketBase và redirect URI `https://choico.pages.dev/dang-nhap/` đã thêm (chạy ổn).
- Giao diện: logo quân cờ tròn với hình X cung tướng (`src/components/Logo.astro`, `public/favicon.svg`). Mọi trang (trừ bản nhúng) có thanh đầu với logo link về trang chủ, menu Cờ tướng / Nhúng vào web, và chân trang link về trang chủ.
