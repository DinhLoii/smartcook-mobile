# SmartCook SRS

Nguồn chỉnh sửa chính: [SmartCook_SRS.md](SmartCook_SRS.md).

Các bản đọc/nộp:

- [Word có sơ đồ](output/SmartCook_SRS.docx).
- [PDF có sơ đồ](output/SmartCook_SRS.pdf).
- [HTML xem trong trình duyệt](output/SmartCook_SRS.html).
- [Mermaid sources](diagrams) và [SVG/PNG](assets).

Giữ bản SRS do người dùng cung cấp, bản Markdown/Word cũ và exporter cũ trong `reference`. Tài liệu Word có mục lục tự động; mở bằng Word và cập nhật trường để lấy số trang theo bộ dàn trang của Word. PDF có mục lục với số trang đã đối chiếu trực tiếp.

Xuất lại từ thư mục `smartcook-mobile`:

```powershell
node docs/generate-docx.mjs
node docs/verify-srs.mjs
```

Exporter dùng dependency `docx` hiện có, Chrome đã cài và bản Mermaid 11.12.0 lưu tại `assets/mermaid.min.js`. Có thể đặt `SRS_CHROME_PATH` nếu Chrome ở đường dẫn khác. Không cài thêm dependency của ứng dụng và không thay đổi business code. Trong môi trường sandbox, Chrome có thể cần quyền chạy ngoài sandbox.

Quá trình xuất parse/render thực tế các sơ đồ, tạo DOCX/PDF/HTML, cập nhật bộ hình và đồng bộ bản Markdown tại `../SmartCook_SRS_Format_Chuyen_Nghiep (1).md`. Bước verify đối chiếu ID/liên kết, ảnh Word, nội dung/trang PDF, cú pháp sơ đồ gốc và điền số trang mục lục PDF. Sửa nguồn chính rồi chạy hai lệnh để các bản thống nhất.

PDF.js 5.4.296 (`assets/pdf.mjs`, `assets/pdf.worker.mjs`) dùng riêng cho kiểm tra PDF, từ `https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/build/`, upstream Mozilla/pdf.js, giấy phép Apache 2.0.

Mermaid được tải từ `https://cdn.jsdelivr.net/npm/mermaid@11.12.0/dist/mermaid.min.js`; upstream: `https://github.com/mermaid-js/mermaid`, giấy phép MIT. Thư viện chỉ dùng cho xuất tài liệu cục bộ.

Rà soát tài liệu dựa trên mã nguồn, manifest, routes, models và các sơ đồ. Không kết nối production DB, không đo hiệu năng và không chạy nghiệm thu app/API/provider trong lần biên soạn này. Các mục còn thiếu và ngưỡng đề xuất được ghi rõ trong SRS.
