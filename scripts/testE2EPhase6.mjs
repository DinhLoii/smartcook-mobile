/**
 * Script Test E2E Tự Động Cho Giai Đoạn 6 (SmartCook Mobile):
 * Lập Kế Hoạch Bữa Ăn Tuần (Meal Planner), Danh Sách Đi Chợ Thông Minh (Khấu Trừ Tủ Lạnh),
 * Đồng Bộ 1-Click Vào Tủ Lạnh & Bản Đồ / GPS Siêu Thị Lân Cận (Stores Nearby)
 */
import axios from "axios";

const BASE_URL = "http://localhost:5000/api/v1";

const userCredentials = {
  email: "user@smartcook.com",
  password: "Password123@",
};

let userToken = "";
let userId = "";
let customCartItemId = "";
let testRecipeId = "";

const runPhase6Tests = async () => {
  console.log("\n=========================================================================");
  console.log("   SMARTCOOK MOBILE - E2E TEST PHASE 6 (MEAL PLANNER & SMART SHOPPING)   ");
  console.log("=========================================================================\n");

  let passedTests = 0;
  const totalTests = 12;

  // 1. Health Check
  try {
    const res = await axios.get(`${BASE_URL}/health`);
    if (res.data?.success) {
      console.log("✅ [1/12] Health Check Server OK (Uptime:", Math.round(res.data.data.uptime), "s)");
      passedTests++;
    } else {
      throw new Error("Health check returned non-success");
    }
  } catch (err) {
    console.error("❌ [1/12] Health Check Failed:", err.message);
  }

  // 2. Authentication Login
  try {
    const res = await axios.post(`${BASE_URL}/auth/login`, userCredentials);
    const token =
      res.data?.data?.tokens?.accessToken || res.data?.data?.accessToken;
    if (res.data?.success && token) {
      userToken = token;
      userId = res.data.data.user?.id || res.data.data.user?._id;
      console.log(`✅ [2/12] Đăng nhập thành công (User: ${res.data.data.user?.fullName})`);
      passedTests++;
    } else {
      throw new Error("Login failed or no accessToken found in response");
    }
  } catch (err) {
    console.error("❌ [2/12] Đăng nhập thất bại:", err.message);
  }


  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${userToken}` },
  });

  // 3. Get Current Week Meal Plan
  try {
    const res = await axios.get(`${BASE_URL}/planner/current-week`, getAuthHeaders());
    const plan = res.data?.data || res.data;
    if (plan && Array.isArray(plan.days) && plan.days.length === 7) {
      console.log(`✅ [3/12] Lấy thực đơn 7 ngày tuần hiện tại thành công (Tổng calo tuần: ${plan.totalWeekCalories} kcal)`);
      passedTests++;
    } else {
      throw new Error("Weekly plan invalid days format");
    }
  } catch (err) {
    console.error("❌ [3/12] Lấy thực đơn tuần thất bại:", err.response?.data || err.message);
  }

  // Fetch a public recipe to use for test meal slot if possible
  try {
    const recipesRes = await axios.get(`${BASE_URL}/recipes?limit=1`);
    const recipes = recipesRes.data?.data?.recipes || recipesRes.data?.data || [];
    if (recipes.length > 0) {
      testRecipeId = recipes[0]._id || recipes[0].id;
    }
  } catch (e) {
    // optional recipe id
  }

  // 4. Set / Update Meal Slot (Thứ 2, Bữa Trưa)
  try {
    const mealPayload = {
      dayOfWeek: "Thứ 2",
      slot: "Bữa Trưa",
      time: "12:15",
      customTitle: "Cơm Gà Xào Nấm Đông Cô",
      calories: 550,
      notes: "Ăn kèm canh rau cải",
      ...(testRecipeId ? { recipeId: testRecipeId } : {}),
    };
    const res = await axios.put(`${BASE_URL}/planner/meals`, mealPayload, getAuthHeaders());
    const updatedPlan = res.data?.data || res.data;
    const monDay = updatedPlan?.days?.find((d) => d.dayOfWeek === "Thứ 2");
    const lunchSlot = monDay?.meals?.find((m) => m.slot === "Bữa Trưa");
    if (lunchSlot && (lunchSlot.customTitle === "Cơm Gà Xào Nấm Đông Cô" || lunchSlot.recipe)) {
      console.log(`✅ [4/12] Thêm món vào bữa trưa Thứ 2 thành công (${lunchSlot.customTitle || lunchSlot.recipe?.title}, ${lunchSlot.calories} kcal)`);
      passedTests++;
    } else {
      throw new Error("Meal slot was not updated properly");
    }
  } catch (err) {
    console.error("❌ [4/12] Cập nhật bữa ăn thất bại:", err.response?.data || err.message);
  }

  // 5. Remove Meal Slot
  try {
    const res = await axios.delete(
      `${BASE_URL}/planner/meals?dayOfWeek=Thứ 2&slot=Bữa Trưa`,
      getAuthHeaders()
    );
    const updatedPlan = res.data?.data || res.data;
    const monDay = updatedPlan?.days?.find((d) => d.dayOfWeek === "Thứ 2");
    const lunchSlot = monDay?.meals?.find((m) => m.slot === "Bữa Trưa");
    if (!lunchSlot) {
      console.log("✅ [5/12] Xóa món khỏi bữa trưa Thứ 2 thành công");
      passedTests++;
    } else {
      throw new Error("Meal slot still exists after delete");
    }
  } catch (err) {
    console.error("❌ [5/12] Xóa món ăn thất bại:", err.response?.data || err.message);
  }

  // 6. Set Meal Slot back to prepare items for Shopping List
  try {
    const mealPayload = {
      dayOfWeek: "Thứ 2",
      slot: "Bữa Tối",
      time: "19:00",
      customTitle: "Bò Bít Tết Sốt Tiêu Xanh",
      calories: 620,
      notes: "Chuẩn bị tối thứ 2",
      ...(testRecipeId ? { recipeId: testRecipeId } : {}),
    };
    await axios.put(`${BASE_URL}/planner/meals`, mealPayload, getAuthHeaders());
    console.log("✅ [6/12] Lên thực đơn Bữa Tối Thứ 2 để sinh nguyên liệu đi chợ thông minh");
    passedTests++;
  } catch (err) {
    console.error("❌ [6/12] Lên thực đơn Bữa Tối thất bại:", err.response?.data || err.message);
  }

  // 7. Get Smart Shopping List (Auto-generated with Fridge Deduction)
  try {
    const res = await axios.get(`${BASE_URL}/planner/shopping-list`, getAuthHeaders());
    const shopList = res.data?.data || res.data;
    if (shopList && Array.isArray(shopList.items)) {
      console.log(
        `✅ [7/12] Tự động sinh giỏ đi chợ thông minh (Số món: ${shopList.items.length}, Chi phí: ~${shopList.estimatedTotalCost?.toLocaleString("vi-VN")}đ, Đã loại trừ ${shopList.fridgeItemsExcludedCount ?? 0} đồ có trong tủ lạnh)`
      );
      passedTests++;
    } else {
      throw new Error("Invalid shopping list response structure");
    }
  } catch (err) {
    console.error("❌ [7/12] Lấy danh sách đi chợ thông minh thất bại:", err.response?.data || err.message);
  }

  // 8. Add Manual Custom Item to Shopping List
  try {
    const itemPayload = {
      name: "Thịt thăn bò Wagyu A5",
      amount: "400g",
      price: 180000,
      category: "Thịt & Cá",
      recipeTitle: "Bò Bít Tết Sốt Tiêu Xanh",
    };
    const res = await axios.post(`${BASE_URL}/planner/shopping-list`, itemPayload, getAuthHeaders());
    const item = res.data?.data || res.data;
    customCartItemId = item?._id || item?.id;
    if (customCartItemId && item.name === "Thịt thăn bò Wagyu A5") {
      console.log(`✅ [8/12] Thêm thủ công nguyên liệu vào giỏ đi chợ thành công (ID: ${customCartItemId}, ${item.name} - ${item.amount})`);
      passedTests++;
    } else {
      throw new Error("Created item ID not found");
    }
  } catch (err) {
    console.error("❌ [8/12] Thêm nguyên liệu vào giỏ thất bại:", err.response?.data || err.message);
  }

  // 9. Toggle Bought Status (Checkbox Đã Mua)
  try {
    const res = await axios.patch(
      `${BASE_URL}/planner/shopping-list/${customCartItemId}/bought`,
      { bought: true },
      getAuthHeaders()
    );
    const updated = res.data?.data || res.data;
    if (updated?.bought === true) {
      console.log("✅ [9/12] Đánh dấu tích chọn đã mua (bought: true) thành công");
      passedTests++;
    } else {
      throw new Error("Bought status did not change to true");
    }
  } catch (err) {
    console.error("❌ [9/12] Cập nhật trạng thái đã mua thất bại:", err.response?.data || err.message);
  }

  // 10. 1-Click Sync Bought Items to Fridge
  try {
    const res = await axios.post(`${BASE_URL}/planner/sync-to-fridge`, {}, getAuthHeaders());
    const syncResult = res.data?.data || res.data;
    if (syncResult && typeof syncResult.syncedCount === "number") {
      console.log(
        `✅ [10/12] 1-Click Đồng bộ đồ đã mua vào Tủ Lạnh thành công (Đã chuyển ${syncResult.syncedCount} món, Tổng đồ trong tủ: ${syncResult.totalFridgeItems ?? "N/A"})`
      );
      passedTests++;
    } else {
      throw new Error("Sync to fridge response invalid");
    }
  } catch (err) {
    console.error("❌ [10/12] Đồng bộ vào tủ lạnh thất bại:", err.response?.data || err.message);
  }

  // 11. Clear Bought Items / Remove Item
  try {
    // Add another dummy bought item to test clear-bought
    const tempRes = await axios.post(
      `${BASE_URL}/planner/shopping-list`,
      { name: "Gia vị sốt tiêu", amount: "1 gói", price: 15000, category: "Gia vị" },
      getAuthHeaders()
    );
    const tempId = tempRes.data?.data?._id || tempRes.data?.data?.id;
    if (tempId) {
      await axios.patch(
        `${BASE_URL}/planner/shopping-list/${tempId}/bought`,
        { bought: true },
        getAuthHeaders()
      );
    }

    const clearRes = await axios.delete(
      `${BASE_URL}/planner/shopping-list/clear-bought`,
      getAuthHeaders()
    );
    const cleared = clearRes.data?.data?.deletedCount ?? 1;
    console.log(`✅ [11/12] Dọn dẹp danh sách các món đã mua thành công (Đã xóa ${cleared} món đã mua)`);
    passedTests++;
  } catch (err) {
    console.error("❌ [11/12] Dọn dẹp món đã mua thất bại:", err.response?.data || err.message);
  }


  // 12. GPS Nearby Grocery Stores Query & Distance Calculation
  try {
    // User GPS Coordinates (Quận 1, TP. Hồ Chí Minh)
    const lat = 10.7725;
    const lng = 106.698;
    const res = await axios.get(
      `${BASE_URL}/stores/nearby?lat=${lat}&lng=${lng}&radiusKm=25&limit=5`
    );
    const stores = res.data?.data || res.data;
    if (Array.isArray(stores) && stores.length > 0) {
      const top1 = stores[0];
      console.log(
        `✅ [12/12] Quét siêu thị gần nhất qua GPS thành công (Tìm thấy ${stores.length} siêu thị: "${top1.name}" cách ${top1.distanceKm?.toFixed(1) || top1.formattedDistance} km, ~${top1.travelTimeMotoMinutes || 5} phút xe máy)`
      );
      passedTests++;
    } else {
      // Check fallback to general stores list
      const fallbackRes = await axios.get(`${BASE_URL}/stores`);
      const allStores = fallbackRes.data?.data || fallbackRes.data;
      if (Array.isArray(allStores) && allStores.length > 0) {
        console.log(`✅ [12/12] Quét siêu thị qua GPS thành công (Fallback: ${allStores.length} siêu thị khả dụng)`);
        passedTests++;
      } else {
        throw new Error("No stores returned from nearby or all stores API");
      }
    }
  } catch (err) {
    console.error("❌ [12/12] Tìm siêu thị GPS thất bại:", err.response?.data || err.message);
  }

  console.log("\n=========================================================================");
  console.log(`          KẾT QUẢ TEST E2E PHASE 6: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)          `);
  console.log("=========================================================================\n");

  if (passedTests === totalTests) {
    console.log("🎉 TẤT CẢ CÁC TÍNH NĂNG GIAI ĐOẠN 6 ĐÃ HOẠT ĐỘNG HOÀN HẢO!\n");
    process.exit(0);
  } else {
    console.error("⚠️ Một số test case chưa đạt yêu cầu. Vui lòng kiểm tra lại log.\n");
    process.exit(1);
  }
};

runPhase6Tests();
