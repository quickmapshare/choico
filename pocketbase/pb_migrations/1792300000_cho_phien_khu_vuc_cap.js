/// <reference path="../pb_data/types.d.ts" />
//
// Khu vực theo hai cấp: tỉnh/thành phố (cap = tinh_thanh) và xã/phường (cap = xa_phuong, thuộc một tỉnh qua trường cha).

migrate((app) => {
  const khuVuc = app.findCollectionByNameOrId("cho_phien_khu_vuc");
  khuVuc.fields.add(new SelectField({ name: "cap", maxSelect: 1, values: ["tinh_thanh", "xa_phuong"] }));
  khuVuc.fields.add(new RelationField({ name: "cha", collectionId: khuVuc.id, maxSelect: 1, cascadeDelete: false }));
  app.save(khuVuc);
}, (app) => {
  const khuVuc = app.findCollectionByNameOrId("cho_phien_khu_vuc");
  khuVuc.fields.removeByName("cap");
  khuVuc.fields.removeByName("cha");
  app.save(khuVuc);
});
