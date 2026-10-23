// Nghe chuông báo realtime (SSE) của PocketBase cho trận đấu và sảnh thượng đài.
// Chuông là một bản ghi trong co_tuong_tin_hieu, server tăng số phiên bản mỗi khi có thay đổi. Nghe được thì trang mới gọi
// Pages Function lấy trạng thái, thay cho việc hỏi liên tục mỗi giây.
// Kết nối bị cắt sau khoảng 2 phút im lặng (proxy phía trước PocketBase), nên phải tự kết nối lại và đăng ký lại.
// Trang vẫn giữ một lần đọc dự phòng thưa (vài chục giây) phòng khi chuông không tới.
import { PB_URL } from "./tai-khoan.js";

const CHO_MO_LAI_MS = 3000; // EventSource đóng hẳn (không tự thử lại) thì mở lại sau từng này

// idChuong: mã bản ghi chuông. khiDoi(banGhi): gọi khi chuông rung (kèm bản ghi chuông, có thể có tóm tắt trận "tom_tat"),
// và khi vừa kết nối lại (không kèm gì, vì có thể đã lỡ thay đổi trong lúc mất kết nối).
// khiTrangThai(dangNghe): báo đang nghe được hay không, để trang chọn nhịp đọc dự phòng. Trả về hàm dừng nghe.
export function ngheTinHieu(idChuong, khiDoi, khiTrangThai = () => {}) {
  if (typeof EventSource === "undefined" || !idChuong) {
    khiTrangThai(false);
    return () => {};
  }
  const chuDe = `co_tuong_tin_hieu/${idChuong}`;
  let es = null;
  let dung = false;
  let lanDau = true;
  let henMoLai;

  function mo() {
    es = new EventSource(`${PB_URL}/api/realtime`);
    // Mỗi lần (kết nối lại) PocketBase cấp clientId mới, phải đăng ký lại chủ đề cho clientId đó
    es.addEventListener("PB_CONNECT", async (e) => {
      try {
        const { clientId } = JSON.parse(e.data);
        const r = await fetch(`${PB_URL}/api/realtime`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ clientId, subscriptions: [chuDe] }),
        });
        if (!r.ok) throw new Error("dang_ky_loi");
        khiTrangThai(true);
        if (!lanDau) khiDoi();
        lanDau = false;
      } catch {
        khiTrangThai(false);
      }
    });
    es.addEventListener(chuDe, (e) => {
      let banGhi = null;
      try {
        banGhi = JSON.parse(e.data).record ?? null;
      } catch {
        // dữ liệu lạ: vẫn báo đổi, trang tự đọc lại cả trận
      }
      khiDoi(banGhi);
    });
    es.onerror = () => {
      khiTrangThai(false);
      // Thường EventSource tự kết nối lại; nếu nó đã đóng hẳn thì tự mở lại
      if (es.readyState === EventSource.CLOSED && !dung) {
        clearTimeout(henMoLai);
        henMoLai = setTimeout(mo, CHO_MO_LAI_MS);
      }
    };
  }

  mo();
  return () => {
    dung = true;
    clearTimeout(henMoLai);
    es?.close();
  };
}
