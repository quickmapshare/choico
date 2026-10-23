/// <reference path="../pb_data/types.d.ts" />
//
// Chuông báo của trận mang kèm tóm tắt trận "tom_tat" ({ n, ky, han, trang_thai, gui }: số nước, nước cuối, hạn nước,
// trạng thái, giờ bên đi bấm nước). Trình duyệt bên kia đi quân ngay từ tóm tắt khi chuông rung, không phải gọi Pages Function
// đọc lại trận. Chưa có trường này thì PocketBase bỏ qua giá trị gửi lên, trình duyệt đọc lại cả trận như trước.

migrate((app) => {
  const tinHieu = app.findCollectionByNameOrId("co_tuong_tin_hieu");
  tinHieu.fields.add(new JSONField({ name: "tom_tat", maxSize: 2000 }));
  app.save(tinHieu);
}, (app) => {
  const tinHieu = app.findCollectionByNameOrId("co_tuong_tin_hieu");
  tinHieu.fields.removeByName("tom_tat");
  app.save(tinHieu);
});
