// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// Sitemap bỏ các trang không lập chỉ mục: trang trận và xem ván (nội dung theo ?ma=), bản nhúng, trang đăng nhập
const KHONG_LAP_CHI_MUC = /(^|\/)(tran|xem-van|nhung|dang-nhap)(\/|$)/;

export default defineConfig({
  site: "https://choico.pages.dev",
  output: "static",
  integrations: [
    sitemap({
      filter: (trang) => !KHONG_LAP_CHI_MUC.test(new URL(trang).pathname),
      // Mỗi trang kèm liên kết hreflang tới bản các ngôn ngữ khác (mã khớp tiền tố đường dẫn)
      i18n: {
        defaultLocale: "vi",
        locales: {
          vi: "vi",
          en: "en",
          "zh-tw": "zh-TW",
          ko: "ko",
          ja: "ja",
          "zh-cn": "zh-CN",
          es: "es",
          ru: "ru",
          "pt-br": "pt-BR",
          fr: "fr",
          de: "de",
          id: "id",
        },
      },
    }),
  ],
  vite: {
    build: {
      // Giữ CSS tương thích Safari/iOS cũ (iPhone 7 chạy tối đa iOS 15): không đổi media query sang cú pháp khoảng (width <= 640px)
      cssTarget: ["safari12", "chrome80", "firefox78"],
    },
  },
});
