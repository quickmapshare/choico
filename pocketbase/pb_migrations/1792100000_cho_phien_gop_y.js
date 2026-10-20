/// <reference path="../pb_data/types.d.ts" />
//
// Hàng chờ góp ý của người xem: báo thông tin sai và đề xuất chợ mới.
//  - Ai cũng gửi được (createRule), nhưng chỉ được tạo với trang_thai = "cho_duyet".
//  - Không ai đọc được qua API công khai (list / view / update / delete = null): chỉ superuser xem và duyệt.
//  - Trang công khai không đọc collection này, nên góp ý không tự lên web. Chỉ khi superuser duyệt và nhập vào cho_phien_cho.
//  - Email người gửi là tùy chọn và không hiện công khai.

migrate((app) => {
  const khuVuc = app.findCollectionByNameOrId("cho_phien_khu_vuc");
  const cho = app.findCollectionByNameOrId("cho_phien_cho");

  const gopY = new Collection({
    type: "base",
    name: "cho_phien_gop_y",
    listRule: null,
    viewRule: null,
    createRule: '@request.body.trang_thai = "cho_duyet"',
    updateRule: null,
    deleteRule: null,
    fields: [
      { type: "select", name: "loai", required: true, maxSelect: 1, values: ["bao_sai", "them_cho"] },
      { type: "relation", name: "cho", collectionId: cho.id, maxSelect: 1, cascadeDelete: false },
      { type: "relation", name: "khu_vuc", collectionId: khuVuc.id, maxSelect: 1, cascadeDelete: false },
      { type: "text", name: "ten_cho", max: 200 },
      { type: "text", name: "dia_chi", max: 500 },
      { type: "text", name: "noi_dung", required: true, min: 10, max: 2000 },
      { type: "url", name: "nguon_url", max: 500 },
      { type: "text", name: "nguoi_gui", max: 100 },
      { type: "email", name: "email" },
      { type: "select", name: "trang_thai", required: true, maxSelect: 1, values: ["cho_duyet", "da_nhan", "tu_choi"] },
      { type: "autodate", name: "created", onCreate: true, onUpdate: false },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
    ],
  });
  app.save(gopY);
}, (app) => {
  try {
    app.delete(app.findCollectionByNameOrId("cho_phien_gop_y"));
  } catch (_) {}
});
