// Danh sách các loại cờ. Thêm loại cờ mới: tạo src/lib/<loại>/ (index.js theo giao diện bộ luật, may.js, may-worker.js,
// muc.js, ve.js), thêm một mục ở đây, ở src/lib/chung/trinh-duyet.js (vẽ bàn và máy) và chuỗi riêng ở src/i18n/.
// Dùng được ở cả trình duyệt lẫn Pages Function (không đụng tới DOM).
//
// Giao diện bộ luật (luat), mọi hàm thuần. Thế cờ "the" là { b, s, ... }: b là lưới HANG x COT các quân dạng bên + loại
// ("rK", "bP"...) hoặc null, quân vua/tướng luôn có loại "K"; s là bên đến lượt ("r" đi trước, "b" đi sau).
//   ma, HANG, COT, NUOC_TOI_DA, MAU_KY (mẫu ký hiệu nước đi)
//   khoiTao() → the                 saoChep(the) → the
//   nuocHopLe(the) → Nuoc[]          Nuoc = { tu: [r, c], den: [r, c], an: quân bị ăn | null, ... }
//   timNuoc(the, ky) → Nuoc | null    nước hợp lệ của bên đến lượt theo ký hiệu
//   apDung(the, m)                   đi nước hợp lệ m rồi đổi lượt
//   apKy(the, ky) → Nuoc | null      đi theo ký hiệu không kiểm luật (nước đã kiểm khi ghi)
//   kyHieu(m) → string               biChieu(the, s) → bool
//   ketThucNhanh(the, soNuoc)        kết thúc không cần sinh nước (hòa vì đủ nước, lặp thế...) → { ket_qua, ly_do } | null
//   ketThuc(the, soNuoc)             như trên, kể cả hết nước đi (chiếu hết, hết cờ)
//   quanBiAn(the) → { r: loại[], b: loại[] }
// ket_qua: "do" bên đi trước thắng, "den" bên đi sau thắng, "hoa".
import coTuong from "./co-tuong/index.js";
import coVua from "./co-vua/index.js";

// duong: đường dẫn các trang (chưa có tiền tố ngôn ngữ). Cờ tướng giữ đường dẫn cũ để link đã chia sẻ vẫn mở được.
// chuongSanh: mã bản ghi chuông chung của sảnh thượng đài (collection co_tuong_tin_hieu).
// khoaLuu: khóa localStorage của ván đang chơi với máy.
export const TRO_CHOI = {
  co_tuong: {
    ma: "co_tuong",
    luat: coTuong,
    duong: { cong: "/co-tuong/", may: "/co-tuong/may/", tran: "/tran/", dai: "/thuong-dai/", xemVan: "/xem-van/", nhung: "/nhung/co-tuong/", maNhung: "/nhung/co-tuong/ma/" },
    chuongSanh: "sanhthuongdai01",
    khoaLuu: "co-tuong-van-v2",
  },
  co_vua: {
    ma: "co_vua",
    luat: coVua,
    duong: { cong: "/co-vua/", may: "/co-vua/may/", tran: "/co-vua/tran/", dai: "/co-vua/thuong-dai/", xemVan: "/co-vua/xem-van/", nhung: "/nhung/co-vua/", maNhung: "/nhung/co-vua/ma/" },
    chuongSanh: "sanhcovuadai001",
    khoaLuu: "choico-co-vua-van",
  },
};

export const MA_TRO_CHOI = Object.keys(TRO_CHOI);
export const TRO_CHOI_MAC_DINH = "co_tuong";

// Loại cờ theo mã; rỗng (bản ghi từ trước khi có nhiều loại cờ) là cờ tướng. Mã lạ thì null.
export const layTroChoi = (ma) => TRO_CHOI[ma || TRO_CHOI_MAC_DINH] ?? null;

// Điều kiện lọc PocketBase theo loại cờ. Bản ghi cũ để trống tro_choi là cờ tướng.
export const locTroChoi = (ma) => (ma === TRO_CHOI_MAC_DINH ? `(tro_choi="${ma}" || tro_choi="")` : `tro_choi="${ma}"`);
