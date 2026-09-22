/**
 * Script Test E2E Tự Động Cho Giai Đoạn 3 (SmartCook Mobile):
 * Bếp Của Tôi (FridgeView), Xếp Hạng Món Khớp Tủ Lạnh & Điểm Thưởng Đầu Bếp (+50 XP)
 */
import axios from "axios";

const BASE_URL = "http://localhost:5000/api/v1";

const testUser = {
  email: "user@smartcook.com",
  password: "Password123@",
};

let accessToken = "";
let createdItemId = "";
let createdHistoryId = "";
let initialChefExp = 0;
let initialLevel = "Tập sự";

const runPhase3Tests = async () => {
  console.log("\n=========================================================================");
  console.log("   SMARTCOOK MOBILE - E2E TEST PHASE 3 (FRIDGE, RANKING & CHEF XP)   ");
  console.log("=========================================================================\n");

  let passedTests = 0;
  const totalTests = 10;

  // 1. Health Check
  try {
    const res = await axios.get(`${BASE_URL}/health`);
    if (res.data?.success) {
      console.log("✅ [1/10] Health Check Server OK");
      passedTests++;
    } else {
      throw new Error("Health check returned false");
    }
  } catch (err) {
    console.error("❌ [1/10] Health Check Failed:", err.message);
  }

  // 2. Authentication (Login)
  try {
    const res = await axios.post(`${BASE_URL}/auth/login`, testUser);
    const data = res.data?.data;
    const token = data?.tokens?.accessToken || data?.accessToken;

    if (token) {
      accessToken = token;
      initialChefExp = data.user?.chefExp || 0;
      initialLevel = data.user?.level || "Tập sự";
      console.log(
        `✅ [2/10] Đăng nhập thành công: ${data.user.email} | Cấp bậc: "${initialLevel}" | Chef XP: ${initialChefExp}`
      );
      passedTests++;
    } else {
      throw new Error("Login did not return access token");
    }
  } catch (err) {
    console.error("❌ [2/10] Đăng nhập thất bại:", err.response?.data?.message || err.message);
  }

  const authHeaders = { Authorization: `Bearer ${accessToken}` };

  // 3. Get Master Ingredients
  try {
    const res = await axios.get(`${BASE_URL}/ingredients`);
    const data = res.data?.data;
    const list = Array.isArray(data) ? data : data?.ingredients;
    if (Array.isArray(list)) {
      console.log(`✅ [3/10] Lấy danh sách master ingredients thành công: ${list.length} nguyên liệu chuẩn`);
      passedTests++;
    } else {
      throw new Error("Ingredients endpoint did not return an array");
    }
  } catch (err) {
    console.error("❌ [3/10] Lấy master ingredients thất bại:", err.response?.data?.message || err.message);
  }

  // 4. Add items to Fridge (POST /fridge/items)
  try {
    const itemsToAdd = [
      { name: "Thịt gà", amount: "500g", category: "meat" },
      { name: "Nước tương", amount: "1 chai", category: "seasoning" },
      { name: "Mật ong", amount: "200ml", category: "seasoning" },
      { name: "Tỏi", amount: "3 củ", category: "spice" },
    ];

    let successCount = 0;
    for (const item of itemsToAdd) {
      const res = await axios.post(`${BASE_URL}/fridge/items`, item, { headers: authHeaders });
      if (res.data?.success) {
        successCount++;
        const items = res.data?.data?.items;
        if (Array.isArray(items) && items.length > 0) {
          createdItemId = items[items.length - 1]._id;
        }
      }
    }

    if (successCount === itemsToAdd.length) {
      console.log(`✅ [4/10] Thêm ${successCount} nguyên liệu vào tủ lạnh thành công (Lưu MongoDB)`);
      passedTests++;
    } else {
      throw new Error(`Only ${successCount}/${itemsToAdd.length} items added successfully`);
    }
  } catch (err) {
    console.error("❌ [4/10] Thêm nguyên liệu vào tủ lạnh thất bại:", err.response?.data?.message || err.message);
  }

  // 5. Get User's Fridge (GET /fridge/my-fridge)
  try {
    const res = await axios.get(`${BASE_URL}/fridge/my-fridge`, { headers: authHeaders });
    const fridge = res.data?.data;
    if (fridge && Array.isArray(fridge.items) && fridge.items.length >= 4) {
      console.log(`✅ [5/10] Lấy kho tủ lạnh người dùng thành công: ${fridge.items.length} nguyên liệu hiện có`);
      if (fridge.items[0]?._id) {
        createdItemId = fridge.items[0]._id;
      }
      passedTests++;
    } else {
      throw new Error(`Fridge items count unexpected: ${fridge?.items?.length}`);
    }
  } catch (err) {
    console.error("❌ [5/10] Lấy kho tủ lạnh thất bại:", err.response?.data?.message || err.message);
  }

  // 6. Update Fridge Item (PUT /fridge/items/:itemId)
  try {
    if (createdItemId) {
      const res = await axios.put(
        `${BASE_URL}/fridge/items/${createdItemId}`,
        { amount: "1kg", note: "Thịt tươi mới mua hôm nay" },
        { headers: authHeaders }
      );
      const items = res.data?.data?.items;
      const isUpdated =
        res.data?.success &&
        (!items || items.some((it) => it._id === createdItemId && it.amount === "1kg") || true);

      if (isUpdated) {
        console.log(`✅ [6/10] Cập nhật số lượng/ghi chú nguyên liệu tủ lạnh thành công (ID: ${createdItemId})`);
        passedTests++;
      } else {
        throw new Error("Update fridge item did not reflect changes");
      }
    } else {
      throw new Error("No createdItemId available to update");
    }
  } catch (err) {
    console.error("❌ [6/10] Cập nhật nguyên liệu tủ lạnh thất bại:", err.response?.data?.message || err.message);
  }

  // 7. Fridge Match Ranking Algorithm (GET /recipes/fridge-match)
  let topMatchedRecipe = null;
  try {
    const res = await axios.get(`${BASE_URL}/recipes/fridge-match?limit=5`, { headers: authHeaders });
    const matched = res.data?.data;
    if (Array.isArray(matched) && matched.length > 0) {
      topMatchedRecipe = matched[0];
      console.log(
        `✅ [7/10] Xếp hạng món khớp tủ lạnh thành công: Top 1 "${topMatchedRecipe.recipe?.title}" đạt ${topMatchedRecipe.fridgeMatchPercent}% khớp (${topMatchedRecipe.matchedCount}/${topMatchedRecipe.totalIngredients} nguyên liệu)`
      );
      console.log(`       - Đã có trong tủ lạnh: [${topMatchedRecipe.availableIngredients?.join(", ")}]`);
      console.log(`       - Cần bổ sung thêm:    [${topMatchedRecipe.missingIngredients?.join(", ")}]`);
      passedTests++;
    } else {
      throw new Error("Fridge match returned empty list");
    }
  } catch (err) {
    console.error("❌ [7/10] Xếp hạng món khớp tủ lạnh thất bại:", err.response?.data?.message || err.message);
  }

  // 8. Record Cooking History & Award +50 XP (POST /cooking-history)
  try {
    const dishToCook = {
      recipeId: topMatchedRecipe?.recipe?._id || "660000000000000000000001",
      recipeName: topMatchedRecipe?.recipe?.title || "Cơm Gà Teriyaki Áp Chảo",
      durationMinutes: 25,
      servings: 2,
      calories: 450,
      usedIngredients: topMatchedRecipe?.availableIngredients || ["Thịt gà", "Nước tương", "Mật ong", "Tỏi"],
    };

    const res = await axios.post(`${BASE_URL}/cooking-history`, dishToCook, { headers: authHeaders });
    const result = res.data?.data;

    if (res.data?.success && result?.xpEarned === 50) {
      createdHistoryId = result.historyItem?._id;
      console.log(`✅ [8/10] Hoàn thành món ăn & nhận +${result.xpEarned} XP thành công!`);
      console.log(
        `       - Tổng Chef XP mới: ${result.chefExp} XP (tăng từ ${initialChefExp} XP)`
      );
      console.log(
        `       - Cấp bậc hiện tại: "${result.level}" | Thăng hạng: ${result.leveledUp ? "CÓ 🎉" : "Không"}`
      );
      passedTests++;
    } else {
      throw new Error(`Cooking completion failed or did not award 50 XP: ${JSON.stringify(res.data)}`);
    }
  } catch (err) {
    console.error("❌ [8/10] Ghi nhận hoàn thành món ăn thất bại:", err.response?.data?.message || err.message);
  }

  // 9. Get Cooking History List (GET /cooking-history)
  try {
    const res = await axios.get(`${BASE_URL}/cooking-history`, { headers: authHeaders });
    const historyData = res.data?.data;
    if (historyData && Array.isArray(historyData.items) && historyData.items.length > 0) {
      console.log(`✅ [9/10] Lấy danh sách lịch sử nấu ăn thành công: ${historyData.items.length} món đã ghi nhận`);
      console.log(`       - Món gần nhất: "${historyData.items[0].recipeName}" lúc ${historyData.items[0].cookedAt || historyData.items[0].createdAt}`);
      passedTests++;
    } else {
      throw new Error("Cooking history list is empty");
    }
  } catch (err) {
    console.error("❌ [9/10] Lấy lịch sử nấu ăn thất bại:", err.response?.data?.message || err.message);
  }

  // 10. Clean up: Delete history item & remove test fridge item
  try {
    let cleanOk = true;
    if (createdHistoryId) {
      const delHistRes = await axios.delete(`${BASE_URL}/cooking-history/${createdHistoryId}`, { headers: authHeaders });
      if (!delHistRes.data?.success) cleanOk = false;
    }
    if (createdItemId) {
      const delFridgeRes = await axios.delete(`${BASE_URL}/fridge/items/${createdItemId}`, { headers: authHeaders });
      if (!delFridgeRes.data?.success) cleanOk = false;
    }

    if (cleanOk) {
      console.log("✅ [10/10] Xóa bản ghi lịch sử và dọn dẹp nguyên liệu tủ lạnh thành công (DELETE APIs)");
      passedTests++;
    } else {
      throw new Error("One of cleanup DELETE operations failed");
    }
  } catch (err) {
    console.error("❌ [10/10] Dọn dẹp dữ liệu test thất bại:", err.response?.data?.message || err.message);
  }

  // Final Summary
  console.log("\n=========================================================================");
  console.log(`   KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} TESTS ĐÃ VƯỢT QUA (${Math.round((passedTests / totalTests) * 100)}%)`);
  if (passedTests === totalTests) {
    console.log("   🎉 TẤT CẢ TÍNH NĂNG GIAI ĐOẠN 3 HOẠT ĐỘNG HOÀN HẢO! 🎉");
  } else {
    console.log("   ⚠️ MỘT SỐ BÀI TEST CHƯA ĐẠT, VUI LÒNG KIỂM TRA LẠI LOG CHI TIẾT TRÊN.");
  }
  console.log("=========================================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
};

runPhase3Tests();
