# SMARTCOOK
## TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM
### Software Requirements Specification (SRS)

---

| Thuộc tính | Nội dung |
|---|---|
| **Tên dự án** | SmartCook – Ứng dụng trợ lý nấu ăn thông minh |
| **Phiên bản** | 2.4.0 |
| **Nền tảng** | Mobile Application (iOS & Android) |
| **Framework** | React Native (Expo SDK 57) |
| **Ngôn ngữ** | TypeScript |
| **Định hướng** | Smart Cooking / Personalization / Meal Planning |

---

## MỤC LỤC

- [I. Mô tả dự án](#i-mô-tả-dự-án)
- [II. Đối tượng sử dụng](#ii-đối-tượng-sử-dụng)
- [III. Kiến trúc hệ thống](#iii-kiến-trúc-hệ-thống)
- [IV. Danh sách chức năng](#iv-danh-sách-chức-năng)
- [V. Mô tả giao diện các màn hình](#v-mô-tả-giao-diện-các-màn-hình)

---

## I. MÔ TẢ DỰ ÁN

### 1. Tên dự án

**SmartCook** – Ứng dụng trợ lý nấu ăn thông minh, hỗ trợ người dùng trong toàn bộ quá trình từ lựa chọn nguyên liệu đến hoàn thành bữa ăn.

### 2. Bối cảnh & Vấn đề cần giải quyết

| # | Vấn đề | Giải pháp của SmartCook |
|---|---|---|
| 1 | Không biết hôm nay ăn gì | Gợi ý món cá nhân hóa dựa trên hồ sơ khẩu vị & thói quen |
| 2 | Có nguyên liệu nhưng không biết nấu món gì | Module "Tôi có gì trong tủ lạnh?" tìm công thức từ nguyên liệu sẵn có |
| 3 | Công thức không phù hợp với bản thân | Khảo sát khẩu vị & mục tiêu → lọc công thức phù hợp |
| 4 | Khó theo dõi quá trình nấu | Cooking Mode từng bước với Timer và hướng dẫn rõ ràng |
| 5 | Khó lập kế hoạch bữa ăn | Smart Meal Planner tự động tạo thực đơn tuần |

### 3. Mục tiêu dự án

- Giúp người dùng tìm kiếm và khám phá món ăn dễ dàng.
- Tận dụng nguyên liệu đang có, hạn chế lãng phí thực phẩm.
- Cung cấp công thức nấu ăn trực quan, dễ thực hiện từng bước.
- Hỗ trợ quản lý dinh dưỡng và mục tiêu ăn uống cá nhân.
- Lập kế hoạch bữa ăn theo ngày/tuần và tự động tạo danh sách mua sắm.
- Cá nhân hóa đề xuất dựa trên sở thích, khẩu vị, lịch sử nấu ăn.
- Ứng dụng AI để nâng cao trải nghiệm người dùng.

---

## II. ĐỐI TƯỢNG SỬ DỤNG

| Nhóm | Đặc điểm |
|---|---|
| **Cá nhân** | Sinh viên, người đi làm, người sống một mình, người thích nấu ăn |
| **Gia đình** | Muốn lập thực đơn, nấu cho nhiều người, quản lý ngân sách thực phẩm |
| **Người quan tâm sức khỏe** | Kiểm soát calo, tăng cơ, ăn eat-clean, giảm cân |
| **Phụ huynh** | Tìm món cho trẻ em, món dễ ăn, ít gia vị |

---

## III. KIẾN TRÚC HỆ THỐNG

### 3.1 Công nghệ sử dụng

| Lớp | Công nghệ |
|---|---|
| **Mobile App** | React Native + Expo SDK 57 |
| **Ngôn ngữ** | TypeScript |
| **Navigation** | Expo Router (file-based routing) |
| **State / Service** | Service layer (PreferenceService, CookingHistoryService, CartService, StoreService) |
| **UI Components** | React Native StyleSheet, Expo LinearGradient, @expo/vector-icons (Ionicons) |
| **Backend (dự kiến)** | Node.js + MongoDB |

### 3.2 Cấu trúc thư mục chính

```
src/
├── app/                        # Các màn hình (Expo Router)
│   ├── _layout.tsx
│   ├── index.tsx               # Splash / Auth check
│   ├── login.tsx
│   ├── register.tsx
│   ├── onboarding-survey.tsx   # Khảo sát khẩu vị 6 câu hỏi
│   ├── home.tsx                # Màn hình chính tích hợp tab
│   ├── explore.tsx
│   ├── recipe-detail.tsx
│   └── cooking-mode.tsx
├── components/
│   ├── features/               # View lớn được nhúng trong home
│   │   ├── FridgeView.tsx      # "Tôi có gì trong tủ lạnh?"
│   │   ├── ProfileView.tsx     # Trang cá nhân
│   │   ├── PlannerView.tsx     # Meal planner
│   │   └── ScanAIView.tsx      # Scan nhận diện nguyên liệu
│   ├── common/                 # UI dùng chung
│   │   ├── CookingHistoryModal.tsx
│   │   ├── ShoppingNoteModal.tsx
│   │   ├── NearbyStoreCard.tsx
│   │   └── ShoppingReminderBanner.tsx
│   └── ui/
├── services/                   # Business logic & state
│   ├── preferenceService.ts    # Quản lý hồ sơ sở thích người dùng
│   ├── cookingHistoryService.ts # Quản lý lịch sử đã nấu
│   ├── cartService.ts          # Quản lý danh sách mua sắm
│   └── storeService.ts         # Cửa hàng gần đây
├── constants/
├── types/
└── data/
```

### 3.3 Tầng Service (Observer Pattern)

| Service | Vai trò |
|---|---|
| **PreferenceService** | Lưu và phân phối hồ sơ sở thích người dùng (khẩu vị, mục tiêu, dị ứng, khẩu phần). Dùng Observer để các View tự cập nhật. |
| **CookingHistoryService** | Quản lý danh sách các món đã nấu (thêm, xóa, xóa tất cả, subscribe). |
| **CartService** | Quản lý danh sách nguyên liệu cần mua. |
| **StoreService** | Quản lý dữ liệu cửa hàng gần đó. |

---

## IV. DANH SÁCH CHỨC NĂNG

### MODULE 1 – AUTHENTICATION & ACCOUNT

| Chức năng | Mô tả |
|---|---|
| 1.1 Đăng ký | Tạo tài khoản bằng Email + Password + Tên hiển thị |
| 1.2 Đăng nhập | Đăng nhập bằng tài khoản đã đăng ký |
| 1.3 Đăng xuất | Hộp thoại xác nhận trước khi đăng xuất |
| 1.4 Quên mật khẩu | Khôi phục mật khẩu qua email |
| 1.5 Quản lý tài khoản | Thay đổi avatar, tên hiển thị, email, mật khẩu |

---

### MODULE 2 – ONBOARDING SURVEY (Khảo sát cá nhân hóa)

Màn hình khảo sát dạng **accordion 6 câu hỏi**. Mỗi câu hỏi thu gọn/mở rộng khi nhấn. Giao diện nhỏ gọn, hiển thị tóm tắt lựa chọn ngay trên tiêu đề câu hỏi khi thu gọn.

| # | Câu hỏi | Loại chọn | Các lựa chọn |
|---|---|---|---|
| 1 | Loại ẩm thực yêu thích | Multi-select | Món Việt, Món Á, Eat Clean, Món Âu, Nấu <20p, Tiết kiệm, Ăn chay, Tráng miệng |
| 2 | Khẩu vị ưa thích | Multi-select | Đậm đà, Thanh đạm, Cay nồng, Ngọt thanh, Chua cay, Béo ngậy |
| 3 | Dị ứng / Kiêng khem | Multi-select | Không ăn cay, Dị ứng đậu phộng, Dị ứng hải sản vỏ cứng, Không nạp lactose, Ăn chay |
| 4 | Khẩu phần nấu | Single-select | 1 người, 2 người, 3–4 người, 5+ người |
| 5 | Thời gian nấu tối đa | Single-select | <15 phút, 15–30 phút, 30–45 phút, >45 phút |
| 6 | Mục tiêu ăn uống | Single-select | Ăn Healthy & Cân bằng, Giảm cân & Đốt mỡ, Tăng cơ & Giàu đạm, Tối ưu ngân sách |

**Lưu ý hành vi:**
- Người dùng có thể bỏ qua ("Bỏ qua") khi mới vào app lần đầu.
- Từ trang Profile, nhấn **"Chỉnh sửa"** để quay lại sửa bất cứ lúc nào.
- Dữ liệu lưu qua `PreferenceService` và phân phối đến toàn app.

---

### MODULE 3 – HOME (Trang chủ)

Màn hình chính là trung tâm điều hướng của ứng dụng.

| Khu vực | Nội dung |
|---|---|
| **Greeting** | Lời chào + tên người dùng theo thời điểm trong ngày |
| **Quick Actions** | Tôi có gì trong tủ lạnh? · Scan AI · Gợi ý cho tôi · Meal Planner |
| **Categories** | Gia đình · Sức khỏe · Trẻ em · Cá nhân · Nhanh & Tiện lợi · Tiết kiệm · Tiệc & Dịp đặc biệt · Chế độ ăn · Ẩm thực · Đồ uống & Tráng miệng |
| **Recommended for you** | Món được cá nhân hóa dựa trên hồ sơ sở thích |
| **Trending** | Các món đang phổ biến trong cộng đồng |

---

### MODULE 4 – CATEGORIES (Danh mục)

Hệ thống phân loại món ăn theo nhiều tiêu chí:

- Gia đình · Sức khỏe · Trẻ em · Cá nhân
- Nhanh & Tiện lợi · Tiết kiệm
- Tiệc & Dịp đặc biệt · Chế độ ăn chay
- Ẩm thực · Đồ uống & Tráng miệng

Mỗi category có thể có subcategory và filter nâng cao.

---

### MODULE 5 – RECIPE (Công thức nấu ăn)

Module cốt lõi. Một recipe bao gồm:

| Trường | Mô tả |
|---|---|
| Tên món | Tên hiển thị |
| Ảnh | Hình đại diện |
| Mô tả | Tóm tắt ngắn |
| Thời gian chuẩn bị / Thời gian nấu | Phút |
| Độ khó | Dễ / Trung bình / Khó |
| Khẩu phần | Số người |
| Nguyên liệu | Danh sách + định lượng |
| Các bước thực hiện | Từng bước chi tiết |
| Dinh dưỡng | Calories, Protein, Carbs, Fat, Fiber |
| Chi phí | Tổng chi phí ước tính |
| Category / Tags | Phân loại và nhãn |

**Người dùng có thể:** xem danh sách, tìm kiếm, lọc theo category/thời gian/chi phí, lưu yêu thích, đánh giá, bắt đầu nấu.

---

### MODULE 6 – "TÔI CÓ GÌ TRONG TỦ LẠNH?" (FridgeView)

Core feature – giúp người dùng tìm công thức từ nguyên liệu sẵn có.

**Luồng:**
1. Chọn nguyên liệu từ danh sách phân loại theo nhóm (dạng Accordion)
2. Hệ thống tìm công thức phù hợp
3. Kết quả hiển thị với % nguyên liệu khớp (100% → 60%…)
4. Hiển thị nguyên liệu còn thiếu nếu có

**Tính năng trong FridgeView:**
- **Nút "Lịch sử"** (header) → mở CookingHistoryModal
- Thanh tìm kiếm nguyên liệu
- Xóa toàn bộ nguyên liệu đã chọn
- Xem chi tiết công thức → Recipe Detail

---

### MODULE 7 – SCAN AI (Nhận diện nguyên liệu bằng camera)

Người dùng dùng camera chụp tủ lạnh hoặc nguyên liệu. Hệ thống nhận diện và trả về danh sách nguyên liệu.

**Luồng:**
1. Mở camera trong ScanAIView
2. Chụp ảnh nguyên liệu / tủ lạnh
3. Hệ thống trả về danh sách nguyên liệu nhận diện được
4. Người dùng xác nhận / chỉnh sửa
5. Tự động điền vào FridgeView

> Kiến trúc `ScanAIView.tsx` tách biệt, sẵn sàng tích hợp AI Vision API.

---

### MODULE 8 – SMART RECOMMENDATION (Gợi ý thông minh)

Hệ thống gợi ý dựa trên:

```
Nguyên liệu + Sở thích + Lịch sử nấu + Mục tiêu + Thời gian + Ngân sách
→ Danh sách đề xuất cá nhân hóa
```

Recommendation cải thiện theo thời gian dựa trên hành vi người dùng: xem, lưu, đánh giá, nấu, tìm kiếm.

---

### MODULE 9 – COOKING MODE (Hướng dẫn nấu từng bước)

| Tính năng | Mô tả |
|---|---|
| Hiển thị bước | BƯỚC X/Y – nội dung hướng dẫn rõ ràng |
| Timer | Đếm ngược thời gian cho mỗi bước |
| Điều hướng | Start / Pause / Skip / Previous |
| Timeline | Tổng hợp các mốc thời gian |
| Notification | Thông báo khi hết thời gian bước |
| Voice (dự kiến) | Đọc hướng dẫn bằng giọng nói |

---

### MODULE 10 – SMART TIMER

Mỗi bước nấu kèm timer riêng. Hệ thống tạo timeline:

```
18:00 ─ Ướp thịt      (15 phút)
18:15 ─ Chiên gà       (7 phút)
18:22 ─ Nấu sốt        (5 phút)
18:27 ─ Hoàn thành
```

Hỗ trợ push notification khi hết thời gian mỗi bước.

---

### MODULE 11 – NUTRITION (Dinh dưỡng)

Hiển thị dinh dưỡng từng món: Calories · Protein · Carbohydrates · Fat · Fiber · Sugar.

Người dùng thiết lập mục tiêu hàng ngày. Hệ thống theo dõi tổng lượng nạp qua Sáng / Trưa / Tối.

---

### MODULE 12 – SMART MEAL PLANNER (PlannerView)

Người dùng tạo kế hoạch ăn uống với:
- Mục tiêu (Giảm cân, Tăng cơ, Ăn healthy…)
- Số người ăn
- Ngân sách (VNĐ)
- Khoảng thời gian (7 ngày / 14 ngày…)

Hệ thống tự động tạo thực đơn Sáng / Trưa / Tối cho từng ngày. Người dùng có thể thay thủ công từng món.

---

### MODULE 13 – SHOPPING LIST (Danh sách mua sắm)

Từ Meal Planner → tự động tạo danh sách nguyên liệu cần mua, phân nhóm (Thịt · Rau củ · Khác…).

**Tính năng:**
- Nguyên liệu đã có trong FridgeView được loại khỏi danh sách
- Đánh dấu đã mua từng mục
- Ghi chú mua sắm (`ShoppingNoteModal`)
- Tìm cửa hàng gần đó (`NearbyStoreCard`)
- Nhắc nhở mua sắm (`ShoppingReminderBanner`)

---

### MODULE 14 – FAVORITE / SAVE (Yêu thích)

- Like / Lưu công thức
- Xem bộ sưu tập đã lưu
- Phân nhóm: Breakfast · Lunch · Dinner · Healthy…

---

### MODULE 15 – COST CALCULATION (Chi phí)

Hiển thị chi phí ước tính từng món. Lọc theo mức giá: <20K · 20K–30K · 30K–50K · >50K.

---

### MODULE 16 – PERSONALIZATION (Cá nhân hóa)

| Hành vi người dùng | Tác động |
|---|---|
| Xem món | Tăng điểm đề xuất |
| Lưu / Like | Cập nhật sở thích |
| Đánh giá | Cải thiện recommendation |
| Lịch sử nấu | Phản ánh thói quen |
| Tìm kiếm | Phân tích nhu cầu |

---

### MODULE 17 – RATING & REVIEW

Người dùng đánh giá sau khi nấu: Hương vị · Độ dễ nấu · Chi phí · Thành phẩm.
Có thể thêm comment và ảnh thành phẩm. Dữ liệu đóng góp vào hệ thống Recommendation.

---

### MODULE 18 – COOKING HISTORY (Lịch sử đã nấu)

Truy cập qua nút **"Lịch sử"** ở header của FridgeView.

**Giao diện (`CookingHistoryModal`):**

| Thành phần | Mô tả |
|---|---|
| Filter pills | Tất cả · Hôm nay · Tuần này |
| Danh sách | Ảnh thumbnail + Tên món + Thời gian nấu |
| Nút "Nấu lại" | Điều hướng đến Recipe Detail của món đó |
| Nút xóa | Xóa toàn bộ lịch sử, có hộp thoại xác nhận |

**Kiến trúc `CookingHistoryService`:**
- `addToHistory(item)` – Thêm món vừa nấu
- `getHistory()` – Lấy danh sách toàn bộ
- `deleteItem(id)` – Xóa từng mục
- `clearHistory()` – Xóa tất cả
- `subscribe(listener)` – Đăng ký cập nhật realtime (Observer)

---

### MODULE 19 – SMART SEARCH (Tìm kiếm thông minh)

| Loại | Ví dụ |
|---|---|
| Tìm kiếm thông thường | "Phở", "Bún bò" |
| Tìm kiếm thông minh | "Món dưới 30 phút có thịt gà" |
| Lọc nâng cao | "Món healthy dưới 500 calories" · "Món cho 2 người dưới 100k" |

Hệ thống phân tích ngôn ngữ tự nhiên và chuyển thành điều kiện lọc.

---

### MODULE 20 – NOTIFICATION (Thông báo)

| Loại | Nội dung |
|---|---|
| Cooking Timer | Đã đến lúc chuyển bước tiếp theo |
| Meal Reminder | Nhắc chuẩn bị bữa ăn |
| Shopping Reminder | Nhắc đi chợ theo kế hoạch |
| New Recipe | Công thức mới phù hợp khẩu vị |
| Personalized Tip | Gợi ý cá nhân hóa hàng ngày |

---

### MODULE 21 – AI RECIPE GENERATOR *(Dự kiến)*

Người dùng nhập: nguyên liệu sẵn có + thời gian + ngân sách + mục tiêu dinh dưỡng.
AI tạo công thức hoàn chỉnh: Tên món · Nguyên liệu & định lượng · Các bước nấu · Thời gian · Dinh dưỡng · Chi phí.

---

## V. MÔ TẢ GIAO DIỆN CÁC MÀN HÌNH

### Màn hình 1 – Đăng nhập / Đăng ký

Giao diện xác thực với background ảnh nền mờ, form đăng nhập/đăng ký ở trung tâm màn hình. Có nút chuyển đổi giữa đăng nhập và đăng ký.

[ bổ sung ảnh ]

---

### Màn hình 2 – Onboarding Survey

Giao diện accordion 6 câu hỏi. Mỗi câu hỏi là một card có thể mở rộng/thu gọn. Khi thu gọn hiển thị tóm tắt lựa chọn. Chip lựa chọn dạng text nhỏ gọn, không icon thừa.

[ bổ sung ảnh ]

---

### Màn hình 3 – Home (Trang chủ)

Màn hình chính với thanh tab điều hướng phía dưới. Gồm khu vực chào hỏi, quick actions, danh sách categories, danh sách món được đề xuất cá nhân, và trending.

[ bổ sung ảnh ]

---

### Màn hình 4 – FridgeView (Tôi có gì trong tủ lạnh?)

Header có tiêu đề, nút **"Lịch sử"** và nút xóa tất cả. Phần thân là danh sách nguyên liệu phân nhóm dạng Accordion. Nguyên liệu đã chọn được highlight. Kết quả hiển thị danh sách công thức với tỷ lệ % nguyên liệu khớp.

[ bổ sung ảnh ]

---

### Màn hình 5 – Cooking History Modal

Modal hiển thị từ dưới lên. Header có tiêu đề và nút đóng/xóa tất cả. Filter pills "Tất cả / Hôm nay / Tuần này". Danh sách món gồm thumbnail, tên, thời gian, nút "Nấu lại". Khi danh sách rỗng hiển thị trạng thái empty state.

[ bổ sung ảnh ]

---

### Màn hình 6 – ScanAI View

Giao diện camera với overlay hướng dẫn. Sau khi chụp, hiển thị danh sách nguyên liệu nhận diện được. Người dùng xác nhận hoặc chỉnh sửa trước khi thêm vào FridgeView.

[ bổ sung ảnh ]

---

### Màn hình 7 – Recipe Detail (Chi tiết công thức)

Ảnh lớn phía trên, tên món, thông số nhanh (thời gian, độ khó, khẩu phần, chi phí), danh sách nguyên liệu, các bước thực hiện, thông tin dinh dưỡng, nút "Bắt đầu nấu".

[ bổ sung ảnh ]

---

### Màn hình 8 – Cooking Mode (Hướng dẫn nấu từng bước)

Giao diện full-screen. Hiển thị số bước hiện tại / tổng bước, nội dung hướng dẫn rõ ràng, timer đếm ngược. Các nút: Bước trước · Dừng · Bước tiếp.

[ bổ sung ảnh ]

---

### Màn hình 9 – Meal Planner (PlannerView)

Lịch tuần dạng tab theo ngày. Mỗi ngày có 3 bữa (Sáng / Trưa / Tối). Nhấn vào từng ô để chọn/thay thế món. Tóm tắt dinh dưỡng và chi phí tuần hiển thị phía dưới lịch.

[ bổ sung ảnh ]

---

### Màn hình 10 – Profile (Trang cá nhân)

Giao diện tối giản, gồm các card:

1. **Card thông tin người dùng** – Avatar, tên, email, badge thành viên.
2. **Card hồ sơ khẩu vị & khẩu phần** – Hiển thị 4 dòng (Khẩu phần / Món ưa thích / Mục tiêu / Dị ứng & Kiêng) + nút **"Chỉnh sửa"** điều hướng sang Onboarding Survey.
3. **Card cài đặt & tiện ích** – Bộ sưu tập công thức đã lưu · Thông báo & Giờ nấu ăn · Ngôn ngữ hiển thị · Trung tâm trợ giúp.
4. **Nút Đăng xuất** – Có hộp thoại xác nhận.

[ bổ sung ảnh ]

---

*Tài liệu được cập nhật theo phiên bản ứng dụng thực tế – SmartCook v2.4.0*  
*Cập nhật lần cuối: Tháng 9/2026*


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Ứng dụng trợ lý nấu ăn thông minh**

**Phiên bản**

1.0

**Nền tảng**

Mobile Application

**Frontend**

React Native

**Backend**

Node.js

**Database**

MongoDB

**Định hướng**

Smart Cooking / Meal Planning / Personalization

Tài liệu yêu cầu • Phiên bản 1.0

MỤC LỤC NỘI DUNG

**I. Mô tả chi tiết về dự án**

**1\. Tên dự án**

**2\. Bối cảnh và vấn đề cần giải quyết**

**3\. Mục tiêu của dự án**

**4\. Đối tượng sử dụng**

**II. Danh sách chức năng của dự án**

**Module 1**

AUTHENTICATION & ACCOUNT

**Module 2**

USER PROFILE & PERSONALIZATION

**Module 3**

HOME

**Module 4**

CATEGORY

**Module 5**

RECIPE

**Module 6**

"TÔI CÓ GÌ TRONG TỦ LẠNH?"

**Module 7**

SCAN NGUYÊN LIỆU

**Module 8**

SMART RECOMMENDATION

**Module 9**

COOK WITH ME

**Module 10**

SMART TIMER

**Module 11**

NUTRITION

**Module 12**

SMART MEAL PLANNER

**Module 13**

SHOPPING LIST

**Module 14**

INVENTORY

**Module 15**

COST CALCULATION

**Module 16**

PERSONALIZATION

**Module 17**

RATING & REVIEW

**Module 18**

COOKING HISTORY

**Module 19**

RECIPE REMIX

**Module 20**

INGREDIENT SUBSTITUTION

**Module 21**

TRENDING

**Module 22**

SMART SEARCH

**Module 23**

FAVORITE / SAVE

**Module 24**

NOTIFICATION

**Module 25**

AI RECIPE GENERATOR

I. MÔ TẢ CHI TIẾT VỀ DỰ ÁN

1\. Tên dự án

SmartCook – Ứng dụng trợ lý nấu ăn thông minh

SmartCook là một ứng dụng mobile hỗ trợ người dùng trong toàn bộ quá trình chuẩn bị và nấu ăn, từ việc tìm kiếm món ăn, lựa chọn món dựa trên nguyên liệu có sẵn, xem công thức, tính toán dinh dưỡng và chi phí, lập thực đơn, tạo danh sách mua sắm cho đến hướng dẫn nấu ăn từng bước.

Ứng dụng không chỉ đóng vai trò là một kho lưu trữ công thức mà hướng đến trở thành một trợ lý nấu ăn cá nhân, có khả năng hiểu nhu cầu, thói quen và mục tiêu ăn uống của người dùng để đưa ra các đề xuất phù hợp.

2\. Bối cảnh và vấn đề cần giải quyết

**Vấn đề 1 – Không biết hôm nay ăn gì :**

Người dùng thường mất nhiều thời gian để suy nghĩ: "Hôm nay ăn món gì?"

Trong khi đó, họ có thể đã có nhiều nguyên liệu trong tủ lạnh nhưng không biết có thể kết hợp chúng thành món gì.

**Vấn đề 2 – Có nguyên liệu nhưng không biết nấu món gì :**

**Ví dụ người dùng có:**

*   Thịt gà
*   Trứng
*   Cà chua
*   Cà rốt
*   Hành

**Ứng dụng cần giúp người dùng tìm ra:**

**"Với những nguyên liệu này, tôi có thể nấu được những món nào?"**

**Vấn đề 3 – Không biết công thức phù hợp với bản thân :**

**Một công thức có thể ngon nhưng không phù hợp với:**

*   Mục tiêu giảm cân.
*   Chế độ ăn uống.
*   Số người ăn.
*   Ngân sách.
*   Thời gian nấu.
*   Sở thích cá nhân.
*   Nguyên liệu người dùng không ăn được.

**Vấn đề 4 – Khó theo dõi quá trình nấu :**

**Các công thức truyền thống thường chỉ hiển thị:**

**Bước 1 → Bước 2 → Bước 3.**

Người dùng phải liên tục nhìn điện thoại trong khi nấu.

**SmartCook cung cấp Cooking Mode với:**

*   Hướng dẫn từng bước.
*   Timer.
*   Timeline.
*   Voice instruction.
*   Pause / Continue.
*   Skip step.
*   Notification.

Vấn đề 5 – Khó lập kế hoạch ăn uống

Người dùng muốn: "Lập thực đơn cho tôi trong 7 ngày với ngân sách 500.000đ."

Nhưng việc tự lập thực đơn và danh sách nguyên liệu rất mất thời gian.

SmartCook sẽ hỗ trợ tự động hóa quá trình này.

\# 3. Mục tiêu của dự án

**SmartCook hướng tới các mục tiêu chính:**

Mục tiêu 1

Giúp người dùng tìm kiếm và khám phá món ăn dễ dàng.

Mục tiêu 2

Giúp người dùng tận dụng các nguyên liệu đang có để hạn chế lãng phí thực phẩm.

Mục tiêu 3

Cung cấp công thức nấu ăn trực quan và dễ thực hiện.

Mục tiêu 4

Hỗ trợ người dùng quản lý dinh dưỡng và mục tiêu ăn uống.

Mục tiêu 5

Hỗ trợ lập kế hoạch bữa ăn theo ngày/tuần.

Mục tiêu 6

Tự động tạo danh sách nguyên liệu cần mua.

Mục tiêu 7

Cá nhân hóa đề xuất dựa trên sở thích và lịch sử sử dụng.

Mục tiêu 8

Ứng dụng AI để nâng cao trải nghiệm trong các chức năng phù hợp.

\# 4. Đối tượng sử dụng

Hệ thống hướng đến nhiều nhóm người dùng.

4.1. Người dùng cá nhân

**Ví dụ:**

*   Sinh viên.
*   Người đi làm.
*   Người sống một mình.
*   Người thích nấu ăn.

4.2. Gia đình

**Người muốn:**

*   Lập thực đơn gia đình.
*   Nấu cho nhiều người.
*   Quản lý ngân sách thực phẩm.
*   Chuẩn bị danh sách mua sắm.

4.3. Người quan tâm sức khỏe

**Ví dụ:**

*   Người muốn ăn healthy.
*   Người muốn kiểm soát calories.
*   Người muốn tăng protein.
*   Người muốn kiểm soát chế độ ăn.

4.4. Phụ huynh

**Có thể tìm:**

*   Món cho trẻ.
*   Món dễ ăn.
*   Món ít gia vị.
*   Bữa sáng cho trẻ.

II. DANH SÁCH CHỨC NĂNG CỦA DỰ ÁN

**MODULE 1  
AUTHENTICATION & ACCOUNT**

1.1. Đăng ký tài khoản

**Người dùng có thể tạo tài khoản bằng:**

*   Email.
*   Password.
*   Tên hiển thị.

1.2. Đăng nhập

Người dùng đăng nhập bằng tài khoản đã đăng ký.

1.3. Đăng xuất

Cho phép đăng xuất khỏi thiết bị.

1.4. Quên mật khẩu

Người dùng có thể yêu cầu khôi phục mật khẩu thông qua email.

1.5. Quản lý tài khoản

**Người dùng có thể:**

*   Thay đổi avatar.
*   Thay đổi tên.
*   Thay đổi email.
*   Thay đổi password.

**MODULE 2  
USER PROFILE & PERSONALIZATION**

Đây là module quan trọng vì nó phục vụ hệ thống recommendation.

**Người dùng có thể thiết lập:**

Thông tin ăn uống

**Mục tiêu:**

Ăn uống bình thường

Giảm cân

Tăng cơ

Ăn healthy

Sở thích

Món yêu thích

*   Gà
*   Bò
*   Hải sản
*   Món Việt
*   Món Âu

...

Không thích

**Ví dụ:**

**Không thích:**

Cá

Đồ cay

Chế độ ăn

Vegetarian

Vegan

Low Carb

High Protein

Eat Clean

Dị ứng

Trứng

Sữa

Hải sản

Đậu phộng

...

**MODULE 3  
HOME**

Trang chủ là trung tâm của ứng dụng.

**Hiển thị:**

Greeting

Xin chào

Hôm nay bạn muốn nấu gì?

Quick Actions

Tôi có gì trong tủ lạnh?

Scan nguyên liệu

Gợi ý cho tôi

Meal Planner

Categories

‍‍ Gia đình

️ Sức khỏe

Trẻ em

Cá nhân

Nhanh & Tiện lợi

Tiết kiệm

Tiệc & Dịp đặc biệt

Chế độ ăn

Ẩm thực

Đồ uống & Tráng miệng

Recommended for you

Hiển thị món phù hợp với từng người dùng.

**MODULE 4  
CATEGORY**

**Hệ thống category chính:**

‍‍ Gia đình

️ Sức khỏe

Trẻ em

Cá nhân

Nhanh & Tiện lợi

Tiết kiệm

Tiệc & Dịp đặc biệt

Chế độ ăn chay

Ẩm thực

Đồ uống & Tráng miệng

Mỗi category có thể có các subcategory/filter.

**MODULE 5  
RECIPE**

Đây là module cốt lõi.

**Người dùng có thể:**

*   Xem danh sách món.
*   Xem chi tiết món.
*   Tìm kiếm món.
*   Lọc món.
*   Lưu món yêu thích.
*   Đánh giá món.
*   Chia sẻ món.

**Một recipe bao gồm:**

Tên món

Ảnh

Mô tả

Thời gian chuẩn bị

Thời gian nấu

Độ khó

Khẩu phần

Nguyên liệu

Các bước thực hiện

Dinh dưỡng

Chi phí

Category

Tags

**MODULE 6  
"TÔI CÓ GÌ TRONG TỦ LẠNH?"**

Đây là một core feature của SmartCook.

**Người dùng nhập/chọn các nguyên liệu đang có:**

Thịt gà

Trứng

Cà rốt

Cà chua

Hành

Hệ thống tìm các recipe phù hợp.

**Ví dụ:**

Cơm gà áp chảo

Thịt gà

Cà rốt

Hành

Gạo

**Hiển thị:**

**Thiếu 1 nguyên liệu.**

Trứng xào cà chua

Trứng

Cà chua

Hành

**Hiển thị:**

**100% nguyên liệu có sẵn.**

**Có thể sắp xếp:**

100% nguyên liệu

↓

80%

↓

60%

**MODULE 7  
SCAN NGUYÊN LIỆU**

**Người dùng sử dụng camera để chụp:**

*   Tủ lạnh.
*   Bàn bếp.
*   Các nguyên liệu.

**Hệ thống nhận diện:**

**Chicken**

Egg

Carrot

Tomato

Lettuce

Onion

**Sau đó:**

**Bạn có thể nấu 8 món từ các nguyên liệu này.**

**Kiến trúc backend nên tách riêng:**

IngredientRecognitionService

để sau này có thể tích hợp AI Vision.

**MODULE 8  
SMART RECOMMENDATION**

**Hệ thống phân tích:**

Nguyên liệu

\\+

Sở thích

\\+

Lịch sử

\\+

Category

\\+

Mục tiêu

\\+

Thời gian

\\+

Ngân sách

**→ tạo danh sách đề xuất.**

**Ví dụ:**

**Hôm nay chúng tôi đề xuất 5 món dành cho bạn.**

**Recommendation sẽ ngày càng cá nhân hóa dựa trên hành vi:**

*   Xem món.
*   Like.
*   Save.
*   Rating.
*   Cook.
*   Search.
*   Bỏ qua món.

**MODULE 9  
COOK WITH ME**

Chế độ nấu ăn từng bước.

**Ví dụ:**

BƯỚC 2/7

Cho 300g thịt gà

vào chảo.

Lửa vừa

⏱ 5 phút

**Các chức năng:**

▶ Start

⏸ Pause

⏭ Skip

↩ Previous

**Có thể hỗ trợ:**

Voice

**"Cho thịt gà vào chảo và chiên trong 5 phút."**

**MODULE 10  
SMART TIMER**

Mỗi bước có thể có timer.

**Ví dụ:**

Ướp thịt 15 phút

Chiên 7 phút

Nấu sốt 5 phút

**Hệ thống tạo timeline:**

18:00 ─ Ướp thịt

18:15 ─ Chiên

18:22 ─ Nấu sốt

18:27 ─ Hoàn thành

**Hỗ trợ notification:**

**Đã đến lúc chuyển sang bước tiếp theo.**

**MODULE 11  
NUTRITION**

**Hiển thị thông tin dinh dưỡng của món:**

**Calories**

**Protein**

**Carbohydrates**

**Fat**

**Fiber**

**Sugar**

Người dùng thiết lập Daily Goal.

**Ví dụ:**

Calories: 2,000 kcal

Protein: 120g

Carbs: 200g

Fat: 60g

**Hệ thống theo dõi:**

**Breakfast**

**Lunch**

**Dinner**

và tính tổng dinh dưỡng trong ngày.

**MODULE 12  
SMART MEAL PLANNER**

**Người dùng tạo kế hoạch:**

**Mục tiêu:**

Giảm cân

**Số người:**

2

**Ngân sách:**

500.000đ

**Thời gian:**

7 ngày

**Hệ thống tạo:**

**Monday**

**Breakfast**

**Lunch**

**Dinner**

**Tuesday**

**Breakfast**

**Lunch**

**Dinner**

...

**Sunday**

**Breakfast**

**Lunch**

**Dinner**

Có thể thay đổi món thủ công.

**MODULE 13  
SHOPPING LIST**

**Từ Meal Planner → hệ thống tự động tạo shopping list.**

**Ví dụ:**

THỊT

Chicken 1.5kg

Beef 500g

RAU CỦ

Tomato 1kg

Carrot 500g

KHÁC

Eggs 12

Rice 2kg

**Quan trọng:**

**Nguyên liệu người dùng đã có sẽ được loại khỏi danh sách cần mua.**

**MODULE 14  
INVENTORY**

Người dùng quản lý nguyên liệu đang có.

**Ví dụ:**

My Kitchen

**Chicken**

**Quantity: 500g**

Eggs

**Quantity: 8**

Tomato

**Quantity: 4**

**Có thể bổ sung:**

*   Số lượng.
*   Đơn vị.
*   Ngày mua.
*   Hạn sử dụng.

**Sau này có thể cảnh báo:**

**️ Cà chua sắp hết hạn.**

**MODULE 15  
COST CALCULATION**

Hệ thống tính chi phí món ăn.

**Ví dụ:**

Chicken 25.000đ

Rice 5.000đ

Vegetables 8.000đ

Seasoning 2.000đ

–--------------------

**Total 40.000đ**

**Cho phép lọc:**

< 20K

20K – 30K

30K – 50K

\\> 50K

**MODULE 16  
PERSONALIZATION**

**Hệ thống ghi nhận hành vi:**

**Viewed**

**Liked**

**Saved**

**Cooked**

**Rated**

**Searched**

Sau đó xây dựng profile sở thích.

**Ví dụ:**

**Bạn thường thích:**

**Chicken**

Healthy

Spicy

⏱ <30 minutes

Home sẽ tự động thay đổi recommendation.

**MODULE 17  
RATING & REVIEW**

**Người dùng đánh giá:**

Hương vị

⏱ Độ dễ nấu

Chi phí

Thành phẩm

**Có thể thêm:**

*   Comment.
*   Upload ảnh thành phẩm.

Dữ liệu rating được sử dụng cho recommendation.

**MODULE 18  
COOKING HISTORY**

Lưu lại các món người dùng đã nấu.

**Ví dụ:**

My Cooking

42 meals cooked

Chicken Teriyaki

Caesar Salad

Tomato Egg

**Thống kê:**

Healthy: 12

High Protein: 8

Asian: 7

**MODULE 19  
RECIPE REMIX**

Cho phép biến đổi công thức.

**Ví dụ:**

**Recipe:**

Carbonara

**Không có:**

Bacon

**Có:**

**Chicken**

**Hệ thống đề xuất:**

**Thay bacon bằng chicken.**

**Hoặc:**

Không ăn cay

**→ Giảm chili**

Không ăn thịt

**→ Vegetarian version**

**MODULE 20  
INGREDIENT SUBSTITUTION**

Cho phép thay thế nguyên liệu.

**Ví dụ:**

**Cần:**

Butter

**Có:**

Olive Oil

**Hệ thống đề xuất:**

**Có thể thay thế Butter bằng Olive Oil.**

**MODULE 21  
TRENDING**

Hiển thị món đang phổ biến.

**Ranking dựa trên:**

Views

Likes

Saves

Cooks

Ratings

**Ví dụ:**

Trending

1.  Korean Cream Pasta
2.  Egg Drop Sandwich
3.  Vietnamese Chicken Salad
4.  Garlic Butter Shrimp

**MODULE 22  
SMART SEARCH**

**Search truyền thống:**

**Phở**

**Search thông minh:**

**"Món dưới 30 phút có thịt gà"**

**"Món healthy dưới 500 calories"**

**"Món cho 2 người dưới 100k"**

**"Món không cay có thịt bò"**

Hệ thống chuyển yêu cầu tự nhiên thành các điều kiện tìm kiếm.

**MODULE 23  
FAVORITE / SAVE**

**Người dùng có thể:**

*   Like recipe.
*   Save recipe.
*   Tạo danh sách món yêu thích.

**Ví dụ:**

️ Favorites

**Breakfast**

**Lunch**

**Dinner**

Healthy

**MODULE 24  
NOTIFICATION**

**Thông báo:**

Cooking Timer

Meal Reminder

Shopping Reminder

New Recipe

Personalized Recommendation

**Ví dụ:**

**Đã đến giờ chuẩn bị bữa tối.**

**MODULE 25  
AI RECIPE GENERATOR**

Đây là phần AI nâng cao.

**Người dùng nhập:**

**Tôi có:**

Thịt gà

Trứng

Cà chua

**Thời gian:**

20 phút

**Ngân sách:**

50.000đ

**Mục tiêu:**

Healthy

AI tạo công thức.

**Kết quả:**

Tên món

Nguyên liệu

Định lượng

Các bước

Thời gian

Dinh dưỡng

Chi phí