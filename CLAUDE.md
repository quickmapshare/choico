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
- Chưa làm: trang nhúng riêng (bản gọn chỉ bàn cờ và nút), script nhúng.
