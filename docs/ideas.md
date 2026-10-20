# Danh sách ý tưởng

Cập nhật lần cuối: 2026-10-20

Cách dùng: mỗi ý tưởng có trạng thái (Mới / Đang nghiên cứu / Đang làm / Tạm gác / Bỏ), ngày ghi nhận và các câu hỏi cần trả lời tiếp. Khi bàn lại, cập nhật mục đó thay vì viết mục mới.

---

## 1. Mạng trao đổi traffic (traffic exchange)

- **Trạng thái:** Mới, đang đánh giá
- **Ngày ghi nhận:** 2026-10-19

### Ý tưởng gốc
Chủ web nhúng một đoạn mã giống AdSense để hiển thị banner hoặc link của web khác. Khi người dùng click vào banner, chủ web đó được cộng 1 điểm, và link của họ sẽ được hiển thị trên các web khác. Khi có nhiều click, họ có thể bán điểm hoặc mua thêm click khi cần.

### Đánh giá nhanh
- **Kỹ thuật:** không khó. Cần widget JS, API ghi nhận sự kiện, database, dashboard và hệ thống chống gian lận.
- **Hạ tầng và chi phí:** giai đoạn thử nghiệm gần như miễn phí (Cloudflare Workers, Supabase). Quy mô vài trăm web khoảng 50–200 USD/tháng. Phần tốn công nhất là chống gian lận và vận hành.
- **Rủi ro chính:**
  - Chất lượng click thấp, người dùng click để kiếm điểm, khó chuyển đổi.
  - Google AdSense và các ad network lớn cấm click có khuyến khích, có thể làm chủ web bị khóa tài khoản.
  - Cold start hai bên (chủ web và người mua).
  - Cạnh tranh với AdSense, Adsterra, PropellerAds.
  - Rủi ro pháp lý khi thu phí và xử lý dữ liệu người dùng.
- **Hướng đi có triển vọng hơn:** ghép theo ngách hẹp (web cùng chủ đề), tính điểm theo tương tác thật (thời gian xem, hành vi) thay vì click đơn thuần.

### Câu hỏi cần trả lời tiếp
- [ ] Nhắm đến nhóm web nào? (blog, shop, công cụ, cộng đồng...)
- [ ] Ngách nào có thể bắt đầu với 10–20 web?
- [ ] Đơn vị tính là click, lượt xem có tương tác, hay thời gian xem?
- [ ] Ai là người mua và họ sẵn sàng trả bao nhiêu cho một lượt traffic chất lượng?
- [ ] Có thể dùng traffic từ các sản phẩm hiện có (BC, FormMail Hub, botgap) để kiểm chứng không?

### Bước kiểm chứng đề xuất
1. Chọn ngách hẹp, 10–20 web cùng chủ đề tiếng Việt.
2. Làm bản đơn giản: banner, đếm click, quy đổi điểm thủ công.
3. Đo CTR, tỷ lệ tương tác và tỷ lệ chuyển đổi.
4. Hỏi 5–10 người mua tiềm năng về mức giá sẵn sàng trả.

---

## 2. Bản đồ chợ phiên Việt Nam

- **Trạng thái:** Mới
- **Ngày ghi nhận:** 2026-10-20

### Ý tưởng gốc
Làm một trang bản đồ chợ phiên ở Việt Nam. Khi mở bản đồ, người dùng thấy các chợ gần nhất đang có phiên chính trong ngày hôm nay.

### Điểm cần lưu ý
- **Dữ liệu là phần khó nhất:** chưa có nguồn mở, đầy đủ nào về danh sách chợ phiên và lịch phiên. Có thể bắt đầu bằng thu thập thủ công từ địa phương, cộng đồng đóng góp, hoặc báo chí và các trang du lịch.
- **Lịch phiên thường theo âm lịch hoặc quy ước địa phương:** ví dụ "phiên 5 ngày một lần", "họp vào ngày âm lịch 1, 5, 10…". Cần mô hình hóa được quy tắc lịch này, không chỉ lưu ngày cố định.
- **Bản đồ và vị trí:** dùng Google Maps hoặc OpenStreetMap. Tìm chợ gần nhất cần vị trí người dùng, nên phải xin quyền vị trí và có chế độ chọn khu vực thủ công.
- **Cập nhật dữ liệu:** phiên có thể thay đổi theo mùa, lễ hoặc quyết định địa phương. Cần cơ chế để người dùng báo sai và admin duyệt.
- **Giá trị:** đối tượng là người dân quê, người bán hàng rong, người làm du lịch trải nghiệm, và các nhà nghiên cứu văn hóa. Nhu cầu thật cần kiểm chứng.

### Đối tượng người dùng (nhận định, cần kiểm chứng)
- **Người buôn bán theo phiên:** nhóm có nhu cầu thật và thường xuyên nhất, cần biết hôm nay đi chợ nào, chợ nào đông.
- **Người dân quê:** đa số đã biết chợ gần nhà, ít cần ứng dụng. Có thể dùng khi đến xã hoặc tỉnh khác.
- **Người đi du lịch trải nghiệm, phượt thủ, người thích ẩm thực và văn hóa:** tìm "chợ phiên hôm nay" hoặc "chợ phiên gần đây". Lượng không lớn nhưng dễ lan truyền.
- **Người Việt xa quê:** nhóm nhỏ nhưng trung thành, tìm chợ quê của mình.

### Nhận định về nhu cầu
- Google Maps đã hiển thị nhiều chợ, nên chỉ thêm vị trí chợ thì giá trị chưa đủ.
- Điểm khác biệt phải là **thông tin phiên và lịch phiên đúng hôm nay**.
- Ý tưởng có thể có nhiều người quan tâm nhưng khó có số đông dùng hàng ngày.
- Triển vọng tốt nhất: làm nguồn dữ liệu chợ phiên đáng tin cậy trước, sau đó mới tính đến bản đồ và tính năng khác.

### Cách kiểm chứng nhu cầu với chi phí thấp
- Làm vài trang theo tỉnh, ví dụ "chợ phiên [tỉnh] hôm nay", theo dõi lượt hiển thị và lượt nhấp trong Google Search Console trong 1–2 tháng.
- Nếu lượt tìm kiếm tăng đều, đó là tín hiệu nhu cầu thật.
- Hỏi trực tiếp vài người buôn chợ phiên xem họ có dùng không và dùng để làm gì.

### Hướng tiếp cận SEO (đề xuất, 2026-10-20)
- Tạo trang theo khu vực và theo chợ, cấu trúc URL rõ ràng, ví dụ `/cho-phien/ha-noi/ten-cho`.
- Bắt đầu với một quận của Hà Nội, khoảng 20–30 chợ, làm kỹ thay vì nhiều trang sơ sài.
- Dữ liệu ban đầu thu thập thủ công: tên chợ, địa chỉ, lịch phiên, loại hàng nổi bật.
- Thêm dữ liệu có cấu trúc (schema, bản đồ, giờ phiên) để dễ hiển thị trong kết quả tìm kiếm.
- AI dùng để tìm và tổng hợp từ nguồn (báo địa phương, trang UBND xã/huyện, trang du lịch, bài cộng đồng), kèm link nguồn. AI không tự khẳng định dữ liệu.
- Người kiểm tra và đánh dấu "đã xác minh" hoặc "chưa xác minh". Chỉ hiển thị lịch phiên khi đã xác minh, hoặc ghi rõ nguồn và cần kiểm tra lại.
- Có nút "báo thông tin sai" và ghi rõ ngày cập nhật lần cuối.
- Tránh tạo hàng nghìn trang gần giống nhau (rủi ro bị Google coi là spam). Không cào dữ liệu từ Google Maps.
- Theo dõi: lượt hiển thị và nhấp theo cụm từ khóa trong Google Search Console, thời gian ở lại trang, người quay lại đúng ngày phiên. Đánh giá sau 1–2 tháng.

### Kiến trúc kỹ thuật (đề xuất, 2026-10-20)
- **PocketBase trên VPS Hetzner (2 vCPU, 4 GB RAM):** nhập và quản lý dữ liệu chợ, địa chỉ, lịch phiên, trạng thái đã xác minh. Dùng giao diện admin có sẵn để nhập thủ công.
- **Astro build thành HTML tĩnh:** lấy dữ liệu từ PocketBase lúc build, tạo trang cho từng chợ và từng khu vực. Đây là phần Google index.
- **Cloudflare Pages:** host bản build tĩnh, gói miễn phí đủ dùng. Khi dữ liệu đổi, PocketBase gọi build hook của Cloudflare để build lại.
- **Redis:** chưa cần, dữ liệu nhỏ và trang tĩnh đã nhanh. Có thể bỏ để giảm việc vận hành.
- **Phần "phiên hôm nay":** một đoạn JavaScript nhỏ trên trang, đọc quy tắc lịch đã nhúng sẵn và tính theo múi giờ Asia/Ho_Chi_Minh. Không cần server chạy liên tục.
- **Lịch âm:** dùng thư viện chuyển đổi âm dương (có sẵn trên npm). Lưu quy tắc phiên dạng có cấu trúc, không chỉ lưu chuỗi mô tả.
- **Rủi ro cần xử lý:**
  - Trang public không phụ thuộc VPS, nhưng VPS sập thì việc cập nhật dữ liệu dừng.
  - Bảo vệ PocketBase admin: đăng nhập mạnh, hạn chế IP nếu có thể, sao lưu định kỳ.
  - Build hook phải có xác thực để tránh bị gọi liên tục.
  - Nếu sau này có hàng nghìn chợ, thời gian build sẽ dài. Khi đó cân nhắc build tăng dần hoặc render động bằng Cloudflare Workers.

### Câu hỏi cần trả lời tiếp
- [ ] Phạm vi ban đầu: một tỉnh hay cả nước? (đề xuất: một quận Hà Nội)
- [ ] Nguồn dữ liệu chợ và lịch phiên lấy từ đâu, có ai đã làm chưa?
- [ ] Người dùng chính là ai, và họ mở bản đồ để làm gì?
- [ ] Có cần tính năng cộng đồng đóng góp dữ liệu không?
- [ ] Có kiếm tiền được không, hay chỉ là dự án phục vụ cộng đồng?

### Bước kiểm chứng đề xuất
1. Chọn một tỉnh, thu thập thủ công 30–50 chợ và lịch phiên.
2. Dựng bản đồ đơn giản với bộ lọc "đang có phiên hôm nay".
3. Đưa cho vài người dùng thật thử và xem họ có quay lại không.

---

<!-- Thêm ý tưởng mới bên dưới, theo mẫu trên -->
