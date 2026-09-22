import js from "@eslint/js";
import globals from "globals";
import pluginReact from "eslint-plugin-react";

export default [
  // 1. Bỏ qua toàn bộ thư mục backend
  { ignores: ["backend/**"] },
  
  // 2. Kế thừa các bộ quy tắc chuẩn (Thay thế cho "extends")
  js.configs.recommended,
  pluginReact.configs.flat.recommended,
  
  // 3. Cấu hình môi trường và cài đặt React
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    settings: {
      react: {
        version: "detect"
      }
    }
  }
];