/// <reference path="../pb_data/types.d.ts" />
//
// Nhiều loại cờ (cờ tướng, cờ vua) trên cùng các collection:
//  - co_tuong_tran, cho_phien_co_van, cho_phien_co_diem: thêm trường tro_choi (loại cờ). Bản ghi cũ được điền "co_tuong";
//    code vẫn coi tro_choi rỗng là cờ tướng (locTroChoi trong src/lib/tro-choi.js) để bản ghi do code cũ ghi trong lúc
//    chuyển phiên bản vẫn đúng.
//  - cho_phien_co_diem: mỗi người một dòng điểm cho mỗi loại cờ, nên chỉ mục duy nhất theo tên và theo người chơi đổi
//    thành theo (tên, loại cờ) và (người chơi, loại cờ).
//  - co_tuong_tin_hieu: bản ghi cố định "sanhcovuadai001" là chuông chung của sảnh thượng đài cờ vua.
// Đã áp dụng bằng API admin ngày 2026-10-24. Khi đó chỉ điền "co_tuong" cho cho_phien_co_diem và cho_phien_co_van;
// co_tuong_tran để trống vì sửa qua API làm đổi trường updated (dùng để dọn trận cũ và hạn nước "nghĩ thoải mái").
// Thêm loại cờ mới: thêm mã vào values của ba trường tro_choi và một bản ghi chuông sảnh.

const LOAI = ["co_tuong", "co_vua"];

migrate((app) => {
  for (const ten of ["co_tuong_tran", "cho_phien_co_van", "cho_phien_co_diem"]) {
    const c = app.findCollectionByNameOrId(ten);
    c.fields.add(new SelectField({ name: "tro_choi", maxSelect: 1, values: LOAI }));
    if (ten === "cho_phien_co_diem") {
      c.indexes = c.indexes.filter((i) => !i.includes("idx_cho_phien_co_diem_ten") && !i.includes("idx_cho_phien_co_diem_nguoi"));
      c.indexes.push("CREATE UNIQUE INDEX `idx_cho_phien_co_diem_ten` ON `cho_phien_co_diem` (`ten`, `tro_choi`)");
      c.indexes.push("CREATE UNIQUE INDEX `idx_cho_phien_co_diem_nguoi` ON `cho_phien_co_diem` (`nguoi_choi`, `tro_choi`) WHERE `nguoi_choi` != ''");
    }
    app.save(c);
    app.db().newQuery(`UPDATE ${ten} SET tro_choi = 'co_tuong' WHERE tro_choi = ''`).execute();
  }

  const sanh = new Record(app.findCollectionByNameOrId("co_tuong_tin_hieu"));
  sanh.set("id", "sanhcovuadai001");
  sanh.set("phien", 0);
  app.save(sanh);
}, (app) => {
  app.delete(app.findRecordById("co_tuong_tin_hieu", "sanhcovuadai001"));
  for (const ten of ["co_tuong_tran", "cho_phien_co_van", "cho_phien_co_diem"]) {
    const c = app.findCollectionByNameOrId(ten);
    if (ten === "cho_phien_co_diem") {
      c.indexes = c.indexes.filter((i) => !i.includes("idx_cho_phien_co_diem_ten") && !i.includes("idx_cho_phien_co_diem_nguoi"));
      c.indexes.push("CREATE UNIQUE INDEX `idx_cho_phien_co_diem_ten` ON `cho_phien_co_diem` (`ten`)");
      c.indexes.push("CREATE UNIQUE INDEX `idx_cho_phien_co_diem_nguoi` ON `cho_phien_co_diem` (`nguoi_choi`) WHERE `nguoi_choi` != ''");
    }
    c.fields.removeByName("tro_choi");
    app.save(c);
  }
});
