/// <reference path="../pb_data/types.d.ts" />
//
// Tên người chơi cờ tướng: tối đa 50 ký tự, có chữ số (số bị che khi hiện trên bảng xếp hạng).
// Bảng điểm không còn đọc công khai: trình duyệt đọc qua Pages Function (functions/api/co-tuong-bang-diem.js),
// nên tên gốc (có thể chứa số điện thoại) không lộ qua API công khai của PocketBase.

migrate((app) => {
  const diem = app.findCollectionByNameOrId("cho_phien_co_diem");
  diem.listRule = null;
  diem.viewRule = null;
  diem.fields.getByName("ten").max = 50;
  app.save(diem);

  const van = app.findCollectionByNameOrId("cho_phien_co_van");
  van.fields.getByName("ten").max = 50;
  app.save(van);
}, (app) => {
  const diem = app.findCollectionByNameOrId("cho_phien_co_diem");
  diem.listRule = "";
  diem.viewRule = "";
  diem.fields.getByName("ten").max = 20;
  app.save(diem);

  const van = app.findCollectionByNameOrId("cho_phien_co_van");
  van.fields.getByName("ten").max = 20;
  app.save(van);
});
