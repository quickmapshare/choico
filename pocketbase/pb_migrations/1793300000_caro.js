/// <reference path="../pb_data/types.d.ts" />
//
// Thêm loại cờ caro (xem 1793200000_tro_choi.js khi thêm cờ vua):
//  - co_tuong_tran, cho_phien_co_van, cho_phien_co_diem: thêm "caro" vào values của trường tro_choi.
//  - co_tuong_tin_hieu: bản ghi cố định "sanhcarodai0001" là chuông chung của sảnh thượng đài caro.
// Đã áp dụng bằng API admin ngày 2026-10-24.

migrate((app) => {
  for (const ten of ["co_tuong_tran", "cho_phien_co_van", "cho_phien_co_diem"]) {
    const c = app.findCollectionByNameOrId(ten);
    const f = c.fields.getByName("tro_choi");
    f.values = [...f.values, "caro"];
    app.save(c);
  }

  const sanh = new Record(app.findCollectionByNameOrId("co_tuong_tin_hieu"));
  sanh.set("id", "sanhcarodai0001");
  sanh.set("phien", 0);
  app.save(sanh);
}, (app) => {
  app.delete(app.findRecordById("co_tuong_tin_hieu", "sanhcarodai0001"));
  for (const ten of ["co_tuong_tran", "cho_phien_co_van", "cho_phien_co_diem"]) {
    const c = app.findCollectionByNameOrId(ten);
    const f = c.fields.getByName("tro_choi");
    f.values = f.values.filter((v) => v !== "caro");
    app.save(c);
  }
});
