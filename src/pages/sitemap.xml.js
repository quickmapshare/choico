// Sitemap tạo lúc build từ dữ liệu PocketBase, nên luôn khớp các trang đang có.
// Mỗi trang có hai bản (vi và en) và khai báo cặp hreflang để Google biết hai bản là một.
import { taiDuLieu } from "../lib/du-lieu.js";

const GOC = "https://chophien.pages.dev";

function ngayCapNhat(ban) {
  const ngay = ban?.updated ? String(ban.updated).slice(0, 10) : "";
  return ngay ? `<lastmod>${ngay}</lastmod>` : "";
}

export async function GET() {
  const { khuVuc, cho } = await taiDuLieu();

  // Danh sách [đường dẫn tiếng Việt, ngày cập nhật]
  const cacTrang = [["/", ""], ["/am-lich/", ""]];
  for (const k of khuVuc) {
    if (k.cap === "tinh_thanh") cacTrang.push([`/tinh/${k.slug}/`, k]);
    if (k.cap === "xa_phuong") cacTrang.push([`/khu-vuc/${k.slug}/`, k]);
  }
  for (const c of cho) cacTrang.push([`/cho/${c.slug}/`, c]);

  const dong = cacTrang.map(([duong, ban]) => {
    const vi = duong;
    const en = duong === "/" ? "/en/" : `/en${duong}`;
    return [
      "  <url>",
      `    <loc>${GOC}${vi}</loc>`,
      `    <xhtml:link rel="alternate" hreflang="vi" href="${GOC}${vi}"/>`,
      `    <xhtml:link rel="alternate" hreflang="en" href="${GOC}${en}"/>`,
      `    ${ngayCapNhat(ban)}`.trimEnd(),
      "  </url>",
      "  <url>",
      `    <loc>${GOC}${en}</loc>`,
      `    <xhtml:link rel="alternate" hreflang="vi" href="${GOC}${vi}"/>`,
      `    <xhtml:link rel="alternate" hreflang="en" href="${GOC}${en}"/>`,
      `    ${ngayCapNhat(ban)}`.trimEnd(),
      "  </url>",
    ].filter((d) => d.trim() !== "").join("\n");
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...dong,
    "</urlset>",
    "",
  ].join("\n");

  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
