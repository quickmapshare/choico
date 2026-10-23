/// <reference path="../pb_data/types.d.ts" />
//
// Đăng nhập Google cho cờ tướng (PocketBase của botgap).
//  - co_tuong_nguoi_choi: collection auth, chỉ đăng nhập bằng OAuth2 (Google), không mật khẩu. Hồ sơ chỉ đọc/sửa qua Pages Function.
//    Cần bật nhà cung cấp Google trong giao diện admin (Client ID/Secret), và thêm redirect URI
//    https://choico.pages.dev/dang-nhap/ trong Google Cloud Console.
//  - cho_phien_co_diem, cho_phien_co_van: thêm trường nguoi_choi (id người chơi). Bảng xếp hạng chỉ tính dòng có trường này.

migrate((app) => {
  const nguoi = new Collection({
    type: "auth",
    name: "co_tuong_nguoi_choi",
    listRule: null,
    viewRule: null,
    createRule: '@request.context = "oauth2"', // chỉ tạo được qua đăng nhập OAuth2 lần đầu
    updateRule: null,
    deleteRule: null,
    passwordAuth: { enabled: false },
    oauth2: { enabled: true, mappedFields: { name: "name" } },
    authToken: { duration: 2592000 }, // 30 ngày
    fields: [
      { type: "text", name: "name", max: 100 },
      { type: "text", name: "ten", max: 50 }, // tên hiển thị trên bảng điểm, do Pages Function đặt
    ],
    indexes: [
      "CREATE UNIQUE INDEX `idx_co_tuong_nguoi_choi_ten` ON `co_tuong_nguoi_choi` (`ten`) WHERE `ten` != ''",
    ],
  });
  app.save(nguoi);

  const diem = app.findCollectionByNameOrId("cho_phien_co_diem");
  diem.fields.add(new TextField({ name: "nguoi_choi", max: 40 }));
  diem.indexes.push("CREATE UNIQUE INDEX `idx_cho_phien_co_diem_nguoi` ON `cho_phien_co_diem` (`nguoi_choi`) WHERE `nguoi_choi` != ''");
  app.save(diem);

  const van = app.findCollectionByNameOrId("cho_phien_co_van");
  van.fields.add(new TextField({ name: "nguoi_choi", max: 40 }));
  app.save(van);
}, (app) => {
  const diem = app.findCollectionByNameOrId("cho_phien_co_diem");
  diem.indexes = diem.indexes.filter((i) => !i.includes("idx_cho_phien_co_diem_nguoi"));
  diem.fields.removeByName("nguoi_choi");
  app.save(diem);
  const van = app.findCollectionByNameOrId("cho_phien_co_van");
  van.fields.removeByName("nguoi_choi");
  app.save(van);
  app.delete(app.findCollectionByNameOrId("co_tuong_nguoi_choi"));
});
