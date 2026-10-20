/// <reference path="../pb_data/types.d.ts" />
//
// Thêm trường AI sơ duyệt vào hàng chờ góp ý. AI chỉ ghi khuyến nghị, không đổi trang_thai.

migrate((app) => {
  const gopY = app.findCollectionByNameOrId("cho_phien_gop_y");
  gopY.createRule = '@request.body.trang_thai = "cho_duyet" && @request.body.ai_khuyen_nghi = "" && @request.body.ai_ly_do = ""';
  gopY.fields.add(new SelectField({ name: "ai_khuyen_nghi", maxSelect: 1, values: ["nen_nhan", "can_xem_lai", "nen_tu_choi"] }));
  gopY.fields.add(new TextField({ name: "ai_ly_do", max: 1000 }));
  gopY.fields.add(new DateField({ name: "ai_danh_gia_luc" }));
  app.save(gopY);
}, (app) => {
  const gopY = app.findCollectionByNameOrId("cho_phien_gop_y");
  gopY.createRule = '@request.body.trang_thai = "cho_duyet"';
  for (const name of ["ai_khuyen_nghi", "ai_ly_do", "ai_danh_gia_luc"]) gopY.fields.removeByName(name);
  app.save(gopY);
});
