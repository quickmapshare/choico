/// <reference path="../pb_data/types.d.ts" />
//
// Bảng điểm cờ tướng (PocketBase của botgap, tiền tố cho_phien_).
//  - cho_phien_co_diem: một dòng cho mỗi tên, điểm cộng dồn. Đọc công khai để hiện top 10. Ghi chỉ qua superuser.
//  - cho_phien_co_van: nhật ký các ván đã tính điểm. Chặn tính trùng cùng một ván. Không đọc công khai.
// Điểm chỉ được ghi bởi Pages Function sau khi chạy lại ván để kiểm tra (functions/api/co-tuong-van.js).

migrate((app) => {
  const diem = new Collection({
    type: "base",
    name: "cho_phien_co_diem",
    listRule: "",
    viewRule: "",
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { type: "text", name: "ten", required: true, min: 1, max: 20, pattern: "^\\p{L}+( \\p{L}+)*$" },
      { type: "number", name: "diem", required: true },
      { type: "number", name: "so_van", min: 0 },
      { type: "number", name: "thang", min: 0 },
      { type: "number", name: "hoa", min: 0 },
      { type: "number", name: "thua", min: 0 },
      { type: "autodate", name: "created", onCreate: true, onUpdate: false },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX `idx_cho_phien_co_diem_ten` ON `cho_phien_co_diem` (`ten`)",
      "CREATE INDEX `idx_cho_phien_co_diem_diem` ON `cho_phien_co_diem` (`diem`)",
    ],
  });
  app.save(diem);

  const van = new Collection({
    type: "base",
    name: "cho_phien_co_van",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { type: "text", name: "ma_van", required: true, min: 16, max: 64 },
      { type: "text", name: "ten", required: true, max: 20 },
      { type: "select", name: "ket_qua", required: true, maxSelect: 1, values: ["thang", "hoa", "thua"] },
      { type: "number", name: "diem_cong", required: true },
      { type: "autodate", name: "created", onCreate: true, onUpdate: false },
    ],
    indexes: [
      "CREATE UNIQUE INDEX `idx_cho_phien_co_van_ma` ON `cho_phien_co_van` (`ma_van`)",
    ],
  });
  app.save(van);
}, (app) => {
  for (const name of ["cho_phien_co_van", "cho_phien_co_diem"]) {
    const c = app.findCollectionByNameOrId(name);
    app.delete(c);
  }
});
