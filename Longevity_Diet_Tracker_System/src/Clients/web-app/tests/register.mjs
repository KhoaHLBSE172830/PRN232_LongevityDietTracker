// Cho phép Node chạy trực tiếp mã nguồn Vite (import không có đuôi .js) mà không cần cài thêm gói nào.
import { register } from 'node:module';

register('./resolve-hooks.mjs', import.meta.url);
