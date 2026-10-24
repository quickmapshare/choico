/// <reference path="../pb_data/types.d.ts" />
//
// cho_phien_co_diem.diem: bỏ required (vẫn min 0). PocketBase coi giá trị số 0 là "trống" ở trường bắt buộc, nên khi điểm
// của người chơi về 0 (ví dụ người mới thua ván đầu, vì điểm không xuống dưới 0) bước ghi điểm báo lỗi và ván không được tính.
// Đã áp dụng bằng API admin ngày 2026-10-24.

migrate((app) => {
  const c = app.findCollectionByNameOrId("cho_phien_co_diem");
  c.fields.getByName("diem").required = false;
  app.save(c);
}, (app) => {
  const c = app.findCollectionByNameOrId("cho_phien_co_diem");
  c.fields.getByName("diem").required = true;
  app.save(c);
});
