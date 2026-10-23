/// <reference path="../pb_data/types.d.ts" />
//
// Thượng đài và khép kín: collection co_tuong_tran lưu từng trận giữa hai người thật.
//  - do, den: id tài khoản (co_tuong_nguoi_choi) hoặc "k_<uuid>" nếu là khách không đăng nhập (khép kín, không tính điểm).
//  - ma: mã chia sẻ ngẫu nhiên. Với khép kín là mã người tạo gửi cho bạn.
//  - Quyền đọc/ghi chỉ qua Pages Function (tài khoản admin), không mở ra cho trình duyệt.

migrate((app) => {
  const tran = new Collection({
    type: "base",
    name: "co_tuong_tran",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { type: "text", name: "ma", required: true, min: 16, max: 64 },
      { type: "select", name: "loai", required: true, maxSelect: 1, values: ["dai", "khep_kin"] },
      { type: "select", name: "che_do", maxSelect: 1, values: ["cung", "moi"] }, // thượng đài: cùng mức hoặc mọi mức
      { type: "number", name: "cap_do", min: 1, max: 5 },
      { type: "select", name: "trang_thai", required: true, maxSelect: 1, values: ["cho", "dang_dau", "ket_thuc", "huy"] },
      { type: "text", name: "do", max: 64 },
      { type: "text", name: "den", max: 64 },
      { type: "text", name: "ten_do", max: 50 },
      { type: "text", name: "ten_den", max: 50 },
      { type: "json", name: "nuoc", maxSize: 4000 },
      { type: "text", name: "han_nuoc", max: 40 }, // ISO: hết giờ của nước hiện tại
      { type: "text", name: "het_han", max: 40 }, // ISO: hạn của mã khép kín
      { type: "select", name: "ket_qua", maxSelect: 1, values: ["do", "den", "hoa"] },
      { type: "text", name: "ly_do", max: 40 },
      { type: "bool", name: "da_tinh_diem" },
      { type: "autodate", name: "created", onCreate: true, onUpdate: false },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX `idx_co_tuong_tran_ma` ON `co_tuong_tran` (`ma`)",
    ],
  });
  app.save(tran);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("co_tuong_tran"));
});
