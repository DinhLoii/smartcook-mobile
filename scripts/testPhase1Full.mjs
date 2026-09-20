// scripts/testPhase1Full.mjs
// Test full suite for Phase 1 (Auth, Google Sign-in Endpoint, Profile Update, Survey, Silent Refresh, Logout)

import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";

const client = axios.create({
  baseURL: API_BASE,
  validateStatus: () => true,
});

async function runTests() {
  console.log("=== BẮT ĐẦU KIỂM THỬ TOÀN BỘ PHASE 1 SMARTCOOK ===");
  let passed = 0;
  let total = 0;

  function assert(condition, name, details = "") {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}: ${details}`);
    }
  }

  // 1. Health check
  const healthRes = await client.get("/health");
  assert(healthRes.status === 200, "1. Backend Health Check 200 OK");

  // 2. Login with existing User
  const loginRes = await client.post("/auth/login", {
    email: "user@smartcook.com",
    password: "Password123@",
  });
  assert(loginRes.status === 200, "2. User Login 200 OK", JSON.stringify(loginRes.data));
  const userToken = loginRes.data?.data?.tokens?.accessToken || loginRes.data?.data?.accessToken;
  const refreshToken = loginRes.data?.data?.tokens?.refreshToken || loginRes.data?.data?.refreshToken;
  assert(!!userToken, "2b. Access Token generated", userToken);

  // 3. Get Me Profile
  const meRes = await client.get("/auth/me", {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert(meRes.status === 200, "3. Get User Profile (/auth/me) 200 OK");

  // 4. Update Profile (Name & Avatar)
  const newFirstName = "Smart";
  const newLastName = "Chef " + Math.floor(Math.random() * 1000);
  const newAvatar = "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400&q=80";

  const updateProfileRes = await client.put(
    "/auth/profile",
    {
      firstName: newFirstName,
      lastName: newLastName,
      avatar: newAvatar,
    },
    { headers: { Authorization: `Bearer ${userToken}` } }
  );
  assert(updateProfileRes.status === 200, "4. Update Profile (/auth/profile) 200 OK");
  assert(
    updateProfileRes.data?.data?.lastName === newLastName,
    "4b. Profile lastName persisted in response",
    updateProfileRes.data?.data?.lastName
  );

  // 5. Verify updated profile via /auth/me
  const verifyProfileRes = await client.get("/auth/me", {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert(
    verifyProfileRes.data?.data?.lastName === newLastName &&
      verifyProfileRes.data?.data?.avatar === newAvatar,
    "5. Verify MongoDB updated profile correctly",
    JSON.stringify(verifyProfileRes.data?.data)
  );

  // 6. Test Google Auth Endpoint validation
  const googleNoToken = await client.post("/auth/google", {});
  assert(
    googleNoToken.status === 400,
    "6a. Google Auth: Reject empty ID Token (400 Bad Request)",
    googleNoToken.data?.message
  );

  const googleInvalidToken = await client.post("/auth/google", {
    idToken: "mock_invalid_google_jwt_token_for_testing",
  });
  assert(
    googleInvalidToken.status === 401,
    "6b. Google Auth: Rejects invalid ID Token (401 Unauthorized via Google Auth Library)",
    googleInvalidToken.data?.message
  );

  // 7. Update Onboarding Survey
  const surveyRes = await client.post(
    "/auth/survey",
    {
      portion: "3-4",
      cuisines: ["vietnamese", "korean"],
      healthGoal: "healthy",
      restrictions: ["peanut"],
      tasteProfile: ["spicy"],
      cookingTime: "medium",
    },
    { headers: { Authorization: `Bearer ${userToken}` } }
  );
  assert(surveyRes.status === 200, "7. Update Survey (/auth/survey) 200 OK");

  // 8. Refresh Token Silent Rotation
  const refreshRes = await client.post("/auth/refresh-token", {
    refreshToken,
  });
  assert(refreshRes.status === 200, "8. Refresh Token Rotation 200 OK");
  const newAccessToken = refreshRes.data?.data?.tokens?.accessToken || refreshRes.data?.data?.accessToken;
  assert(!!newAccessToken, "8b. New Access Token received");

  // 9. Logout
  const logoutRes = await client.post(
    "/auth/logout",
    { refreshToken },
    { headers: { Authorization: `Bearer ${newAccessToken}` } }
  );
  assert(logoutRes.status === 200, "9. Logout Session Revoked 200 OK");

  console.log(`\n=== KẾT QUẢ KIỂM THỬ: ${passed}/${total} TIÊU CHÍ ĐẠT (${Math.round((passed / total) * 100)}%) ===`);
}

runTests().catch(console.error);
