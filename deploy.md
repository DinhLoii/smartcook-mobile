# SmartCook — Tài liệu Deploy & Tải app

> Cập nhật lần cuối: 29/10/2026, 14:30 (giờ VN)
> Tài khoản Expo dùng để build: `quynv64` (vanquy0604q@gmail.com)

## 📱 Android (APK — cài trực tiếp, không cần CH Play)

| Mục | Link |
|---|---|
| **APK mới nhất** (UI 29/10) | https://expo.dev/artifacts/eas/UfZhUNQSBtxeaE5NeFGq0J57Y-cU6-KQWGNSGh06F30.apk |
| Trang build của Expo (xem log, mọi bản) | https://expo.dev/accounts/quynv64/projects/smartcook-mobile/builds |
| QR code của APK mới | file `apk-qr.png` ở gốc dự án |

Cách cài: mở link bằng Chrome trên điện thoại → tải file `.apk` → khi mở, Android hỏi
"cho phép cài từ nguồn không xác định" → **Allow** → Cài đặt. Xong, app chạy độc lập.

Build bản mới (mất ~10 phút, miễn phí, tối đa ~15 lượt/tháng):

```bash
eas build -p android --profile internal
```

Kết quả là file `.apk`, link lưu vĩnh viễn trên trang builds ở trên.

## 🍎 iPhone (iOS)

**Không có file .ipa tải trực tiếp.** Lý do: Apple bắt buộc tài khoản Developer trả phí
($99/năm) cho mọi công cụ build/ký app iOS từ Windows, kể cả EAS. Đây là chính sách của
Apple, không phải lỗi cấu hình.

Giải pháp đang dùng (miễn phí, hoạt động như app thật):

| Mục | Link / cách |
|---|---|
| **Web app chính thức** | https://stunning-sprite-8194ba.netlify.app |
| Cách cài thành app | Mở link bằng **Safari** → nút Share → **Add to Home Screen** |
| Sau khi cài | Icon "SmartCook" riêng, full màn hình, splash ảnh thương hiệu, không cần máy tính, backend là Render online |

Lưu ý khi dùng:
- Phải mở bằng **icon trên màn hình chính**, không mở trong tab Safari (tab Safari luôn hiện thanh địa chỉ).
- Status bar (giờ/pin) và vạch trang chủ là của hệ thống iOS, mọi app (kể cả native) đều không ẩn được.
- QR APK ở trên là cho Android — iPhone bấm vào sẽ không cài được gì, đừng đưa link .apk cho người dùng iOS.

## 🔄 Quy trình cập nhật app sau mỗi lần sửa code

**Cho iPhone (web app):**
```bash
yarn export:web
```
rồi kéo folder `dist` mới vào https://app.netlify.com/drop (URL không đổi, iPhone mở lại app là nhận bản mới).

**Cho Android (APK):**
```bash
eas build -p android --profile internal
```
xong gửi link `.apk` mới (hoặc cập nhật lại `apk-qr.png` bằng lệnh:
`npx qrcode -o apk-qr.png -w 600 "<link-apk-mới>"` rồi deploy tiếp theo sẽ kèm QR).

## 🧩 Ghi chú kỹ thuật quan trọng

- `yarn export:web` = build web + chạy `scripts/generate-splash.js` (ảnh splash 9 đời iPhone)
  + `scripts/flatten-dist-assets.js` (dời font icon ra `dist/assets/` vì Netlify Drop bỏ qua
  mọi thư mục `node_modules` — nếu không bước này, icon trong app sẽ là ô vuông trống).
- `eas.json`: profile `internal` = APK cài trực tiếp; profile `production` = AAB cho CH Play.
- Web deploy mới nhất phải được kéo lên Netlify kèm `dist/apk-qr.png` để QR hiển thị tại
  `https://stunning-sprite-8194ba.netlify.app/apk-qr.png`.
