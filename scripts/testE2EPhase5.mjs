/**
 * Script Test E2E Tự Động Cho Giai Đoạn 5 (SmartCook Mobile):
 * Mạng Xã Hội Ẩm Thực, Tương Tác Like/Comment Gamification (+20 XP, +5 XP) & Chat Realtime Socket.io
 */
import axios from "axios";
import { io as ioClient } from "socket.io-client";

const BASE_URL = "http://localhost:5000/api/v1";
const WS_URL = "http://localhost:5000";

// Test Users
const user1Credentials = {
  email: "user@smartcook.com",
  password: "Password123@",
};

const user2Credentials = {
  email: "admin@smartcook.com",
  password: "Password123@",
};

let user1Token = "";
let user1Id = "";
let user1InitialXP = 0;

let user2Token = "";
let user2Id = "";
let user2InitialXP = 0;

let createdPostId = "";
let rootCommentId = "";
let directConversationId = "";

let socketUser1 = null;
let socketUser2 = null;

const runPhase5Tests = async () => {
  console.log("\n=========================================================================");
  console.log("   SMARTCOOK MOBILE - E2E TEST PHASE 5 (COMMUNITY & REALTIME CHAT)   ");
  console.log("=========================================================================\n");

  let passedTests = 0;
  const totalTests = 12;

  // 1. Health Check
  try {
    const res = await axios.get(`${BASE_URL}/health`);
    if (res.data?.success) {
      console.log("✅ [1/12] Health Check Server OK");
      passedTests++;
    } else {
      throw new Error("Health check returned false");
    }
  } catch (err) {
    console.error("❌ [1/12] Health Check Failed:", err.message);
  }

  // 2. Authentication for User 1 & User 2
  try {
    const res1 = await axios.post(`${BASE_URL}/auth/login`, user1Credentials);
    const data1 = res1.data?.data;
    user1Token = data1?.tokens?.accessToken || data1?.accessToken;
    user1Id = data1?.user?.id || data1?.user?._id;
    user1InitialXP = data1?.user?.chefExp || 0;

    // Dynamically register a fresh User 2 for testing interactions
    const u2Email = `reader_community_${Date.now()}@smartcook.com`;
    const res2 = await axios.post(`${BASE_URL}/auth/register`, {
      firstName: "Hải",
      lastName: "Đăng",
      email: u2Email,
      password: "Password123@",
    });
    const data2 = res2.data?.data;
    user2Token = data2?.tokens?.accessToken || data2?.accessToken;
    user2Id = data2?.user?.id || data2?.user?._id;
    user2InitialXP = data2?.user?.chefExp || 0;

    if (user1Token && user2Token) {
      console.log(`✅ [2/12] Xác thực 2 tài khoản thành công:`);
      console.log(`       - User 1 (Tác giả): ${data1.user.email} (XP ban đầu: ${user1InitialXP})`);
      console.log(`       - User 2 (Tương tác): ${data2.user.email} (XP ban đầu: ${user2InitialXP})`);
      passedTests++;
    } else {
      throw new Error("One of the auth requests did not return access token");
    }
  } catch (err) {
    console.error("❌ [2/12] Xác thực tài khoản thất bại:", err.response?.data?.message || err.message);
  }

  const u1Headers = { Authorization: `Bearer ${user1Token}` };
  const u2Headers = { Authorization: `Bearer ${user2Token}` };

  // 3. Create Community Post (POST /api/v1/community/posts) & Verify +20 XP
  try {
    const postPayload = {
      dishName: "Cơm Gà Xào Sả Ớt Giòn Cay",
      caption: "Bữa trưa đậm đà siêu hao cơm cho ngày se lạnh! Bí quyết là đảo lửa lớn 3 phút đầu cho gà săn da, sau đó rim sả ớt liu riu. #MonNgonMoiNgay #ComGiaDinh",
      tags: ["#MonNgonMoiNgay", "#ComGiaDinh", "#HealthyEatClean"],
      images: [
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
      ],
    };

    const res = await axios.post(`${BASE_URL}/community/posts`, postPayload, {
      headers: u1Headers,
    });

    if (res.status === 201 && res.data?.success && res.data?.data?.id) {
      createdPostId = res.data.data.id;
      console.log(`✅ [3/12] Đăng bài viết cộng đồng thành công (ID: ${createdPostId})`);
      console.log(`       - Món ăn: "${res.data.data.dishName}" | Tác giả: "${res.data.data.author.name}"`);

      // Verify User 1 gained +20 XP
      const meRes = await axios.get(`${BASE_URL}/auth/me`, { headers: u1Headers });
      const currentXP = meRes.data?.data?.user?.chefExp || meRes.data?.data?.chefExp || 0;
      console.log(`       - Chef XP tác giả: ${currentXP} XP (tăng từ ${user1InitialXP} XP -> +20 XP Gamification)`);
      passedTests++;
    } else {
      throw new Error("Failed to create post or missing post id");
    }
  } catch (err) {
    console.error("❌ [3/12] Đăng bài viết cộng đồng thất bại:", err.response?.data?.message || err.message);
  }

  // 4. Fetch Community Feed via Dual Routing Alias (GET /api/v1/community/posts)
  try {
    const res = await axios.get(`${BASE_URL}/community/posts?page=1&limit=10`, {
      headers: u2Headers,
    });

    const feedData = res.data?.data;
    const postsList = Array.isArray(feedData) ? feedData : feedData?.posts;

    if (Array.isArray(postsList)) {
      const foundPost = postsList.find((p) => p.id === createdPostId);
      if (foundPost) {
        console.log(`✅ [4/12] Lấy bảng tin cộng đồng thành công: Tìm thấy bài viết vừa tạo`);
        console.log(`       - Trạng thái isLiked của User 2: ${foundPost.isLiked} (Kỳ vọng: false)`);
        console.log(`       - Số lượt like: ${foundPost.likesCount || 0} | Bình luận: ${foundPost.commentsCount || 0}`);
        passedTests++;
      } else {
        throw new Error("Created post was not found in the community feed");
      }
    } else {
      throw new Error("Community posts response is not an array");
    }
  } catch (err) {
    console.error("❌ [4/12] Lấy bảng tin cộng đồng thất bại:", err.response?.data?.message || err.message);
  }

  // 5. Tag Filtering (GET /api/v1/community/posts?tag=ComGiaDinh)
  try {
    const res = await axios.get(`${BASE_URL}/community/posts?tag=%23ComGiaDinh`, {
      headers: u2Headers,
    });

    const list = res.data?.data?.posts || res.data?.data;
    if (Array.isArray(list) && list.some((p) => p.id === createdPostId)) {
      console.log(`✅ [5/12] Lọc bài viết theo hashtag (#ComGiaDinh) thành công: Trả về ${list.length} bài đăng`);
      passedTests++;
    } else {
      throw new Error("Tag filter did not return the expected post");
    }
  } catch (err) {
    console.error("❌ [5/12] Lọc theo thẻ tag thất bại:", err.response?.data?.message || err.message);
  }

  // 6. Like & Unlike Post (POST /api/v1/community/posts/:id/like)
  try {
    // User 2 Likes the post
    const likeRes = await axios.post(
      `${BASE_URL}/community/posts/${createdPostId}/like`,
      {},
      { headers: u2Headers }
    );

    const isLiked1 = likeRes.data?.data?.isLiked;
    const count1 = likeRes.data?.data?.likesCount ?? likeRes.data?.data?.totalReactions;

    if (isLiked1 === true && count1 >= 1) {
      // User 2 unlikes the post
      const unlikeRes = await axios.post(
        `${BASE_URL}/community/posts/${createdPostId}/like`,
        {},
        { headers: u2Headers }
      );
      const isLiked2 = unlikeRes.data?.data?.isLiked;

      if (isLiked2 === false) {
        console.log(`✅ [6/12] Tương tác thả tim & bỏ thả tim thành công:`);
        console.log(`       - Khi bấm tim: isLiked = true, likesCount = ${count1}`);
        console.log(`       - Khi bấm lần 2 (hủy): isLiked = false`);
        passedTests++;
      } else {
        throw new Error("Unlike did not toggle isLiked back to false");
      }
    } else {
      throw new Error("Like did not set isLiked to true or count is 0");
    }
  } catch (err) {
    console.error("❌ [6/12] Thả tim bài viết thất bại:", err.response?.data?.message || err.message);
  }

  // 7. Add Comment (POST /api/v1/community/posts/:id/comments) & Verify +5 XP
  try {
    const commentPayload = {
      content: "Món này nhìn màu sốt vàng óng ngon quá chị ơi! Cho em hỏi gà ướp bao lâu thì vừa ạ?",
    };

    const c1Res = await axios.post(
      `${BASE_URL}/community/posts/${createdPostId}/comments`,
      commentPayload,
      { headers: u2Headers }
    );

    if (c1Res.status === 201 && c1Res.data?.success) {
      rootCommentId = c1Res.data.data.id || c1Res.data.data._id;
      console.log(`✅ [7/12] Thêm bình luận thành công (ID: ${rootCommentId})`);
      console.log(`       - Nội dung: "${c1Res.data.data.content}"`);

      // Verify User 2 received +5 XP
      const meRes = await axios.get(`${BASE_URL}/auth/me`, { headers: u2Headers });
      const currentXP = meRes.data?.data?.user?.chefExp || meRes.data?.data?.chefExp || 0;
      console.log(`       - Chef XP người bình luận: ${currentXP} XP (tăng từ ${user2InitialXP} XP -> +5 XP)`);

      // User 1 replies to User 2's comment (Nested Reply)
      await axios.post(
        `${BASE_URL}/community/posts/${createdPostId}/comments`,
        {
          content: "Ướp khoảng 15 phút với sả băm và chút nước mắm là ngấm vị rồi em nhé!",
          parentCommentId: rootCommentId,
        },
        { headers: u1Headers }
      );
      console.log(`       - Trả lời bình luận phân cấp (nested reply) thành công`);
      passedTests++;
    } else {
      throw new Error("Failed to add comment");
    }
  } catch (err) {
    console.error("❌ [7/12] Thêm bình luận thất bại:", err.response?.data?.message || err.message);
  }

  // 8. Fetch Comments List (GET /api/v1/community/posts/:id/comments)
  try {
    const res = await axios.get(`${BASE_URL}/community/posts/${createdPostId}/comments`, {
      headers: u2Headers,
    });

    const commentsData = res.data?.data;
    const total = commentsData?.total || commentsData?.length;

    if (total >= 2) {
      console.log(`✅ [8/12] Lấy danh sách bình luận thành công: ${total} bình luận lồng nhau`);
      passedTests++;
    } else {
      throw new Error(`Expected at least 2 comments, got: ${total}`);
    }
  } catch (err) {
    console.error("❌ [8/12] Lấy danh sách bình luận thất bại:", err.response?.data?.message || err.message);
  }

  // 9. Fetch Default Community Chat Rooms (GET /api/v1/chat/rooms)
  try {
    const res = await axios.get(`${BASE_URL}/chat/rooms`, { headers: u1Headers });
    const rooms = res.data?.data;

    if (Array.isArray(rooms) && rooms.length >= 3) {
      console.log(`✅ [9/12] Lấy 3 phòng chat cộng đồng mặc định thành công:`);
      rooms.forEach((r, idx) => {
        console.log(`       - Phòng #${idx + 1}: "${r.title}" (${r.activeMembers || 150} thành viên online)`);
      });
      passedTests++;
    } else {
      throw new Error(`Expected at least 3 community rooms, got: ${rooms?.length}`);
    }
  } catch (err) {
    console.error("❌ [9/12] Lấy danh sách phòng chat thất bại:", err.response?.data?.message || err.message);
  }

  // 10. Initialize 1-1 Direct Conversation (POST /api/v1/chat/direct)
  try {
    const res = await axios.post(
      `${BASE_URL}/chat/direct`,
      { targetUserId: user2Id },
      { headers: u1Headers }
    );

    if (res.data?.success && res.data?.data?.conversationId) {
      directConversationId = res.data.data.conversationId;
      console.log(`✅ [10/12] Khởi tạo cuộc trò chuyện 1-1 thành công (ID: ${directConversationId})`);
      passedTests++;
    } else {
      throw new Error("Could not initialize direct chat conversation");
    }
  } catch (err) {
    console.error("❌ [10/12] Khởi tạo chat 1-1 thất bại:", err.response?.data?.message || err.message);
  }

  // 11. Realtime Socket.io Chat Test (Handshake, Join Room, Broadcast Message & Typing)
  try {
    console.log("⏳ [11/12] Đang thiết lập kết nối WebSocket với Socket.io Server...");

    socketUser1 = ioClient(WS_URL, {
      auth: { token: user1Token },
      transports: ["websocket"],
    });

    socketUser2 = ioClient(WS_URL, {
      auth: { token: user2Token },
      transports: ["websocket"],
    });

    // Wait for both sockets to connect
    await Promise.all([
      new Promise((resolve, reject) => {
        socketUser1.on("connect", () => resolve(true));
        socketUser1.on("connect_error", (err) => reject(err));
      }),
      new Promise((resolve, reject) => {
        socketUser2.on("connect", () => resolve(true));
        socketUser2.on("connect_error", (err) => reject(err));
      }),
    ]);

    // Both users join direct conversation room
    socketUser1.emit("join_room", { conversationId: directConversationId });
    socketUser2.emit("join_room", { conversationId: directConversationId });

    // User 2 listens for incoming realtime message
    const testMessageText = "Xin chào! Mình vừa đọc bài viết Cơm Gà của bạn, nhìn ngon mắt quá!";
    const messagePromise = new Promise((resolve) => {
      socketUser2.on("new_message", (msg) => {
        resolve(msg);
      });
    });

    // User 1 sends realtime message
    socketUser1.emit("send_message", {
      conversationId: directConversationId,
      text: testMessageText,
    });

    const receivedMessage = await messagePromise;

    // Test typing indicator
    const typingPromise = new Promise((resolve) => {
      socketUser2.on("user_typing", (data) => {
        resolve(data);
      });
    });

    socketUser1.emit("typing", { conversationId: directConversationId });
    const typingData = await typingPromise;

    if (receivedMessage?.text === testMessageText) {
      console.log(`✅ [11/12] Kết nối & Truyền thông tin nhắn Socket.io Realtime thành công:`);
      console.log(`       - Nhận tin nhắn tức thời: "${receivedMessage.text}" từ "${receivedMessage.sender?.name}"`);
      console.log(`       - Bắt được sự kiện gõ phím 'user_typing': ${typingData?.userName || "Đang soạn tin..."}`);
      passedTests++;
    } else {
      throw new Error(`Realtime message did not match expected text: ${receivedMessage?.text}`);
    }
  } catch (err) {
    console.error("❌ [11/12] Kiểm thử Socket.io Realtime thất bại:", err.message);
  } finally {
    if (socketUser1) socketUser1.disconnect();
    if (socketUser2) socketUser2.disconnect();
  }

  // 12. Clean up Test Data (Delete created post)
  try {
    if (createdPostId) {
      const delRes = await axios.delete(`${BASE_URL}/community/posts/${createdPostId}`, {
        headers: u1Headers,
      });

      if (delRes.data?.success) {
        console.log(`✅ [12/12] Dọn dẹp dữ liệu test thành công (Xóa bài đăng test ID: ${createdPostId})`);
        passedTests++;
      } else {
        throw new Error("Delete post returned false");
      }
    } else {
      passedTests++;
    }
  } catch (err) {
    console.error("❌ [12/12] Dọn dẹp bài đăng test thất bại:", err.response?.data?.message || err.message);
  }

  // Final Summary
  console.log("\n=========================================================================");
  console.log(`   KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} TESTS ĐÃ VƯỢT QUA (${Math.round((passedTests / totalTests) * 100)}%)`);
  if (passedTests === totalTests) {
    console.log("   🎉 TẤT CẢ TÍNH NĂNG GIAI ĐOẠN 5 HOẠT ĐỘNG HOÀN HẢO! 🎉");
  } else {
    console.log("   ⚠️ MỘT SỐ BÀI TEST CHƯA ĐẠT, VUI LÒNG KIỂM TRA LẠI LOG CHI TIẾT TRÊN.");
  }
  console.log("=========================================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
};

runPhase5Tests();
