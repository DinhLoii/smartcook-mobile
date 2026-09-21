import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";

const API_BASE = "http://localhost:5000/api/v1";

async function runTests() {
  console.log("=================================================");
  console.log("🚀 BẮT ĐẦU KIỂM THỬ TÍCH HỢP PHASE 2 MOBILE <-> BACKEND");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Kiểm tra API Categories
    console.log("1. Kiểm tra Endpoint Danh Mục (/categories):");
    const catRes = await axios.get(`${API_BASE}/categories`);
    assert(catRes.status === 200, "Categories API trả về status 200");
    assert(Array.isArray(catRes.data.data), "Dữ liệu danh mục là một mảng");
    assert(catRes.data.data.length > 0, `Đã tải được ${catRes.data.data.length} danh mục`);
    const hasFamily = catRes.data.data.some((c) => c.code === "family");
    assert(hasFamily, "Có danh mục 'family' (Gia đình)");

    // 2. Kiểm tra API Recipes Feed (Toàn bộ)
    console.log("\n2. Kiểm tra Endpoint Công Thức (/recipes):");
    const recipesRes = await axios.get(`${API_BASE}/recipes?page=1&limit=6`);
    assert(recipesRes.status === 200, "Recipes API trả về status 200");
    assert(recipesRes.data.data.recipes.length > 0, `Tải được ${recipesRes.data.data.recipes.length} công thức ở trang 1`);
    assert(recipesRes.data.data.total > 0, `Tổng số công thức trong hệ thống: ${recipesRes.data.data.total}`);
    assert(recipesRes.data.data.totalPages >= 1, `Tổng số trang: ${recipesRes.data.data.totalPages}`);

    const firstRecipe = recipesRes.data.data.recipes[0];
    const testRecipeId = firstRecipe._id || firstRecipe.id;

    // 3. Kiểm tra Filter theo Category
    console.log("\n3. Kiểm tra Bộ Lọc Danh Mục (?category=...):");
    const quickRes = await axios.get(`${API_BASE}/recipes?category=quick`);
    assert(quickRes.status === 200, "Filter category=quick trả về status 200");
    assert(Array.isArray(quickRes.data.data.recipes), "Kết quả lọc danh mục là mảng");

    // 4. Kiểm tra Tìm Kiếm Từ Khóa (?search=...)
    console.log("\n4. Kiểm tra Tìm Kiếm (?search=Gà):");
    const searchRes = await axios.get(`${API_BASE}/recipes?search=Gà`);
    assert(searchRes.status === 200, "Search query trả về status 200");
    assert(searchRes.data.data.recipes.length > 0, `Tìm thấy ${searchRes.data.data.recipes.length} món chứa từ khóa 'Gà'`);

    // 5. Kiểm tra Filter theo Thời Gian Nấu (?maxMinutes=30)
    console.log("\n5. Kiểm tra Bộ Lọc Thời Gian (?maxMinutes=30):");
    const timeRes = await axios.get(`${API_BASE}/recipes?maxMinutes=30`);
    assert(timeRes.status === 200, "Filter maxMinutes trả về status 200");
    const allWithin30m = timeRes.data.data.recipes.every((r) => r.minutes <= 30);
    assert(allWithin30m, "Tất cả món lọc đều có thời gian nấu <= 30 phút");

    // 6. Kiểm tra Chi Tiết Món Ăn (/recipes/:id)
    console.log(`\n6. Kiểm tra Chi Tiết Món Ăn (/recipes/${testRecipeId}):`);
    const detailRes = await axios.get(`${API_BASE}/recipes/${testRecipeId}`);
    assert(detailRes.status === 200, "Chi tiết món ăn trả về status 200");
    assert(!!detailRes.data.data.title, `Tên món: "${detailRes.data.data.title}"`);
    assert(Array.isArray(detailRes.data.data.ingredients), "Có danh sách nguyên liệu");
    assert(detailRes.data.data.ingredients.length > 0, `Có ${detailRes.data.data.ingredients.length} nguyên liệu`);
    assert(Array.isArray(detailRes.data.data.steps), "Có danh sách các bước nấu");
    assert(detailRes.data.data.steps.length > 0, `Có ${detailRes.data.data.steps.length} bước nấu`);
    assert(!!detailRes.data.data.nutrition, "Có thông tin dinh dưỡng");

    // 7. Đăng nhập để lấy Access Token
    console.log("\n7. Đăng Nhập & Lấy JWT Token:");
    const testEmail = `chef.test.${Date.now()}@smartcook.vn`;
    const regRes = await axios.post(`${API_BASE}/auth/register`, {
      email: testEmail,
      password: "Password123@",
      firstName: "Alex",
      lastName: "Cooker",
    });
    const accessToken = regRes.data.data.tokens.accessToken;
    assert(!!accessToken, "Đăng ký và nhận Access Token thành công");

    // 8. Kiểm tra Toggle Favorite
    console.log(`\n8. Kiểm tra Yêu Thích Món Ăn (/recipes/${testRecipeId}/favorite):`);
    const favRes1 = await axios.post(
      `${API_BASE}/recipes/${testRecipeId}/favorite`,
      {},
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    assert(favRes1.status === 200, "Yêu thích món ăn thành công");
    assert(favRes1.data.data.isFavorite === true, "Trạng thái isFavorite: true");

    const favRes2 = await axios.post(
      `${API_BASE}/recipes/${testRecipeId}/favorite`,
      {},
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    assert(favRes2.data.data.isFavorite === false, "Bỏ yêu thích món ăn thành công: false");

    // 9. Kiểm tra Tạo Công Thức Mới (/recipes)
    console.log("\n9. Kiểm tra Đăng Tải Công Thức Mới (/recipes):");
    const formData = new FormData();
    formData.append("title", "Canh Chua Cá Hồi Test Mobile");
    formData.append("categoryCode", "vietnamese");
    formData.append("difficulty", "Dễ");
    formData.append("minutes", "25");
    formData.append("calories", "350");
    formData.append("servings", "3 phần");
    formData.append("servingsCount", "3");
    formData.append("description", "Món canh chua thơm ngon chuẩn vị Nam Bộ.");
    formData.append("badge", "✨ Mới");
    formData.append("sub", "Đậm đà • Chuẩn vị");
    formData.append("tags", JSON.stringify(["Món Việt", "Canh", "Cá Hồi"]));
    formData.append(
      "ingredients",
      JSON.stringify([
        { name: "Cá hồi phi lê", amount: "300g" },
        { name: "Cà chua bi", amount: "2 quả" },
        { name: "Dứa (thơm)", amount: "1/4 quả" },
      ])
    );
    formData.append(
      "steps",
      JSON.stringify([
        { stepNumber: 1, title: "Sơ chế", description: "Cắt cá hồi thành miếng vừa ăn." },
        { stepNumber: 2, title: "Nấu nước dùng", description: "Đun sôi nước với dứa và cà chua." },
        { stepNumber: 3, title: "Hoàn tất", description: "Cho cá hồi vào đun chín tới và nêm nếm." },
      ])
    );
    formData.append(
      "nutrition",
      JSON.stringify({
        calories: 350,
        protein: "32g",
        carbs: "18g",
        fat: "14g",
        fiber: "4g",
        advice: "Giàu Omega-3 và vitamin C.",
      })
    );

    // Dummy valid JPEG buffer
    const dummyImageBuffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
      0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
      0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
      0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
      0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
      0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
      0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
      0x00, 0xbf, 0x00, 0xff, 0xd9,
    ]);
    formData.append("image", dummyImageBuffer, {
      filename: "recipe_test.jpg",
      contentType: "image/jpeg",
    });

    const createRes = await axios.post(`${API_BASE}/recipes`, formData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...formData.getHeaders(),
      },
    });

    assert(createRes.status === 201, "Tạo công thức mới thành công với status 201");
    assert(createRes.data.data.title === "Canh Chua Cá Hồi Test Mobile", "Tên món khớp chính xác");
    assert(createRes.data.data.ingredients.length === 3, "Lưu đủ 3 nguyên liệu");
    assert(createRes.data.data.steps.length === 3, "Lưu đủ 3 bước nấu");

  } catch (err) {
    console.error("Lỗi trong quá trình kiểm thử:", err.response?.data || err.message);
    failed++;
  }

  console.log("\n=================================================");
  console.log(`KẾT QUẢ KIỂM THỬ: ${passed} PASSED | ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
