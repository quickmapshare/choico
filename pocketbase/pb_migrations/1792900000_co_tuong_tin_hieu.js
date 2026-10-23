/// <reference path="../pb_data/types.d.ts" />
//
// Chuông báo cho trận giữa hai người và sảnh thượng đài: trình duyệt nghe realtime (SSE) thay vì hỏi server liên tục.
//  - co_tuong_tin_hieu: mỗi bản ghi chỉ có một số phiên bản "phien". Server tăng số này mỗi khi trận (hoặc sảnh) thay đổi,
//    trình duyệt nghe được thì mới gọi Pages Function lấy trạng thái. Không chứa dữ liệu trận nên lộ ra cũng vô hại.
//    viewRule "" (ai biết mã bản ghi thì nghe được), listRule null (không liệt kê, không nghe cả collection), chỉ admin ghi.
//  - Bản ghi cố định "sanhthuongdai01" là chuông chung của sảnh thượng đài.
//  - co_tuong_tran.tin_hieu: mã bản ghi chuông của trận đó.

migrate((app) => {
  const tinHieu = new Collection({
    type: "base",
    name: "co_tuong_tin_hieu",
    listRule: null,
    viewRule: "",
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { type: "number", name: "phien", min: 0 },
      { type: "autodate", name: "created", onCreate: true, onUpdate: false },
    ],
  });
  app.save(tinHieu);

  const sanh = new Record(tinHieu);
  sanh.set("id", "sanhthuongdai01");
  sanh.set("phien", 0);
  app.save(sanh);

  const tran = app.findCollectionByNameOrId("co_tuong_tran");
  tran.fields.add(new TextField({ name: "tin_hieu", max: 20 }));
  app.save(tran);
}, (app) => {
  const tran = app.findCollectionByNameOrId("co_tuong_tran");
  tran.fields.removeByName("tin_hieu");
  app.save(tran);
  app.delete(app.findCollectionByNameOrId("co_tuong_tin_hieu"));
});
