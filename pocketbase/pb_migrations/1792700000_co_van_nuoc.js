/// <reference path="../pb_data/types.d.ts" />
//
// Lưu nhật ký nước đi của ván để xem lại qua link.
//  - nuoc: danh sách nước đi theo đúng thứ tự (đỏ đi trước), đã bỏ các nước bị hoãn.
//  - so_hoan: số nước đã hoãn, để tính lại điểm khi xem.
// Ván tính điểm trước migration này không có nước đi, không xem lại được.

migrate((app) => {
  const van = app.findCollectionByNameOrId("cho_phien_co_van");
  van.fields.add(new JSONField({ name: "nuoc", maxSize: 4000 }));
  van.fields.add(new NumberField({ name: "so_hoan", min: 0, max: 10 }));
  app.save(van);
}, (app) => {
  const van = app.findCollectionByNameOrId("cho_phien_co_van");
  van.fields.removeByName("nuoc");
  van.fields.removeByName("so_hoan");
  app.save(van);
});
