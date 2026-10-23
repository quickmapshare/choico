// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://choico.pages.dev",
  output: "static",
  vite: {
    build: {
      // Giữ CSS tương thích Safari/iOS cũ (iPhone 7 chạy tối đa iOS 15): không đổi media query sang cú pháp khoảng (width <= 640px)
      cssTarget: ["safari12", "chrome80", "firefox78"],
    },
  },
});
