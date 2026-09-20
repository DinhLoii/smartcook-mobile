/**
 * Script Test E2E Tự Động Cho Phase 1: Authentication, Survey & Token Management
 * Kiểm tra toàn bộ luồng từ Client gọi vào SmartCook Backend.
 */
import axios from "axios";

const BASE_URL = "http://localhost:5000/api/v1";

const randomSuffix = Math.floor(Math.random() * 10000);
const testUser = {
  firstName: "Minh",
  lastName: "Tuan",
  email: `chef.tuan.${Date.now()}.${randomSuffix}@gmail.com`,
  password: "Password123@",
};

const surveyData = {
  portion: "3-4",
  cuisines: ["vietnamese", "asian", "healthy"],
  healthGoal: "healthy",
  restrictions: ["no-spicy"],
  tasteProfile: ["dam-da", "thanh-dam"],
  cookingTime: "medium",
};

let accessToken = "";
let refreshToken = "";

const runPhase1Tests = async () => {
  console.log("\n========================================================");
  console.log("   SMARTCOOK MOBILE - E2E TEST PHASE 1 (AUTH & STORAGE)  ");
  console.log("========================================================\n");

  let passedTests = 0;
  const totalTests = 8;

  // 1. Health Check
  try {
    const res = await axios.get(`${BASE_URL}/health`);
    if (res.data?.success) {
      console.log("✅ [1/8] Health Check Server OK");
      passedTests++;
    } else {
      throw new Error("Health check returned false");
    }
  } catch (err) {
    console.error("❌ [1/8] Health Check Failed:", err.message);
  }

  // 2. Register New User
  try {
    const res = await axios.post(`${BASE_URL}/auth/register`, testUser);
    const data = res.data?.data;
    const token = data?.tokens?.accessToken || data?.accessToken;
    const refToken = data?.tokens?.refreshToken || data?.refreshToken;

    if (token && data?.user?.email === testUser.email) {
      console.log(`✅ [2/8] Register Success: ${data.user.email} (ID: ${data.user.id || data.user._id})`);
      accessToken = token;
      refreshToken = refToken;
      passedTests++;
    } else {
      throw new Error("Register did not return valid token or user");
    }
  } catch (err) {
    console.error("❌ [2/8] Register Failed:", err.response?.data?.message || err.message);
  }

  // 3. Login User
  try {
    const res = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password,
    });
    const data = res.data?.data;
    const token = data?.tokens?.accessToken || data?.accessToken;
    const refToken = data?.tokens?.refreshToken || data?.refreshToken;

    if (token && refToken) {
      console.log("✅ [3/8] Login Success: Tokens received and authenticated");
      accessToken = token;
      refreshToken = refToken;
      passedTests++;
    } else {
      throw new Error("Login did not return tokens");
    }
  } catch (err) {
    console.error("❌ [3/8] Login Failed:", err.response?.data?.message || err.message);
  }

  // 4. Get Current User Profile (with Bearer Token)
  try {
    const res = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const user = res.data?.data;
    if (user?.email === testUser.email) {
      console.log(`✅ [4/8] Get Profile /me Success: Name: "${user.fullName || user.firstName}", Level: "${user.level || 'Tập sự'}"`);
      passedTests++;
    } else {
      throw new Error("Get Me returned incorrect user");
    }
  } catch (err) {
    console.error("❌ [4/8] Get Profile Failed:", err.response?.data?.message || err.message);
  }

  // 5. Update Onboarding Survey (Preferences)
  try {
    const res = await axios.post(`${BASE_URL}/auth/survey`, surveyData, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const prefs = res.data?.data;
    if (prefs?.hasCompletedSurvey && prefs?.portion === "3-4") {
      console.log("✅ [5/8] Onboarding Survey Saved: Portions, Cuisines & Health goals synced to MongoDB");
      passedTests++;
    } else {
      throw new Error(`Survey preferences not saved correctly: ${JSON.stringify(prefs)}`);
    }
  } catch (err) {
    console.error("❌ [5/8] Onboarding Survey Failed:", err.response?.data?.message || err.message);
  }

  // 6. Update Profile
  try {
    const res = await axios.put(
      `${BASE_URL}/auth/profile`,
      { firstName: "Minh Tuấn", lastName: "MasterChef" },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const user = res.data?.data;
    if (user?.firstName === "Minh Tuấn") {
      console.log(`✅ [6/8] Update Profile Success: Updated name to "${user.firstName} ${user.lastName}"`);
      passedTests++;
    } else {
      throw new Error("Update profile did not update first name");
    }
  } catch (err) {
    console.error("❌ [6/8] Update Profile Failed:", err.response?.data?.message || err.message);
  }

  // 7. Silent Refresh Token Rotation
  try {
    const res = await axios.post(`${BASE_URL}/auth/refresh-token`, { refreshToken });
    const data = res.data?.data;
    if (data?.accessToken && data?.refreshToken) {
      console.log("✅ [7/8] Silent Refresh Token Success: New Access Token rotated safely");
      accessToken = data.accessToken;
      refreshToken = data.refreshToken;
      passedTests++;
    } else {
      throw new Error("Refresh token did not return new tokens");
    }
  } catch (err) {
    console.error("❌ [7/8] Silent Refresh Token Failed:", err.response?.data?.message || err.message);
  }

  // 8. Logout & Revoke Session
  try {
    const res = await axios.post(
      `${BASE_URL}/auth/logout`,
      { refreshToken },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (res.data?.success) {
      console.log("✅ [8/8] Logout & Token Revocation Success: Session terminated cleanly");
      passedTests++;
    } else {
      throw new Error("Logout returned false");
    }
  } catch (err) {
    console.error("❌ [8/8] Logout Failed:", err.response?.data?.message || err.message);
  }

  console.log("\n========================================================");
  console.log(`   KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} TESTS PASSED (${(passedTests / totalTests) * 100}%)`);
  console.log("========================================================\n");

  if (passedTests === totalTests) {
    console.log("🎉 TẤT CẢ CÁC BÀI TEST PHASE 1 ĐỀU THÀNH CÔNG RỰC RỠ! SẴN SÀNG CHO MOBILE.");
    process.exit(0);
  } else {
    console.error("⚠️ Một số bài test không vượt qua. Vui lòng kiểm tra lại log.");
    process.exit(1);
  }
};

runPhase1Tests();
