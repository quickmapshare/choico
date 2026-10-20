/// <reference path="../pb_data/types.d.ts" />
//
// Schema dữ liệu chợ phiên, đặt trong PocketBase của botgap (api.botgap.dev).
// Mọi collection có tiền tố cho_phien_ để không lẫn với collection của botgap.
//  - Mọi rule = null: chỉ superuser đọc / ghi (build Astro đọc bằng superuser). Dữ liệu chưa xác minh không lộ ra client.
//  - Lịch phiên lưu dạng JSON có cấu trúc (mảng quy tắc), không lưu chuỗi mô tả.
//  - Chỉ hiển thị lịch phiên khi trang_thai_xac_minh = "da_xac_minh".

migrate((app) => {
  const khuVuc = new Collection({
    type: "base",
    name: "cho_phien_khu_vuc",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { type: "text", name: "ten", required: true, max: 200 },
      { type: "text", name: "slug", required: true, max: 200, pattern: "^[a-z0-9]+(-[a-z0-9]+)*$" },
      { type: "text", name: "ghi_chu", max: 2000 },
      { type: "autodate", name: "created", onCreate: true, onUpdate: false },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX `idx_cho_phien_khu_vuc_slug` ON `cho_phien_khu_vuc` (`slug`)",
    ],
  });
  app.save(khuVuc);

  const cho = new Collection({
    type: "base",
    name: "cho_phien_cho",
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { type: "text", name: "ten", required: true, max: 200 },
      { type: "text", name: "slug", required: true, max: 200, pattern: "^[a-z0-9]+(-[a-z0-9]+)*$" },
      { type: "relation", name: "khu_vuc", required: true, collectionId: khuVuc.id, maxSelect: 1, cascadeDelete: false },
      { type: "text", name: "dia_chi", max: 500 },
      { type: "number", name: "lat", min: -90, max: 90 },
      { type: "number", name: "lng", min: -180, max: 180 },
      { type: "text", name: "mo_ta", max: 4000 },
      { type: "text", name: "loai_hang", max: 500 },
      { type: "select", name: "trang_thai_xac_minh", required: true, maxSelect: 1, values: ["da_xac_minh", "chua_xac_minh"] },
      { type: "json", name: "lich_phien", maxSize: 50000 },
      { type: "json", name: "nguon", maxSize: 50000 },
      { type: "text", name: "xac_minh_boi", max: 200 },
      { type: "date", name: "xac_minh_ngay" },
      { type: "autodate", name: "created", onCreate: true, onUpdate: false },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX `idx_cho_phien_cho_slug` ON `cho_phien_cho` (`slug`)",
    ],
  });
  app.save(cho);
}, (app) => {
  for (const name of ["cho_phien_cho", "cho_phien_khu_vuc"]) {
    try {
      app.delete(app.findCollectionByNameOrId(name));
    } catch (_) {}
  }
});
