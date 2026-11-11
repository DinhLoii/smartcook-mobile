# System prompt · SmartCook Mobile UI/UX

Bạn đang thiết kế hoặc sửa giao diện React Native/Expo của **SmartCook Mobile**. Giữ bố cục tối giản với nền ngà, chữ than và một màu nhấn xanh lá khói. Dùng khoảng trắng, độ đậm của chữ và viền mảnh để phân cấp nội dung.

## Bảng màu và biểu tượng

- Dùng `BrandColors` từ [src/constants/brandColors.ts](../src/constants/brandColors.ts) làm nguồn màu chung. Nền trang dùng `background` (`#F7F8F3`), thẻ và thanh điều hướng dùng `surfaceCard` (`#FFFEFA`), ô nhập dùng `inputBg` và viền dùng `borderLight`.
- Dùng `textDark` (`#252B26`) cho tiêu đề, `textBody` cho nội dung và `textMuted` cho chữ phụ. Nút chính dùng `primary` (`#4C624E`) với `onPrimary` cho chữ hoặc icon. Nút phụ dùng nền trung tính và chữ than.
- Dùng `primarySoft` (`#E3EBDD`) làm nền của bộ lọc và tab đang chọn. Kết hợp icon và nhãn `primary` để nhận ra trạng thái. Các tab còn lại dùng icon nét màu trung tính.
- Giữ màu gốc của ảnh món ăn, ảnh đại diện, video và logo bên thứ ba. Dành xanh lá khói cho hành động chính, trạng thái đang chọn và dấu focus. Dùng nhãn hoặc icon để diễn đạt lỗi và trạng thái hoàn tất.

## Bố cục và tương tác

- Lấy màn Khám phá và Cộng đồng hiện tại làm mẫu. Dùng thanh điều hướng phẳng, bộ lọc gọn, tiêu đề rõ ràng và đường phân cách nhẹ. Ưu tiên bề mặt phẳng và giữ nội dung cần thiết cho thao tác.
- Giữ vùng chạm ít nhất 44 × 44 cho nút mới khi bố cục cho phép. Đặt `accessibilityLabel` bằng tiếng Việt cho nút chỉ có icon. Khai báo trạng thái chọn cho tab và duy trì dấu hiệu focus khi dùng bàn phím trên web.
- Kiểm tra trên màn hình hẹp, nhất là hàng bộ lọc, thanh tab và các nút chỉ có icon. Chừa vùng an toàn cho thanh hệ thống và đặt nút nổi ở vị trí người dùng vẫn bấm được các thao tác bên dưới.
- Khi yêu cầu chỉ liên quan đến giao diện, giữ hành vi hiện có của điều hướng, Tin nhắn, API, video, điều khiển bằng giọng nói và hẹn giờ nấu.

Ví dụ khi làm nút mở công thức, dùng `BrandColors.primary` cho nền và `BrandColors.onPrimary` cho icon. Với bộ lọc chưa chọn, dùng `BrandColors.surfaceCard`, viền `BrandColors.borderLight` và chữ `BrandColors.textBody`.
