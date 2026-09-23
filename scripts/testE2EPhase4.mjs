/**
 * Script Test E2E Tự Động Cho Giai Đoạn 4 (SmartCook Mobile):
 * Gemini 1.5 Flash Vision, Bounding Pins, Chuyển Vào Tủ Lạnh & Trợ Lý Bếp Trưởng AI
 */
import axios from "axios";

const BASE_URL = "http://localhost:5000/api/v1";

const testUser = {
  email: "user@smartcook.com",
  password: "Password123@",
};

// 1x1 Sample JPEG image in base64 format for vision testing
const SAMPLE_IMAGE_BASE64 =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

let accessToken = "";
let createdScanId = "";
let addedFridgeItemId = "";
let detectedIngredientNames = [];

const runPhase4Tests = async () => {
  console.log("\n=========================================================================");
  console.log("   SMARTCOOK MOBILE - E2E TEST PHASE 4 (GEMINI VISION & AI CHEF)   ");
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
      console.log(
        `✅ [2/10] Đăng nhập thành công: ${data.user?.email || testUser.email} (Token: ${token.substring(0, 15)}...)`
      );
      passedTests++;
    } else {
      throw new Error("Login did not return access token");
    }
  } catch (err) {
    console.error("❌ [2/10] Đăng nhập thất bại:", err.response?.data?.message || err.message);
  }

  const authHeaders = { Authorization: `Bearer ${accessToken}` };

  // 3. Scan Ingredients via Base64 Image (POST /api/v1/ai/scan-ingredients)
  let scanResult = null;
  try {
    console.log("⏳ [3/10] Đang gửi ảnh thực phẩm lên Gemini 1.5 Flash Vision phân tích...");
    const res = await axios.post(
      `${BASE_URL}/ai/scan-ingredients`,
      {
        imageBase64: SAMPLE_IMAGE_BASE64,
        mimeType: "image/jpeg",
      },
      { headers: authHeaders }
    );

    if (res.data?.success && res.data?.data) {
      scanResult = res.data.data;
      createdScanId = scanResult.id || scanResult._id;
      console.log(`✅ [3/10] Quét ảnh bằng AI Vision thành công: "${scanResult.title}" (Độ tin cậy: ${scanResult.accuracy}%)`);
      passedTests++;
    } else {
      throw new Error("Scan response was not successful or missing data");
    }
  } catch (err) {
    console.error("❌ [3/10] Quét ảnh AI Vision thất bại:", err.response?.data?.message || err.message);
  }

  // 4. Validate Bounding Pins (Tọa độ ghim trên ảnh thực phẩm)
  try {
    const pins = scanResult?.pins;
    if (Array.isArray(pins) && pins.length > 0) {
      const firstPin = pins[0];
      const hasCoord =
        firstPin.top !== undefined ||
        firstPin.bottom !== undefined ||
        firstPin.left !== undefined ||
        firstPin.right !== undefined;

      if (firstPin.text && hasCoord) {
        console.log(`✅ [4/10] Nhận diện Bounding Pins thành công: Có ${pins.length} ghim tọa độ`);
        pins.forEach((p, idx) => {
          console.log(`       - Pin #${idx + 1}: "${p.text}" [Top: ${p.top ?? "N/A"}% | Left: ${p.left ?? "N/A"}%]`);
        });
        passedTests++;
      } else {
        throw new Error("First pin is missing text or coordinate bounds");
      }
    } else {
      throw new Error("Scan result pins array is missing or empty");
    }
  } catch (err) {
    console.error("❌ [4/10] Kiểm tra Bounding Pins thất bại:", err.message);
  }

  // 5. Validate Detected Ingredients & Confidences
  try {
    const ingredients = scanResult?.ingredients;
    if (Array.isArray(ingredients) && ingredients.length > 0) {
      detectedIngredientNames = ingredients.map((i) => i.name);
      console.log(`✅ [5/10] Phân loại nguyên liệu thành công: Phát hiện ${ingredients.length} nguyên liệu`);
      ingredients.forEach((ing) => {
        console.log(`       - ${ing.name} (Độ tin cậy: ${ing.confidence}, icon: ${ing.icon || "food"})`);
      });
      passedTests++;
    } else {
      throw new Error("Ingredients array is empty in scan response");
    }
  } catch (err) {
    console.error("❌ [5/10] Kiểm tra danh sách nguyên liệu thất bại:", err.message);
  }

  // 6. Validate Suggested Recipe from Scanned Food
  try {
    const recipe = scanResult?.suggestedRecipe;
    if (recipe && recipe.title && recipe.calories !== undefined) {
      console.log(`✅ [6/10] Gợi ý công thức nấu tối ưu thành công:`);
      console.log(`       - Món: "${recipe.title}" (${recipe.durationMinutes || 20} phút, ${recipe.calories} kcal)`);
      console.log(`       - Khớp: ${recipe.matchPercent || 95}% | Mô tả: ${recipe.desc || recipe.description || "N/A"}`);
      passedTests++;
    } else {
      throw new Error("Suggested recipe missing required properties");
    }
  } catch (err) {
    console.error("❌ [6/10] Kiểm tra gợi ý công thức thất bại:", err.message);
  }

  // 7. Save Scanned Ingredients into User's MongoDB Fridge (POST /api/v1/fridge/items)
  try {
    const ingredientNameToAdd = detectedIngredientNames[0] || "Cà chua bi";
    const res = await axios.post(
      `${BASE_URL}/fridge/items`,
      {
        name: ingredientNameToAdd,
        amount: "300g",
        category: "veggies",
        note: "Thực phẩm được thêm tự động từ tính năng Quét AI",
      },
      { headers: authHeaders }
    );

    const fridgeData = res.data?.data;
    if (res.data?.success && fridgeData?.items) {
      const addedItem = fridgeData.items.find((i) => i.name.toLowerCase().includes(ingredientNameToAdd.toLowerCase()));
      if (addedItem) {
        addedFridgeItemId = addedItem._id;
      }
      console.log(`✅ [7/10] Tính năng 'Lưu vào Tủ Lạnh' hoạt động chính xác: Đã lưu "${ingredientNameToAdd}" vào MongoDB Fridge`);
      passedTests++;
    } else {
      throw new Error("Could not add scanned ingredient to fridge");
    }
  } catch (err) {
    console.error("❌ [7/10] Lưu nguyên liệu vào tủ lạnh thất bại:", err.response?.data?.message || err.message);
  }

  // 8. AI Chef Assistant Chat with Context Injection (POST /api/v1/ai/assistant-chat)
  try {
    console.log("⏳ [8/10] Đang gửi câu hỏi cho Bếp Trưởng AI (với ngữ cảnh Tủ Lạnh & Khẩu vị)...");
    const userMessage = "Tủ lạnh tôi có những nguyên liệu vừa quét, gợi ý cho tôi 2 món ăn tốt cho sức khỏe và cách làm nhanh nhất?";
    const res = await axios.post(
      `${BASE_URL}/ai/assistant-chat`,
      {
        message: userMessage,
        conversationHistory: [
          { sender: "user", text: "Xin chào đầu bếp AI!" },
          { sender: "ai", text: "Chào bạn! Tôi có thể giúp gì cho bữa ăn hôm nay của bạn?" },
        ],
      },
      { headers: authHeaders }
    );

    const assistantReply = res.data?.data;
    if (res.data?.success && assistantReply?.replyText) {
      console.log(`✅ [8/10] Bếp Trưởng AI phản hồi thành công:`);
      console.log(`       - Phản hồi: "${assistantReply.replyText.substring(0, 100)}..."`);
      if (Array.isArray(assistantReply.suggestedDishes) && assistantReply.suggestedDishes.length > 0) {
        console.log(`       - Món ăn đề xuất có thể bấm vào: [${assistantReply.suggestedDishes.join(", ")}]`);
      }
      if (Array.isArray(assistantReply.quickPrompts) && assistantReply.quickPrompts.length > 0) {
        console.log(`       - Gợi ý câu hỏi nhanh: [${assistantReply.quickPrompts.slice(0, 2).join("; ")}]`);
      }
      passedTests++;
    } else {
      throw new Error("Assistant chat failed or missing replyText");
    }
  } catch (err) {
    console.error("❌ [8/10] Trợ lý AI chat thất bại:", err.response?.data?.message || err.message);
  }

  // 9. Fetch Scan History from MongoDB (GET /api/v1/ai/scan-history)
  try {
    const res = await axios.get(`${BASE_URL}/ai/scan-history?limit=10`, { headers: authHeaders });
    const historyList = res.data?.data;

    if (Array.isArray(historyList) && historyList.length > 0) {
      const foundCurrent = historyList.find((h) => (h.id || h._id) === createdScanId);
      console.log(`✅ [9/10] Lấy lịch sử quét AI thành công: ${historyList.length} bản ghi trong MongoDB`);
      if (foundCurrent) {
        console.log(`       - Bản ghi vừa quét: "${foundCurrent.title}" | Quét lúc: ${foundCurrent.scannedAt}`);
      }
      passedTests++;
    } else {
      throw new Error("Scan history list is empty");
    }
  } catch (err) {
    console.error("❌ [9/10] Lấy lịch sử quét thất bại:", err.response?.data?.message || err.message);
  }

  // 10. Clean up: Delete Scan History & Test Fridge Item
  try {
    let cleanOk = true;
    if (createdScanId) {
      const delScanRes = await axios.delete(`${BASE_URL}/ai/scan-history/${createdScanId}`, { headers: authHeaders });
      if (!delScanRes.data?.success) cleanOk = false;
    }
    if (addedFridgeItemId) {
      const delFridgeRes = await axios.delete(`${BASE_URL}/fridge/items/${addedFridgeItemId}`, { headers: authHeaders });
      if (!delFridgeRes.data?.success) cleanOk = false;
    }

    if (cleanOk) {
      console.log("✅ [10/10] Dọn dẹp bản ghi quét AI và nguyên liệu test thành công (DELETE APIs)");
      passedTests++;
    } else {
      throw new Error("Cleanup delete operations returned unsuccessful status");
    }
  } catch (err) {
    console.error("❌ [10/10] Dọn dẹp dữ liệu test thất bại:", err.response?.data?.message || err.message);
  }

  // Final Summary
  console.log("\n=========================================================================");
  console.log(`   KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} TESTS ĐÃ VƯỢT QUA (${Math.round((passedTests / totalTests) * 100)}%)`);
  if (passedTests === totalTests) {
    console.log("   🎉 TẤT CẢ TÍNH NĂNG GIAI ĐOẠN 4 HOẠT ĐỘNG HOÀN HẢO! 🎉");
  } else {
    console.log("   ⚠️ MỘT SỐ BÀI TEST CHƯA ĐẠT, VUI LÒNG KIỂM TRA LẠI LOG CHI TIẾT TRÊN.");
  }
  console.log("=========================================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
};

runPhase4Tests();
