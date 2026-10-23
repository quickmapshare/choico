/// <reference path="../pb_data/types.d.ts" />
//
// co_tuong_tran.ip_bam: mã băm IP của khách tạo link khép kín (HMAC-SHA256, không lưu IP gốc). Dùng để giới hạn số link
// một máy được tạo trong 10 phút. Trận do tài khoản tạo để trống.

migrate((app) => {
  const tran = app.findCollectionByNameOrId("co_tuong_tran");
  tran.fields.add(new TextField({ name: "ip_bam", max: 64 }));
  app.save(tran);
}, (app) => {
  const tran = app.findCollectionByNameOrId("co_tuong_tran");
  tran.fields.removeByName("ip_bam");
  app.save(tran);
});
