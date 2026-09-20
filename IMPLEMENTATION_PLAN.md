# Kế Hoạch Triển Khai Toàn Diện SmartCook Mobile - Đồng Bộ 100% Backend & AI

> **Phiên bản:** 2.1 - Cập nhật thực tế theo tiến độ Backend (Phases 1-4 Backend Đã Sẵn Sàng)  
> **Mobile Client (`smartcook-mobile`):** React Native (Expo SDK 57), TypeScript, Expo Router  
> **Backend Service (`smartcook-backend`):** Node.js Express, TypeScript, MongoDB Atlas, Cloudinary, Gemini AI, Socket.io  
> **Mục tiêu:** Chuyển đổi 100% dữ liệu giả lập (Mock / In-Memory State) trên Mobile thành dữ liệu thật kết nối với `smartcook-backend`, kích hoạt trí tuệ nhân tạo Gemini AI, chat thời gian thực và định vị GPS.

---

## 1. Bản Đồ Trạng Thái Đồng Bộ Giữa Backend và Mobile

Qua rà soát thực tế mã nguồn, Backend hiện đã hoàn thành xong **4 giai đoạn cốt lõi**. Điều này cho phép **Mobile triển khai ngay lập tức 3 Phase đầu tiên** mà không phải chờ đợi:

```
[Backend] Phase 1: Auth & Survey -------------> [Mobile] Phase 1: Auth, Storage & Onboarding   (✅ SẴN SÀNG ĐẤU NỐI NGAY)
[Backend] Phase 2: Categories, Fridge, Recipes -> [Mobile] Phase 2: Recipes Feed, Detail, Scaler (✅ SẴN SÀNG ĐẤU NỐI NGAY)
[Backend] Phase 3: Cloudinary Media Upload ---> [Mobile] Phase 2: Create Custom Recipe Upload (✅ SẴN SÀNG ĐẤU NỐI NGAY)
[Backend] Phase 4: Cooking History & +50 XP ---> [Mobile] Phase 3: Smart Fridge & Chef XP Level (✅ SẴN SÀNG ĐẤU NỐI NGAY)
---------------------------------------------------------------------------------------------------------------------
[Backend] Phase 5: Gemini AI Vision & Chat ---> [Mobile] Phase 4: AI Scan & Draggable Assistant (⏳ Triển khai tiếp theo)
[Backend] Phase 6: Community & Socket.io -----> [Mobile] Phase 5: Social Feed & Realtime Chat   (⏳ Triển khai tiếp theo)
[Backend] Phase 7: Planner & GeoJSON Stores --> [Mobile] Phase 6: Meal Planner & GPS Stores     (⏳ Triển khai tiếp theo)
```

---

## 2. Bảng Đối Chiếu Chi Tiết Từng Tính Năng

| Phân Hệ Tính Năng | Trạng Thái Mobile Frontend | Trạng Thái Backend Hiện Tại | Đánh Giá Khả Năng Đấu Nối |
| :--- | :--- | :--- | :--- |
| **1. Xác thực & Khẩu vị** | Đã có màn `login`, `register`, `onboarding-survey` | Đã có `/auth/register`, `/login`, `/refresh-token`, `/survey`, `/me` | ✅ **Sẵn sàng 100%**. Mobile bắt đầu ngay ở Phase 1. |
| **2. Danh mục & Khám phá món ăn** | Đã có `home.tsx`, bộ lọc thông minh, phân trang | Đã có `/categories`, `/recipes` (hỗ trợ filter calo, thời gian, search) | ✅ **Sẵn sàng 100%**. Mobile đấu nối ở Phase 2. |
| **3. Chi tiết món & Yêu thích** | Đã có `recipe-detail.tsx`, dynamic Scaler khẩu phần | Đã có `/recipes/:id`, `/recipes/:id/favorite` | ✅ **Sẵn sàng 100%**. Mobile đấu nối ở Phase 2. |
| **4. Tạo công thức cá nhân** | Đã có `CreateRecipeModal.tsx` chọn ảnh | `POST /recipes` đã mở quyền cho user đã đăng nhập, upload Cloudinary | ✅ **Sẵn sàng 100%**. Mobile đấu nối ở Phase 2. |
| **5. Bếp của tôi & Tủ lạnh** | Đã có `FridgeView.tsx`, 14 nhóm nguyên liệu | Đã có `/ingredients` (58 nguyên liệu), `/fridge/my-fridge`, `/recipes/fridge-match` | ✅ **Sẵn sàng 100%**. Mobile đấu nối ở Phase 3. |
| **6. Nấu ăn rảnh tay & Điểm XP** | Đã có `cooking-mode.tsx` (Voice TTS), `CookingHistoryModal` | Đã có `/cooking-history` (tự động cộng +50 XP và thăng cấp bậc đầu bếp) | ✅ **Sẵn sàng 100%**. Mobile đấu nối ở Phase 3. |
| **7. AI Scan Nhận Diện Thực Phẩm** | Đã có `ScanAIView.tsx`, vẽ ghim pins trực quan | Backend đã cài `@google/genai`, đang chờ kích hoạt Route | ⏳ Triển khai song hành ở Phase 4. |
| **8. Trợ Lý AI Kéo Thả** | Đã có `DraggableAIAssistant.tsx` kéo thả nổi, chat UI | Backend chuẩn bị Route chat có context tủ lạnh và khẩu vị | ⏳ Triển khai song hành ở Phase 4. |
| **9. Mạng Xã Hội Ẩm Thực** | Đã có `CommunityView.tsx`, `PostCard`, modal tạo bài | Backend chuẩn bị Models `CommunityPost`, `CommunityComment` | ⏳ Triển khai song hành ở Phase 5. |
| **10. Nhắn Tin Thời Gian Thực** | Đã có `DirectChatModal`, `MessengerConversationsModal` | Backend chuẩn bị cài `socket.io` và Gateway Chat | ⏳ Triển khai song hành ở Phase 5. |
| **11. Kế Hoạch Bữa Ăn 7 Ngày** | Đã có `PlannerView.tsx` (lịch tuần, calo, giỏ hàng) | Backend chuẩn bị Model `MealPlan` và thuật toán sinh giỏ hàng | ⏳ Triển khai song hành ở Phase 6. |
| **12. Định Vị Siêu Thị GPS** | Đã có `NearbyStoreCard.tsx`, tính khoảng cách GPS | Backend chuẩn bị Model `Store` với index GeoJSON `2dsphere` | ⏳ Triển khai song hành ở Phase 6. |

---

## 3. Lộ Trình Triển Khai Chi Tiết Cho `smartcook-mobile` (7 Phases)

### 📌 GIAI ĐOẠN 1: Hạ Tầng Mạng, Xác Thực Người Dùng & Quản Lý Phiên (Auth & Storage)
> **Trạng thái Backend:** ĐÃ SẴN SÀNG 100% (`/api/v1/auth/*`)  
> **Mục tiêu Mobile:** Thiết lập kết nối HTTP Axios với Backend, quản lý JWT token trong AsyncStorage, lưu phiên đăng nhập và đồng bộ khảo sát khẩu vị 6 tiêu chí vào MongoDB.

- [x] **1.1. Cài Đặt Thư Viện Thiết Yếu**:
  ```bash
  npx expo install @react-native-async-storage/async-storage
  npm install axios
  ```
- [x] **1.2. Cấu Hình Biến Môi Trường (`.env`)**:
  - `EXPO_PUBLIC_API_URL=http://10.0.2.2:5000/api/v1` (cho Android Emulator) hoặc IP LAN máy tính cho thiết bị thật.
- [x] **1.3. Xây Dựng Tầng Mạng Chuẩn Hóa (`src/services/apiClient.ts`)**:
  - Cấu hình Axios instance với `timeout: 15000`.
  - **Request Interceptor**: Tự động lấy JWT từ AsyncStorage và gắn header `Authorization: Bearer <token>`.
  - **Response Interceptor**: Bắt mã lỗi `401 Unauthorized`. Tự động dùng `refreshToken` gọi API `/auth/refresh-token` để lấy token mới mà không làm gián đoạn trải nghiệm người dùng (Silent Refresh).
- [x] **1.4. Xây Dựng `AuthContext.tsx` & Hook `useAuth()`**:
  - Quản lý trạng thái toàn cục: `user`, `accessToken`, `isAuthenticated`, `isLoading`.
  - Tại `src/app/index.tsx` (Splash Screen): Tự động kiểm tra token lưu trong AsyncStorage -> Nếu còn hạn vào thẳng `home`, nếu chưa hoặc hết hạn điều hướng về `login`.
  - Cung cấp các hàm: `login()`, `register()`, `logout()`, `updatePreferences()`.
- [x] **1.5. Đấu Nối Các Màn Hình**:
  - `src/app/login.tsx`: Gọi `useAuth().login()`, hiển thị thông báo lỗi từ Backend khi sai tài khoản/mật khẩu.
  - `src/app/register.tsx`: Gọi `useAuth().register()`, đăng ký thành công chuyển sang khảo sát khẩu vị.
  - `src/app/onboarding-survey.tsx`: Gọi API `POST /api/v1/auth/survey` lưu 6 tiêu chí khẩu vị (khẩu phần, món ăn yêu thích, dị ứng, mục tiêu sức khoẻ, vị yêu thích, thời gian nấu) trực tiếp vào MongoDB.
  - `src/components/features/ProfileView.tsx`: Gọi `GET /api/v1/auth/me` hiển thị tên thật, email, danh hiệu và sở thích ăn uống.

---

### 📌 GIAI ĐOẠN 2: Khám Phá Công Thức, Bộ Lọc Món Ăn & Tạo Món Cá Nhân (Recipes Feed)
> **Trạng thái Backend:** ĐÃ SẴN SÀNG 100% (`/api/v1/recipes`, `/api/v1/categories`)  
> **Mục tiêu Mobile:** Thay thế dữ liệu cứng `RECIPES_DATA` trên Mobile bằng API thật; hỗ trợ tìm kiếm, lọc calo, thời gian nấu và đăng công thức món ăn mới kèm ảnh lên Cloudinary.

- [ ] **2.1. Xây Dựng `src/services/recipeService.ts`**:
  - `getRecipes(params)`: Tải danh sách món ăn phân trang kèm query (danh mục, tìm kiếm, thời gian, calo).
  - `getRecipeById(id)`: Lấy chi tiết món ăn thật.
  - `toggleFavorite(id)`: Gọi `POST /api/v1/recipes/:id/favorite` đồng bộ danh sách yêu thích vào MongoDB.
  - `createRecipe(formData)`: Gửi multipart `FormData` lên Backend để upload ảnh lên Cloudinary và lưu công thức vào MongoDB.
- [ ] **2.2. Đấu Nối Trang Khám Phá (`src/app/home.tsx`)**:
  - Gọi API `/api/v1/categories` hiển thị thanh danh mục động.
  - Tích hợp `RefreshControl` (Pull-to-refresh) tải lại danh sách món ăn mới nhất.
  - Đấu nối Bộ Lọc Thông Minh (Smart Filter Modal): Áp dụng các tiêu chí thời gian (<15p, <30p), calo (<400kcal, <600kcal) vào API Query.
  - Xử lý trạng thái Skeleton Loading và Empty State khi không tìm thấy món.
- [ ] **2.3. Đấu Nối Chi Tiết Món Ăn (`src/app/recipe-detail.tsx`)**:
  - Lấy dữ liệu công thức thật theo ID từ URL params.
  - Đồng bộ trạng thái yêu thích với MongoDB.
  - Giữ nguyên bộ Scaler tự động co giãn định lượng nguyên liệu theo số người ăn.
- [ ] **2.4. Đấu Nối Tạo Món Mới (`src/components/recipe/CreateRecipeModal.tsx`)**:
  - Chọn ảnh món ăn từ thư viện qua `expo-image-picker`.
  - Gửi `FormData` lên `POST /api/v1/recipes` để lưu món ăn do chính người dùng sáng tạo.

---

### 📌 GIAI ĐOẠN 3: Bếp Của Tôi (`FridgeView`), Gợi Ý Món Ăn & Điểm Kinh Nghiệm (Chef XP)
> **Trạng thái Backend:** ĐÃ SẴN SÀNG 100% (`/api/v1/fridge`, `/api/v1/ingredients`, `/api/v1/cooking-history`)  
> **Mục tiêu Mobile:** Quản lý kho thực phẩm tủ lạnh thực tế của người dùng; gợi ý món nấu được ngay theo % khớp nguyên liệu; ghi nhận lịch sử và thăng cấp bậc đầu bếp sau khi nấu.

- [ ] **3.1. Đấu Nối `src/components/features/FridgeView.tsx`**:
  - Gọi `GET /api/v1/ingredients` lấy danh mục 58 nguyên liệu chuẩn thuộc 14 nhóm.
  - Gọi `GET /api/v1/fridge/my-fridge` lấy nguyên liệu đang có trong tủ của người dùng.
  - Đấu nối thêm/xoá nguyên liệu vào tủ qua `/api/v1/fridge/items`.
  - Gọi API `/api/v1/recipes/fridge-match` để hiển thị danh sách các món nấu được ngay với tỷ lệ khớp nguyên liệu cao nhất (>80%).
- [ ] **3.2. Đấu Nối Chế Độ Nấu Ăn & Lịch Sử (`cooking-mode.tsx` & `CookingHistoryModal.tsx`)**:
  - Khi hoàn thành bước nấu ăn cuối cùng trong `cooking-mode.tsx`, màn hình Celebration gửi API `POST /api/v1/cooking-history` ghi nhận món đã nấu.
  - Backend tự động cộng **+50 XP** vào tài khoản và kiểm tra thăng cấp bậc ("Tập sự" $\rightarrow$ "Bếp gia đình" $\rightarrow$ "Đầu bếp tài ba" $\rightarrow$ "Bếp trưởng").
  - Cập nhật số điểm XP tích luỹ tức thì trên giao diện `ProfileView.tsx`.

---

### 📌 GIAI ĐOẠN 4: Trí Tuệ Nhân Tạo Thông Minh (Gemini AI Vision Scan & Chat Assistant)
> **Trạng thái Backend:** Kích hoạt Backend Phase 5 (`/api/v1/ai/*`)  
> **Mục tiêu Mobile:** Chụp ảnh thực phẩm thật qua camera -> Gemini Vision nhận diện và vẽ các ghim pin trực quan trên ảnh; tư vấn thực đơn qua Trợ lý ảo AI bóng nổi.

- [ ] **4.1. Kích hoạt Backend Phase 5 (`src/services/ai.service.ts` & `ai.route.ts`)**:
  - `POST /api/v1/ai/scan-ingredients`: Nhận ảnh từ mobile -> Gemini 1.5 Flash Vision nhận diện thực phẩm, trả về danh sách nguyên liệu, toạ độ thẻ ghim pin (`pins`) và gợi ý món ăn tối ưu.
  - `POST /api/v1/ai/assistant-chat`: Nhận câu hỏi kèm context tủ lạnh và khẩu vị người dùng để trả lời cá nhân hoá.
  - Model `ScanHistory` lưu lại các lần quét.
- [ ] **4.2. Đấu Nối Mobile `src/components/features/ScanAIView.tsx`**:
  - Chụp ảnh từ Camera hoặc chọn từ thư viện ảnh (`expo-image-picker`).
  - Gửi `FormData` lên `/api/v1/ai/scan-ingredients`.
  - Hiển thị hiệu ứng Laser Scanning trong thời gian chờ AI xử lý.
  - Vẽ động các thẻ ghim pin nhận diện lên ảnh theo tọa độ trả về từ Gemini.
  - Thêm nút "Lưu tất cả vào tủ lạnh": Tự động thêm toàn bộ nguyên liệu vừa nhận diện vào `user_fridges`.
- [ ] **4.3. Đấu Nối Mobile `src/components/common/DraggableAIAssistant.tsx`**:
  - Đấu nối chat box với endpoint `/api/v1/ai/assistant-chat`.
  - Hiển thị trạng thái typing indicator sinh động.

---

### 📌 GIAI ĐOẠN 5: Mạng Xã Hội Cộng Đồng & Nhắn Tin Thời Gian Thực (Community & Socket.io)
> **Trạng thái Backend:** Kích hoạt Backend Phase 6 (`/api/v1/community/*` & Socket.io Gateway)  
> **Mục tiêu Mobile:** Chia sẻ công thức và hình ảnh món ăn lên bảng tin; nhắn tin trực tiếp 1-1 và phòng chat ẩm thực thời gian thực qua WebSocket.

- [ ] **5.1. Kích hoạt Backend Phase 6**:
  - Cài đặt `socket.io` và cấu hình HTTP Server wrapper trong `src/server.ts`.
  - Tạo Models `CommunityPost`, `CommunityComment`, `Conversation`, `Message`.
  - Tạo Socket Handler: Xác thực JWT handshake, xử lý gửi/nhận tin nhắn 1-1 tức thời (`send_message`, `receive_message`), phòng chat chung, trạng thái online/typing.
  - Routes CRUD bài viết, like/unlike, bình luận.
- [ ] **5.2. Đấu Nối Mobile `SocketContext.tsx` & `CommunityView.tsx`**:
  - Cài đặt `socket.io-client`.
  - Quản lý kết nối Socket.io toàn cục sau khi user đăng nhập.
  - Bảng tin bài viết thật từ Backend, tương tác like tức thời (Optimistic Update).
  - Đăng bài mới kèm ảnh tải lên Cloudinary qua `CreatePostModal.tsx`.
  - Bình luận thời gian thực qua `CommentsModal.tsx`.
  - `DirectChatModal.tsx`: Nhắn tin 1-1 không độ trễ.
  - `MessengerConversationsModal.tsx`: Cập nhật số tin chưa đọc (`unreadCount`).

---

### 📌 GIAI ĐOẠN 6: Kế Hoạch Bữa Ăn (`PlannerView`), Giỏ Đi Chợ & Định Vị Siêu Thị GPS
> **Trạng thái Backend:** Kích hoạt Backend Phase 7 (`/api/v1/planner/*`, `/api/v1/stores/*`)  
> **Mục tiêu Mobile:** Đưa tính năng Meal Planner vào luồng trải nghiệm người dùng; tự động sinh danh mục đi chợ và tìm siêu thị thật gần toạ độ GPS.

- [ ] **6.1. Kích hoạt Backend Phase 7**:
  - Model `MealPlan`: Lưu thực đơn tuần 7 ngày (Sáng, Trưa, Tối).
  - Model `Store` với index GeoJSON `2dsphere`: Lưu siêu thị tại Việt Nam.
  - API `/api/v1/planner/shopping-list`: Thuật toán tự động sinh danh mục đi chợ:
    $$\text{Danh mục đi chợ} = \text{Tổng nguyên liệu cần nấu 7 ngày} - \text{Nguyên liệu đang có trong tủ lạnh}$$
  - API `/api/v1/stores/nearby?lat=...&lng=...`: Tìm siêu thị lân cận toạ độ GPS của user.
- [ ] **6.2. Đấu Nối Mobile**:
  - Thêm nút truy cập nhanh "Kế Hoạch Bữa Ăn" trên Header trang Khám Phá hoặc Profile.
  - Hiển thị thực đơn 7 ngày từ Backend, tính tổng calo mỗi ngày so với mục tiêu sức khoẻ.
  - Đấu nối danh mục đi chợ tự động trong `PlannerView.tsx` và `ShoppingNoteModal.tsx`.
  - Đấu nối `NearbyStoreCard.tsx`: Lấy GPS thật qua `expo-location`, hiển thị siêu thị lân cận và mở bản đồ Google/Apple Maps chỉ đường.

---

### 📌 GIAI ĐOẠN 7: Tối Ưu UX, Bàn Phím Di Động & Kiểm Thử Toàn Diện (Final Polish)
> **Mục tiêu:** Rà soát toàn diện trải nghiệm người dùng, đảm bảo hiệu năng tối ưu trên thiết bị di động thật và kiểm thử end-to-end không phát sinh lỗi.

- [ ] Áp dụng `KeyboardAvoidingView` và `TouchableWithoutFeedback` trên tất cả Modal và Form.
- [ ] Sử dụng cache hình ảnh của `expo-image` tiết kiệm băng thông.
- [ ] Chạy kiểm thử TypeScript `npx tsc --noEmit` trên cả Backend và Mobile đạt **0 lỗi**.
- [ ] Kiểm thử luồng người dùng khép kín (Đăng ký $\rightarrow$ Khảo sát $\rightarrow$ Quét AI $\rightarrow$ Nấu ăn rảnh tay $\rightarrow$ Nhận XP $\rightarrow$ Đăng bài cộng đồng $\rightarrow$ Lập thực đơn tuần $\rightarrow$ Đi chợ).

---

## 4. Bắt Đầu Ngay

Vì **Backend Phase 1, 2, 3, 4 đã hoàn thành và sẵn sàng 100%**, chúng ta sẽ tiến hành ngay:
👉 **BƯỚC ĐẦU TIÊN:** Bắt tay vào **Phase 1 của Mobile** (Cài thư viện, tạo `apiClient.ts`, `AuthContext.tsx` và đấu nối màn Đăng nhập, Đăng ký, Khảo sát khẩu vị và Profile).
