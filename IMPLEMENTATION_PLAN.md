# Kế Hoạch Triển Khai Toàn Diện SmartCook Mobile - Đồng Bộ 100% Backend & AI

> **Phiên bản:** 6.0 - Hoàn thành Phase 6 (Meal Planner, Smart Shopping List & GPS Stores)  
> **Mobile Client (`smartcook-mobile`):** React Native (Expo SDK 57.0.24), TypeScript, Expo Router, NativeWind/Tailwind  
> **Backend Service (`smartcook-backend`):** Node.js Express 5, TypeScript, MongoDB Atlas, Cloudinary CDN, Google Gemini 1.5 Flash Vision, Socket.io Realtime Gateway  
> **Mục tiêu:** Chuyển đổi toàn diện 100% dữ liệu mock trên Mobile sang kết nối trực tiếp với Backend, kích hoạt toàn bộ AI Gemini Vision & Chatbot Chef, Mạng xã hội & Chat WebSocket thời gian thực, Lập thực đơn tuần 7 ngày, Giỏ đi chợ thông minh và Định vị siêu thị GPS.

---

## 1. Bản Đồ Trạng Thái Đồng Bộ Kiến Trúc (Backend vs Mobile)

Qua rà soát chi tiết 100% mã nguồn của cả hai dự án `smartcook-backend` và `smartcook-mobile`:
- **Backend (`smartcook-backend`) ĐÃ HOÀN TẤT 100% TẤT CẢ CÁC PHÂN HỆ (Phases 1 đến 7)**:
  - Phase 1: Auth (JWT, Refresh Token, Google OAuth, Profile, Khảo sát khẩu vị 6 tiêu chí).
  - Phase 2: Danh mục, 58 nguyên liệu chuẩn (14 nhóm), Công thức món ăn, Bộ Scaler, Upload Cloudinary.
  - Phase 3: Kho Tủ Lạnh (`UserFridge` atomic upsert), Xếp hạng món khớp tủ lạnh (`/recipes/fridge-match`), Nấu ăn rảnh tay TTS +50 XP Gamification & Lịch sử nấu ăn (`/cooking-history`).
  - Phase 4: Gemini 1.5 Flash Vision quét thực phẩm vẽ Pins toạ độ (`/ai/scan-ingredients`), Lịch sử quét (`/ai/scan-history`), Trợ lý AI Bếp trưởng (`/ai/assistant-chat`).
  - Phase 5: Mạng xã hội cộng đồng (`/community/posts`, like, react, comment +5 XP, +20 XP) & Gateway Socket.io (`ws://localhost:5000`, 3 phòng chat mặc định, 1-1 direct chat).
  - Phase 6: Kế hoạch thực đơn tuần 7 ngày (`/planner/current-week`, `/planner/meals`), Danh mục đi chợ thông minh tự trừ đồ có sẵn (`/planner/shopping-list`), Đồng bộ giỏ đi chợ vào tủ lạnh (`/planner/sync-to-fridge`).
  - Phase 7: Định vị siêu thị GPS (`/stores/nearby` MongoDB 2dsphere `$geoNear`, tính khoảng cách và thời gian xe máy/đi bộ).

- **Mobile (`smartcook-mobile`) Tiến độ thực tế hiện tại**:
  - **Phase 1**: ✅ **100% HOÀN TẤT** (Auth, JWT Interceptor, Silent Refresh, Khảo sát, Profile).
  - **Phase 2**: ✅ **100% HOÀN TẤT** (Danh mục MongoDB, Phân trang, Bộ lọc thông minh, Chi tiết món Scaler, Đăng món Cloudinary).
  - **Phase 3**: ✅ **100% HOÀN TẤT** (Bếp của tôi `FridgeView`, 14 nhóm nguyên liệu, Xếp hạng món khớp tủ lạnh, Nấu rảnh tay TTS, +50 XP Gamification, Lịch sử nấu ăn).
  - **Phase 4**: ✅ **100% HOÀN TẤT** (Gemini 1.5 Flash Vision quét thực phẩm, Bounding Pins, Lưu tủ lạnh 1 chạm, Lịch sử MongoDB, Trợ lý ảo AI Bếp trưởng bóng nổi).
  - **Phase 5**: ✅ **100% HOÀN TẤT** (Bảng tin cộng đồng, Like/Comment Gamification +20 XP & +5 XP, Realtime Socket.io Chat, 3 Phòng chat ẩm thực & Chat 1-1).
  - **Phase 6**: ✅ **100% HOÀN TẤT** (Thực đơn tuần 7 ngày, Giỏ đi chợ thông minh trừ đồ tủ lạnh, 1-Click đồng bộ vào tủ lạnh, Định vị siêu thị GPS).
  - **Phase 7**: ✅ **100% CODE & AUTOMATED E2E** (Tối ưu UX, Haptics, SecureStore, Auth Guard & Full E2E Test Suite).

```
====================================================================================================
TIẾN ĐỘ ĐỒNG BỘ TOÀN DỰ ÁN (PROJECT SYNCHRONIZATION MATRIX)
====================================================================================================
[Phase 1] Xác thực & Khảo sát khẩu vị      | Backend: [✅ 100%] ===> Mobile: [✅ 100% HOÀN TẤT]
[Phase 2] Công thức, Scaler & Đăng món      | Backend: [✅ 100%] ===> Mobile: [✅ 100% HOÀN TẤT]
[Phase 3] Bếp thông minh & Chef XP (+50XP)  | Backend: [✅ 100%] ===> Mobile: [✅ 100% HOÀN TẤT]
[Phase 4] Gemini AI Vision & Chatbot Chef   | Backend: [✅ 100%] ===> Mobile: [✅ 100% HOÀN TẤT]
[Phase 5] Mạng xã hội & Socket.io Realtime  | Backend: [✅ 100%] ===> Mobile: [✅ 100% HOÀN TẤT]
[Phase 6] Thực đơn tuần & Siêu thị GPS      | Backend: [✅ 100%] ===> Mobile: [✅ 100% HOÀN TẤT]
[Phase 7] Tối ưu hóa UX & Kiểm thử E2E      | Backend: [✅ 100%] ===> Mobile: [✅ 100% CODE & E2E]
====================================================================================================
```

---

## 2. Bảng Đối Chiếu Toàn Diện Endpoints Backend & Thành Phần Mobile

| Phân Hệ Tính Năng | Thành Phần Giao Diện Mobile | API Endpoints Backend Tương Ứng | Trạng Thái Kỹ Thuật |
| :--- | :--- | :--- | :--- |
| **1. Xác thực & Khẩu vị** | `login.tsx`, `register.tsx`, `onboarding-survey.tsx`, `ProfileView.tsx`, `EditProfileModal.tsx` | `POST /auth/register`<br>`POST /auth/login`<br>`POST /auth/google`<br>`POST /auth/refresh-token`<br>`POST /auth/survey`<br>`GET /auth/me`<br>`PUT /auth/profile`<br>`POST /auth/logout` | ✅ **HOÀN THÀNH 100%**<br>(Token Interceptor, Silent Refresh, 13/13 test E2E passed) |
| **2. Danh mục & Khám phá món ăn** | `(main)/home.tsx`<br>Smart Filter Modal<br>Category Tabs Carousel | `GET /categories`<br>`GET /recipes`<br>Query: `category`, `search`, `difficulty`, `maxMinutes`, `maxCalories`, `page`, `limit` | ✅ **HOÀN THÀNH 100%**<br>(Dữ liệu động MongoDB, phân trang, skeleton loader, pull-to-refresh) |
| **3. Chi tiết món & Scaler khẩu phần** | `(main)/recipe-detail.tsx`<br>Dynamic Portion Scaler<br>Favorite Heart Button | `GET /recipes/:id`<br>`POST /recipes/:id/favorite` (Toggle yêu thích lưu vào `user.favoriteRecipeIds`) | ✅ **HOÀN THÀNH 100%**<br>(Dữ liệu thật MongoDB, bộ Scaler co giãn nguyên liệu, tim yêu thích) |
| **4. Tạo công thức cá nhân** | `CreateRecipeModal.tsx`<br>Chọn ảnh `expo-image-picker`<br>4 bước sơ chế & nấu | `POST /recipes`<br>Multipart `FormData` tải ảnh lên Cloudinary `smartcook/recipes`, gán `authorId` chính chủ. | ✅ **HOÀN THÀNH 100%**<br>(Upload Cloudinary, tạo công thức cá nhân, lưu MongoDB) |
| **5. Bếp của tôi & Tủ lạnh** | `FridgeView.tsx`<br>14 nhóm nguyên liệu chuẩn<br>Bộ gợi ý món nấu được ngay | `GET /ingredients` (58 master items)<br>`GET /fridge/my-fridge`<br>`POST /fridge/items`<br>`PUT /fridge/items/:id`<br>`DELETE /fridge/items/:id`<br>`GET /recipes/fridge-match` (xếp hạng món theo % khớp) | ✅ **HOÀN THÀNH 100%**<br>(Kho nguyên liệu MongoDB, phân loại ngăn lưu trữ, gợi ý theo % khớp) |
| **6. Nấu ăn rảnh tay & Điểm XP** | `(main)/cooking-mode.tsx` (TTS tiếng Việt)<br>`CookingHistoryModal.tsx` | `POST /cooking-history` (Tự động cộng **+50 XP** và thăng hạng cấp bậc đầu bếp)<br>`GET /cooking-history`<br>`DELETE /cooking-history/:id` | ✅ **HOÀN THÀNH 100%**<br>(Tự động ghi nhận lịch sử, +50 XP Gamification, modal lịch sử) |
| **7. AI Vision Scan Thực Phẩm** | `ScanAIView.tsx`<br>Laser Scan Animation<br>Thẻ ghim toạ độ Pins trực quan | `POST /ai/scan-ingredients` (Upload ảnh -> Gemini 1.5 Flash Vision -> Trả về `ingredients`, `pins` toạ độ %, `suggestedRecipe`)<br>`GET /ai/scan-history`<br>`DELETE /ai/scan-history/:id` | ✅ **HOÀN THÀNH 100%**<br>(Chụp/chọn ảnh, Bounding Pins %, Lưu tủ lạnh MongoDB, 10/10 test E2E passed) |
| **8. Trợ Lý AI Kéo Thả** | `DraggableAIAssistant.tsx`<br>Bóng nổi kéo thả, chatbox gợi ý | `POST /ai/assistant-chat` (Gemini Chef tiếp nhận câu hỏi kèm context Tủ lạnh & Khẩu vị, trả về `replyText`, `suggestedDishes`, `quickPrompts`) | ✅ **HOÀN THÀNH 100%**<br>(Prompt động, click món điều hướng nấu ngay, 10/10 test E2E passed) |
| **9. Mạng Xã Hội Ẩm Thực** | `CommunityView.tsx`<br>`PostCard.tsx`<br>`CreatePostModal.tsx`<br>`CommentsModal.tsx` | `GET /community/posts`<br>`POST /community/posts` (ảnh Cloudinary, +20 XP)<br>`POST /community/posts/:id/like`<br>`POST /community/posts/:id/react`<br>`GET/POST /community/posts/:id/comments` (+5 XP)<br>`DELETE /community/posts/:id` | ✅ **HOÀN THÀNH 100%**<br>(Bảng tin phân trang, đăng bài +20 XP, thả tim/hủy tim, bình luận lồng nhau +5 XP, 12/12 test E2E passed) |
| **10. Nhắn Tin Thời Gian Thực** | `DirectChatModal.tsx`<br>`MessengerConversationsModal.tsx`<br>`ChatRoomModal.tsx` | Socket.io Server `ws://localhost:5000`<br>JWT Handshake, Events: `join_room`, `leave_room`, `send_message`, `new_message`, `typing`, `user_typing`<br>REST API: `/chat/rooms`, `/chat/conversations`, `/chat/direct` | ✅ **HOÀN THÀNH 100%**<br>(Socket.io Client, 3 phòng chat cộng đồng, chat 1-1 tức thời, 12/12 test E2E passed) |
| **11. Thực Đơn Tuần & Giỏ Đi Chợ** | `PlannerView.tsx`<br>`ShoppingNoteModal.tsx`<br>Đồng bộ giỏ vào tủ lạnh | `GET /planner/current-week`<br>`PUT /planner/meals`<br>`DELETE /planner/meals`<br>`GET /planner/shopping-list` (Thuật toán trừ nguyên liệu có trong tủ lạnh)<br>`POST /planner/shopping-list`<br>`PATCH /planner/shopping-list/:id/bought`<br>`DELETE /planner/shopping-list/clear-bought`<br>`POST /planner/sync-to-fridge` | ✅ **HOÀN THÀNH 100%**<br>(Thực đơn tuần 7 ngày, giỏ đi chợ tự trừ đồ tủ lạnh, 1-Click đồng bộ, 12/12 test E2E passed) |
| **12. Định Vị Siêu Thị GPS** | `NearbyStoreCard.tsx`<br>Tính khoảng cách & thời gian đi xe/đi bộ | `GET /stores/nearby?lat=...&lng=...&radiusKm=...&limit=...` (MongoDB 2dsphere `$geoNear`)<br>`GET /stores`<br>`GET /stores/:id` | ✅ **HOÀN THÀNH 100%**<br>(Định vị toạ độ GPS thực tế, tính khoảng cách, phân loại chuỗi siêu thị, chỉ đường bản đồ) |

---

## 3. Lộ Trình Triển Khai Chi Tiết Cho `smartcook-mobile` (7 Phases)

---

### 📌 GIAI ĐOẠN 1: Hạ Tầng Mạng, Xác Thực Người Dùng & Quản Lý Phiên (Auth & Storage)
> **Trạng thái:** ✅ **ĐÃ HOÀN THÀNH 100% (VERIFIED & TESTED)**  
> **Cam kết:** Không còn lỗi TypeScript, kiểm thử E2E đạt 13/13 test passed, code đã đồng bộ trên branch `develop`.

- [x] **1.1. Cài Đặt & Cấu Hình Thư Viện Cốt Lõi**:
  - `axios`, `@react-native-async-storage/async-storage`, `expo-crypto`, `expo-auth-session`, `expo-image-picker`.
  - Cập nhật Expo SDK 57.0.24 tương thích React 19 và React Native 0.76.
  - Cấu hình file `tsconfig.json` chuẩn ESNext, khắc phục triệt để lỗi đỏ thư mục `node_modules`.
- [x] **1.2. Chuẩn Hóa Tầng Mạng (`src/services/apiClient.ts`)**:
  - Cấu hình Axios Base URL từ `EXPO_PUBLIC_API_URL`.
  - **Request Interceptor**: Tự động đính kèm `Authorization: Bearer <accessToken>` từ AsyncStorage.
  - **Response Interceptor & Silent Refresh**: Bắt mã `401 Unauthorized`, gọi `/api/v1/auth/refresh-token` cấp lại Access Token mới tự động và gửi lại request cũ mà người dùng không bị văng ra khỏi app.
- [x] **1.3. Quản Lý Trạng Thái Toàn Cục (`src/contexts/AuthContext.tsx`)**:
  - Quản lý `user`, `accessToken`, `isAuthenticated`, `isLoading`.
  - Splash Router (`src/app/index.tsx`): Kiểm tra token, điều hướng tự động vào `home` hoặc `login`.
- [x] **1.4. Đấu Nối Các Màn Hình Xác Thực & Khẩu Vị**:
  - `src/app/(auth)/login.tsx`: Banner báo lỗi viền đỏ nổi bật khi sai thông tin; Nút Đăng nhập Google kích hoạt trực tiếp `WebBrowser.openAuthSessionAsync` với Web Client ID & iOS Client ID (`315474311920-9kt3qadvei4mrdncf7h8ot8hj5fkjuv5.apps.googleusercontent.com`).
  - `src/app/(auth)/register.tsx`: Đăng ký tài khoản mới và điều hướng chuẩn xác sang `login`.
  - `src/app/(auth)/onboarding-survey.tsx`: Lưu 6 chiều dữ liệu khẩu vị (`portion`, `cuisines`, `healthGoal`, `restrictions`, `tasteProfile`, `cookingTime`) trực tiếp vào MongoDB qua `POST /api/v1/auth/survey`.
  - `src/components/features/ProfileView.tsx`: Hiển thị thông tin người dùng từ `GET /api/v1/auth/me`.
  - `src/components/features/EditProfileModal.tsx`: Chỉnh sửa họ tên, avatar qua `PUT /api/v1/auth/profile`, tuân thủ 100% React Compiler Rules (không render lặp, không lỗi ESLint).

---

### 📌 GIAI ĐOẠN 2: Khám Phá Công Thức, Bộ Lọc Món Ăn & Tạo Món Cá Nhân (Recipes Feed & Scaler)
> **Trạng thái:** ✅ **ĐÃ HOÀN THÀNH 100% (VERIFIED & TESTED)**  
> **Cam kết:** 29/29 test kiểm thử tự động passed, TypeScript 0 lỗi, tải dữ liệu trực tiếp từ MongoDB & Cloudinary Media CDN.

- [x] **2.1. Nâng cấp `src/services/recipeService.ts` & tạo `src/services/categoryService.ts`**:
  - `categoryService.getCategories()`: Gọi `GET /api/v1/categories`, trả về danh sách danh mục động (Gia đình, Nấu nhanh, Healthy, Tiết kiệm...).
  - `recipeService.getRecipes(params)`:
    - Query parameters: `{ category?: string, search?: string, difficulty?: string, maxMinutes?: number, maxCalories?: number, page?: number, limit?: number }`.
    - Trả về danh sách món ăn từ MongoDB kèm metadata phân trang (`total`, `totalPages`, `currentPage`).
  - `recipeService.getRecipeById(id)`: Gọi `GET /api/v1/recipes/:id` lấy dữ liệu chi tiết một món ăn, ưu tiên mock ID nếu offline.
  - `recipeService.toggleFavorite(id)`: Gọi `POST /api/v1/recipes/:id/favorite`, cập nhật trạng thái yêu thích hai chiều (giữa Recipe Card và User Profile).
  - `recipeService.createRecipe(formData: FormData)`: Gửi multipart `FormData` lên `POST /api/v1/recipes` để upload ảnh lên Cloudinary và lưu công thức vào MongoDB.
- [x] **2.2. Đấu nối Màn Hình Trang Chủ Khám Phá (`src/app/(main)/home.tsx`)**:
  - Thay thế danh sách danh mục cứng bằng dữ liệu từ `categoryService.getCategories()`.
  - Thay thế `RECIPES_DATA` bằng hook lấy dữ liệu từ `recipeService.getRecipes(...)`.
  - **Pull-to-refresh (`RefreshControl`)**: Vuốt xuống để làm mới danh sách công thức.
  - **Phân trang (Pagination / Numbered Pages)**: Điều hướng trang linh hoạt theo metadata từ Backend.
  - **Bộ Lọc Thông Minh (Smart Filter Modal)**:
    - Lọc thời gian chế biến: `< 15 phút`, `< 30 phút`, `< 60 phút`.
    - Lọc lượng calo: `< 400 kcal`, `< 600 kcal`, `< 800 kcal`.
    - Lọc độ khó: `Dễ`, `Trung bình`, `Nâng cao`.
    - Đấu nối trực tiếp các filter này vào API query của Backend.
  - **Trạng Thái Tải Dữ Liệu**:
    - Hiển thị Skeleton Loading dạng thẻ card khi đang fetch API.
    - Hiển thị Empty State thân thiện ("Không tìm thấy món ăn phù hợp") khi kết quả tìm kiếm rỗng kèm nút "Đặt lại bộ lọc".
- [x] **2.3. Đấu nối Màn Hình Chi Tiết Món Ăn (`src/app/(main)/recipe-detail.tsx`)**:
  - Đọc `id` từ Expo Router params (`useLocalSearchParams`).
  - Gọi `recipeService.getRecipeById(id)` hiển thị dữ liệu chi tiết thật từ Backend.
  - Nút Trái tim Yêu thích: Gọi `toggleFavorite(id)`, xử lý Optimistic Update đổi màu tim đỏ ngay lập tức và đồng bộ vào MongoDB.
  - **Bảo toàn Bộ Scaler Khẩu Phần (Dynamic Portion Scaler)**:
    - Giữ nguyên công thức tính toán: Khi người dùng đổi từ 2 người lên 4 người ăn, toàn bộ khối lượng định lượng nguyên liệu (`amount`) tự động nhân hệ số tỉ lệ tương ứng.
  - Chuyển tiếp danh sách các bước nấu và thời gian timer sang `cooking-mode.tsx`.
- [x] **2.4. Đấu nối Tạo Công Thức Mới (`src/components/recipe/CreateRecipeModal.tsx`)**:
  - Chọn ảnh món ăn thực tế qua `expo-image-picker` (chụp từ camera hoặc chọn từ album ảnh).
  - Thu thập đầy đủ 4 bước tạo món: Thông tin cơ bản, Danh sách nguyên liệu, Các bước chế biến, Dinh dưỡng & Lời khuyên.
  - Đóng gói dữ liệu thành `FormData`:
    - File ảnh: `{ uri, name: 'recipe.jpg', type: 'image/jpeg' }`.
    - Các trường chuỗi: `title`, `categoryCode`, `difficulty`, `minutes`, `calories`, `servings`, `description`.
    - Các trường mảng dạng JSON string: `ingredients`, `steps`, `nutrition`, `tags`.
  - Gọi `recipeService.createRecipe(formData)`.
  - Khi Backend trả về công thức mới (kèm link ảnh Cloudinary), tự động chèn món mới vào đầu danh sách món ăn trên Home và thông báo thành công.

---

### 📌 GIAI ĐOẠN 3: Bếp Của Tôi (`FridgeView`), Xếp Hạng Món Khớp Tủ Lạnh & Điểm Thưởng Đầu Bếp (+50 XP)
> **Trạng thái:** ✅ **ĐÃ HOÀN THÀNH 100% (VERIFIED & TESTED)**  
> **Cam kết:** 10/10 test E2E passed, TypeScript 0 lỗi, xử lý triệt để race condition tạo tủ lạnh song song (`E11000`) và lỗi CastError ObjectId. Đã commit và push toàn bộ lên nhánh `develop`.  
> **Mục tiêu Mobile:** Quản lý kho thực phẩm tủ lạnh thực tế của người dùng; xếp hạng món ăn nấu được ngay theo % khớp nguyên liệu; ghi nhận lịch sử nấu ăn và thăng cấp bậc đầu bếp.

- [x] **3.1. Xây dựng `src/services/fridgeService.ts`**:
  - `getMasterIngredients()`: Gọi `GET /api/v1/ingredients` lấy 58 nguyên liệu chuẩn thuộc 14 nhóm.
  - `getMyFridge()`: Gọi `GET /api/v1/fridge/my-fridge` lấy kho thực phẩm của người dùng đăng nhập.
  - `addFridgeItem(item)`: Gọi `POST /api/v1/fridge/items` thêm nguyên liệu kèm hạn sử dụng và số lượng.
  - `updateFridgeItem(id, data)`: Gọi `PUT /api/v1/fridge/items/:id`.
  - `removeFridgeItem(id)`: Gọi `DELETE /api/v1/fridge/items/:id`.
  - `getFridgeMatchedRecipes(limit)`: Gọi `GET /api/v1/recipes/fridge-match` lấy danh sách món ăn xếp theo tỷ lệ khớp nguyên liệu giảm dần.
- [x] **3.2. Đấu nối Màn Hình Tủ Lạnh (`src/components/features/FridgeView.tsx`)**:
  - Hiển thị danh mục 14 nhóm nguyên liệu từ API Backend (Thịt, Hải sản, Rau xanh, Củ quả, Trứng & Đậu, Gia vị...).
  - Phân loại vị trí lưu trữ: Ngăn mát, Ngăn đông, Tủ khô.
  - Thêm/Xoá nguyên liệu khỏi tủ lạnh với hiệu ứng mượt mà và lưu trực tiếp vào MongoDB.
  - Hiển thị mục "Gợi ý nấu ngay từ tủ lạnh" với các món có `% khớp > 70%`.
- [x] **3.3. Xây dựng `src/services/cookingHistoryService.ts` & Đấu nối Chế Độ Nấu Rảnh Tay**:
  - `recordCooking(data)`: Gửi `POST /api/v1/cooking-history` gồm `{ recipeId, durationMinutes, rating, notes }`.
  - Tại bước cuối cùng của `src/app/(main)/cooking-mode.tsx` (Màn hình Chúc mừng / Celebration):
    - Tự động gọi `recordCooking()`.
    - Backend tự động cộng **+50 XP** vào `chefExp` của user và cập nhật cấp bậc (`level`: "Tập sự" $\rightarrow$ "Bếp gia đình" $\rightarrow$ "Đầu bếp tài ba" $\rightarrow$ "Bếp trưởng").
    - Hiển thị popup vinh danh huy hiệu mới và cập nhật tức thì điểm XP trên `ProfileView.tsx`.
  - `CookingHistoryModal.tsx`: Đấu nối API `GET /api/v1/cooking-history` hiển thị danh sách các món người dùng đã hoàn thành trong quá khứ, hỗ trợ xóa lịch sử.

---

### 📌 GIAI ĐOẠN 4: Trí Tuệ Nhân Tạo Thông Minh (Gemini 1.5 Flash Vision & AI Chef Assistant)
> **Trạng thái Backend:** ĐÃ SẴN SÀNG 100% (`/api/v1/ai/scan-ingredients`, `/api/v1/ai/scan-history`, `/api/v1/ai/assistant-chat`)  
> **Mục tiêu Mobile:** Chụp ảnh thực phẩm bàn bếp / tủ lạnh thật $\rightarrow$ Gemini 1.5 Flash Vision nhận diện nguyên liệu và vẽ thẻ ghim pins trực quan trên ảnh; Nút "Lưu tất cả vào tủ lạnh"; Đồng bộ lịch sử quét MongoDB; Trợ lý ảo AI bóng nổi tư vấn thực đơn thông minh theo ngữ cảnh tủ lạnh và khẩu vị.

#### Nhiệm vụ cụ thể:
- [x] **4.1. Hoàn thiện `src/services/aiService.ts` & `src/services/scanHistoryService.ts`**:
  - `aiService.scanIngredients(imageUri, mimeType)`: Gửi multipart `FormData` với key `'image'` (kèm fallback base64 cho Web) lên `POST /api/v1/ai/scan-ingredients`.
  - `aiService.getScanHistory(limit)`: Gọi `GET /api/v1/ai/scan-history` lấy danh sách lịch sử quét từ MongoDB.
  - `aiService.deleteScanHistory(id)`: Gọi `DELETE /api/v1/ai/scan-history/:id` xóa bản ghi lịch sử.
  - `aiService.askChefAssistant(message, conversationHistory)`: Gọi `POST /api/v1/ai/assistant-chat`, trả về `{ replyText, suggestedDishes, quickPrompts }`.
  - Nâng cấp `ScanHistoryService` đồng bộ hai chiều với API Backend (fetch ban đầu từ API, fallback cache AsyncStorage khi offline).
- [x] **4.2. Đấu nối Màn Hình Quét AI (`src/components/features/ScanAIView.tsx`)**:
  - Chụp ảnh từ camera (`ImagePicker.launchCameraAsync`) hoặc chọn ảnh từ thư viện (`ImagePicker.launchImageLibraryAsync`).
  - Kích hoạt hiệu ứng Laser Scanning mượt mà trong thời gian chờ AI xử lý.
  - **Vẽ Ghim Toạ Độ (Visual Bounding Pins)**:
    - Nhận danh sách `pins: [{ text, top, bottom, left, right }]` từ Gemini Vision.
    - Render các thẻ ghim động (badge icon + tên nguyên liệu + % độ tin cậy) định vị tuyệt đối theo % đè lên ảnh gốc.
  - Hiển thị danh sách nguyên liệu nhận diện kèm icon phân loại và thanh độ tin cậy %.
  - Nút **"Lưu tất cả vào tủ lạnh"**: Gọi đồng loạt `POST /api/v1/fridge/items` lưu tất cả nguyên liệu nhận diện vào kho tủ lạnh của user trên MongoDB, hiển thị toast thông báo thành công.
  - Hiển thị thẻ món ăn sáng tạo gợi ý (`suggestedRecipe`), bấm vào mở trực tiếp `recipe-detail.tsx` để xem và nấu ngay.
  - Đấu nối `ScanHistoryModal.tsx` hiển thị dữ liệu lịch sử thật từ Backend, hỗ trợ xem lại thẻ scan cũ và xóa từng mục.
- [x] **4.3. Đấu nối Trợ Lý Ảo Kéo Thả (`src/components/ai/DraggableAIAssistant.tsx`)**:
  - Kết nối chatbox với API `POST /api/v1/ai/assistant-chat`.
  - Backend tự động trích xuất nguyên liệu trong tủ lạnh và khảo sát khẩu vị của user để prompt cho Gemini đóng vai Bếp trưởng tư vấn cá nhân hóa.
  - Hiển thị tin nhắn dạng Markdown thân thiện, danh sách món ăn gợi ý (`suggestedDishes`) có thể click để điều hướng mở công thức ngay, và các thẻ câu hỏi gợi ý nhanh (`quickPrompts`).
- [x] **4.4. Kịch bản kiểm thử E2E Phase 4 (`scripts/testE2EPhase4.mjs`)**:
  - Viết suite test tự động kiểm thử 10 ca: Health check -> Đăng nhập -> Scan ảnh Base64 -> Bounding Pins % -> Phân loại nguyên liệu & confidence -> Gợi ý công thức -> Lưu vào MongoDB Fridge -> AI Chef Assistant kèm Context -> Lấy lịch sử quét MongoDB -> Xóa dọn dẹp data test (100% pass).

---

### 📌 GIAI ĐOẠN 5: Mạng Xã Hội Ẩm Thực & Chat Thời Gian Thực (Community & Realtime Socket.io)
> **Trạng thái Backend:** ĐÃ SẴN SÀNG 100% (`/api/v1/community/posts`, `/api/v1/chat/*`, `chat.gateway.ts`)  
> **Mục tiêu Mobile:** Bảng tin chia sẻ hình ảnh và công thức món ăn; tương tác like/bình luận; chat 1-1 trực tiếp và tham gia 3 phòng chat cộng đồng thời gian thực qua WebSocket.

#### Nhiệm vụ cụ thể:
- [x] **5.1. Thiết lập Kết Nối Socket.io (`src/services/socketService.ts` & `src/contexts/SocketContext.tsx`)**:
  - Cài đặt thư viện: `socket.io-client`.
  - Khởi tạo kết nối Socket.io với server: `io(API_URL, { auth: { token: accessToken }, transports: ["websocket", "polling"] })`.
  - Lắng nghe các sự kiện: `new_message`, `user_typing`, `user_stop_typing`, `online_users`.
  - Cung cấp các phương thức: `joinRoom(conversationId)`, `leaveRoom(conversationId)`, `sendMessage(payload, callback)`, `sendTyping(conversationId, isTyping)`.
- [x] **5.2. Đấu nối Mạng Xã Hội (`src/components/features/CommunityView.tsx` & `PostCard.tsx`)**:
  - Nâng cấp `src/services/communityService.ts` chuyển từ in-memory sang gọi API `GET /api/v1/community/posts` (hỗ trợ phân trang, lọc theo hashtag, tìm kiếm).
  - Thả tim bài viết: Gọi `POST /api/v1/community/posts/:id/like` với Optimistic Update (tăng ngay số like trên UI).
  - Đăng bài mới qua `CreatePostModal.tsx`: Chọn ảnh món ăn, nhập tiêu đề, hashtag và nội dung chia sẻ -> Gửi multipart `FormData` lên `POST /api/v1/community/posts` (Người dùng nhận **+20 XP**).
  - Bình luận qua `CommentsModal.tsx`: Gọi `POST /api/v1/community/posts/:id/comments` (Người dùng nhận **+5 XP**).
- [x] **5.3. Đấu nối Nhắn Tin 1-1 & Phòng Chat Cộng Đồng**:
  - `DirectChatModal.tsx`: Gửi và nhận tin nhắn trực tiếp không độ trễ qua Socket.io.
  - `MessengerConversationsModal.tsx`: Gọi `GET /api/v1/chat/conversations` hiển thị danh sách hội thoại kèm avatar người chat, tin nhắn cuối và đếm số tin chưa đọc.
  - `ChatRoomModal.tsx`: Gọi `GET /api/v1/chat/rooms` hiển thị 3 phòng chat ẩm thực mặc định ("Góc Chia Sẻ Mẹo Nấu Nhanh", "Hội Ăn Chay & Eat Clean", "Hỏi Đáp Cùng Bếp Trưởng") và tham gia chat thời gian thực.
- [x] **5.4. Kịch bản kiểm thử E2E Phase 5 (`scripts/testE2EPhase5.mjs`)**:
  - Viết suite test tự động kiểm thử 12 ca: Health check -> Xác thực 2 tài khoản -> Đăng bài viết cộng đồng -> Nhận +20 XP -> Lấy bảng tin phân trang -> Lọc hashtag #ComGiaDinh -> Like & Unlike tức thì -> Thêm bình luận nhận +5 XP -> Trả lời bình luận lồng nhau -> Lấy 3 phòng chat cộng đồng -> Khởi tạo chat 1-1 -> Kết nối Socket.io Realtime trao đổi tin nhắn & gõ phím -> Xoá dọn dẹp dữ liệu test (100% Pass).

---

### 📌 GIAI ĐOẠN 6: Kế Hoạch Bữa Ăn (`PlannerView`), Giỏ Đi Chợ Thông Minh & Định Vị Siêu Thị GPS
> **Trạng thái:** ✅ **ĐÃ HOÀN THÀNH 100% (VERIFIED & TESTED)**  
> **Cam kết:** 12/12 test E2E passed (100%), TypeScript 0 lỗi. Đã commit và sẵn sàng push toàn bộ lên nhánh `develop`.  
> **Mục tiêu Mobile:** Lập thực đơn 7 ngày trong tuần; tự động tính danh mục đi chợ thông minh (trừ nguyên liệu đã có sẵn trong tủ lạnh); đồng bộ giỏ đi chợ vào tủ lạnh; định vị siêu thị gần nhất qua toạ độ GPS.

#### Nhiệm vụ cụ thể:
- [x] **6.1. Hoàn thiện `src/services/plannerService.ts` & `src/services/storeService.ts`**:
  - `plannerService.getCurrentWeekPlan(weekDate)`: Gọi `GET /api/v1/planner/current-week`.
  - `plannerService.setMealSlot(data)`: Gọi `PUT /api/v1/planner/meals`.
  - `plannerService.removeMealSlot(dayOfWeek, slot, weekDate)`: Gọi `DELETE /api/v1/planner/meals`.
  - `plannerService.getSmartShoppingList(weekDate)`: Gọi `GET /api/v1/planner/shopping-list` với thuật toán tự động:
    $$\text{Danh mục đi chợ} = \sum \text{Nguyên liệu thực đơn 7 ngày} - \text{Nguyên liệu sẵn có trong Tủ lạnh}$$
  - `plannerService.addCartItem(data)`: Gọi `POST /api/v1/planner/shopping-list`.
  - `plannerService.toggleBoughtStatus(id, bought)`: Gọi `PATCH /api/v1/planner/shopping-list/:id/bought`.
  - `plannerService.clearBoughtItems()`: Gọi `DELETE /api/v1/planner/shopping-list/clear-bought`.
  - `plannerService.removeCartItem(id)`: Gọi `DELETE /api/v1/planner/shopping-list/:id`.
  - `plannerService.syncBoughtToFridge()`: Gọi `POST /api/v1/planner/sync-to-fridge` đồng bộ toàn bộ đồ đã mua vào kho Tủ lạnh MongoDB.
- [x] **6.2. Đấu nối Màn Hình Kế Hoạch Bữa Ăn (`src/components/features/PlannerView.tsx`)**:
  - Lịch tuần trực quan 7 ngày (Thứ 2 $\rightarrow$ Chủ Nhật), hiển thị tổng calo so sánh với mục tiêu sức khỏe người dùng (2000 kcal).
  - Phân chia các slot: Bữa Sáng, Bữa Trưa, Bữa Tối, Bữa Phụ.
  - Cho phép chọn món từ gợi ý phổ biến hoặc gõ món tùy chọn, đổi món linh hoạt qua Modal Thêm món.
  - Xóa món ăn khỏi bữa với nút thùng rác và popup xác nhận an toàn.
  - Tab "Giỏ đi chợ": Hiển thị danh mục đi chợ thông minh tự trừ đồ tủ lạnh, ước tính tổng chi phí, checkbox đánh dấu đã mua, xóa món và nút bấm **"Đồng bộ vào tủ lạnh"** 1-click.
  - Thêm nguyên liệu mua sắm thủ công qua modal tiện lợi.
- [x] **6.3. Đấu nối Định Vị Siêu Thị GPS (`src/services/storeService.ts` & `NearbyStoreCard.tsx`)**:
  - Sử dụng thư viện `expo-location` lấy toạ độ GPS (`latitude`, `longitude`) với cơ chế in-memory caching 5 phút & fallback tốc độ cao.
  - Gọi API `GET /api/v1/stores/nearby?lat=...&lng=...&radiusKm=20&limit=5` kết hợp MongoDB 2dsphere index.
  - Hiển thị danh sách các siêu thị lân cận (WinMart+, Co.opmart, Tops Market, Bách Hóa Xanh...) xếp theo khoảng cách tăng dần.
  - Hiển thị thời gian di chuyển ước tính (xe máy và đi bộ) và nút bấm mở ứng dụng Google Maps / Apple Maps chỉ đường trực tiếp (`openDirectionsInMaps`).
- [x] **6.4. Kịch bản kiểm thử E2E Phase 6 (`scripts/testE2EPhase6.mjs`)**:
  - Viết suite test tự động kiểm thử 12 ca: Health check -> Xác thực người dùng -> Lấy thực đơn tuần 7 ngày -> Gán món vào Thứ 2 -> Xóa món khỏi thực đơn -> Gán món tối để sinh nguyên liệu -> Lấy danh mục đi chợ thông minh (tự trừ tủ lạnh) -> Thêm thủ công nguyên liệu giỏ -> Đánh dấu checkbox đã mua -> Đồng bộ 1-click vào tủ lạnh MongoDB -> Dọn dẹp món đã mua -> Quét siêu thị gần nhất qua GPS toạ độ thực tế (100% Pass).


---

### 📌 GIAI ĐOẠN 7: Tối Ưu UX, Tương Thích Thiết Bị & Kiểm Thử Toàn Diện (Final Polish & E2E)
> **Mục tiêu:** Rà soát 100% trải nghiệm người dùng, đảm bảo hiệu năng mượt mà trên cả iOS và Android thật, không có giật lag hay crash.
> **Trạng thái:** ✅ **ĐÃ HOÀN THÀNH CODE & AUTOMATED E2E (26/09/2026)**
> **Xác minh:** Mobile `tsc --noEmit` 0 lỗi; Backend `tsc` 0 lỗi; ESLint 0 lỗi (còn warning kỹ thuật không chặn build); Expo Doctor 21/21; toàn bộ Phase 1–6 E2E đạt 100%.
> **Release gate:** Cần smoke test thủ công lần cuối trên ít nhất 1 thiết bị iOS và 1 thiết bị Android thật trước khi phát hành production.

#### Nhiệm vụ cụ thể:
- [x] **7.1. Tối ưu Giao Diện & Bàn Phím**:
  - Áp dụng `KeyboardAvoidingView` và `TouchableWithoutFeedback` trên toàn bộ các modal nhập liệu để bàn phím không che khuất ô input.
  - Sử dụng `expo-image` hỗ trợ caching ảnh giúp ứng dụng load nhanh và tiết kiệm băng thông.
  - Thêm hiệu ứng rung phản hồi nhẹ (`Haptics`) khi người dùng like, bấm hoàn thành bước nấu hoặc lưu nguyên liệu.
- [x] **7.2. Kiểm Thử Hệ Thống (End-to-End Test Suite)**:
  - Chạy `npx tsc --noEmit` trên cả `smartcook-mobile` và `smartcook-backend` đảm bảo **0 lỗi TypeScript**.
  - Chạy toàn bộ 6 file kịch bản kiểm thử E2E độc lập:
    - `testE2EPhase1.mjs`: Auth, Survey, Profile
    - `testE2EPhase2.mjs`: Recipes, Scaler, Categories, Cloudinary
    - `testE2EPhase3.mjs`: Fridge, Fridge Match, Cooking TTS, +50 XP
    - `testE2EPhase4.mjs`: Gemini Vision, Pins, AI Chef Chatbot
    - `testE2EPhase5.mjs`: Community Social, Socket.io Realtime
    - `testE2EPhase6.mjs`: Planner, Smart Cart, Sync to Fridge, GPS Stores
  - Kiểm thử luồng khép kín (End-to-End Full User Journey):
    $$\text{Đăng ký} \rightarrow \text{Khảo sát} \rightarrow \text{Tủ lạnh} \rightarrow \text{AI Scan} \rightarrow \text{Nấu ăn} \rightarrow \text{Nhận +50 XP} \rightarrow \text{Đăng bài cộng đồng} \rightarrow \text{Chat Realtime} \rightarrow \text{Thực đơn tuần} \rightarrow \text{Siêu thị GPS}$$
  - Runner tổng: `npm run test:e2e:all` thực thi tuần tự 6 phase và dừng ngay khi một phase thất bại.

---

## 4. Chi Tiết Kế Hoạch Triển Khai Tiếp Theo: Giai Đoạn 4 (Phase 4 Action Plan - Gemini 1.5 Flash AI Vision & Trợ Lý Bếp Trưởng AI)

Để tiến hành Giai đoạn 4, danh sách các tệp tin sẽ được tạo và cập nhật bao gồm:

| Hành Động | Đường Dẫn Tệp Tin | Mục Đích Kỹ Thuật |
| :--- | :--- | :--- |
| **[CẬP NHẬT]** | `src/services/aiService.ts` | Gửi ảnh phân tích Gemini Vision (`POST /api/v1/ai/scan-ingredients`), lấy lịch sử scan (`GET /api/v1/ai/scan-history`), xóa lịch sử scan (`DELETE /api/v1/ai/scan-history/:id`), và chat với AI Chef (`POST /api/v1/ai/assistant-chat`). |
| **[CẬP NHẬT]** | `src/services/scanHistoryService.ts` | Kết nối API MongoDB lấy lịch sử quét thực tế, đồng bộ hai chiều và hỗ trợ xóa lịch sử. |
| **[CẬP NHẬT]** | `src/components/features/ScanAIView.tsx` | Kết nối camera/gallery thật, hiệu ứng laser scanning khi phân tích, vẽ thẻ ghim toạ độ thực phẩm (Visual Bounding Pins) đè lên ảnh gốc, nút "Lưu tất cả vào tủ lạnh", gợi ý món ăn nấu ngay `suggestedRecipe`. |
| **[CẬP NHẬT]** | `src/components/features/ScanHistoryModal.tsx` | Hiển thị dữ liệu lịch sử quét thật từ MongoDB, bấm xem lại thẻ scan cũ và xóa từng mục. |
| **[CẬP NHẬT]** | `src/components/ai/DraggableAIAssistant.tsx` | Kết nối chatbox trợ lý nổi với Gemini 1.5 Flash Chef, đưa ngữ cảnh tủ lạnh và khẩu vị cá nhân vào prompt, hiển thị markdown và gợi ý món ăn click mở ngay. |
| **[MỚI]** | `scripts/testE2EPhase4.mjs` | Bộ kịch bản kiểm thử tự động toàn diện cho phân hệ AI Vision & AI Chef Assistant (Mock upload ảnh, Gemini Vision detection, Bounding Pins, Chatbot response, Lịch sử scan). |

---

## 5. Quy Trình Kiểm Thử & Tiêu Chí Nghiệm Thu (Acceptance Criteria)

Mỗi Phase hoàn thành phải đáp ứng đầy đủ các tiêu chí:
1. **TypeScript Clean**: Không có bất kỳ lỗi biên dịch nào khi chạy `npx tsc --noEmit`.
2. **ESLint / React Compiler Clean**: Không vi phạm quy tắc Hook của React Compiler (không gọi state update trong render body).
3. **Data Integrity**: Dữ liệu lưu thành công vào MongoDB Atlas và hiển thị tức thì trên giao diện ứng dụng.
4. **Git Discipline**: Mọi thay đổi đều được commit rõ ràng và push lên nhánh `develop` của remote repository.
