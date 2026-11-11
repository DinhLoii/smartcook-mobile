import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const viewer = "aaaaaaaaaaaaaaaaaaaaaaaa";
const partner = { id: "bbbbbbbbbbbbbbbbbbbbbbbb", name: "Bếp A", avatar: "" };
const conversationId = "cccccccccccccccccccccccc";
const conversation = {
  id: partner.id, conversationId, user: partner, lastMessage: "",
  lastMessageTime: "Vừa xong", unreadCount: 0, isOnline: false,
};
const secondConversation = { ...conversation, conversationId: "eeeeeeeeeeeeeeeeeeeeeeee" };
const endpoint = `/chat/conversations/${conversationId}/messages`;
const response = (value) => ({ data: { success: true, data: value } });
const own = {
  id: "message-1", conversationId, sender: { id: viewer, name: partner.name },
  text: "Chào bạn", timestamp: "10:00", isMe: true,
};
const incoming = { ...own, id: "message-2", sender: partner, text: "Chào bạn nhé" };
let listener;
let finishHistory;
const rooms = new Set();
const socketService = {
  onNewMessage: (callback) => { listener = callback; },
  joinRoom: (id) => rooms.add(id),
  leaveRoom: (id) => rooms.delete(id),
};
const apiClient = {
  get: async (url) => {
    if (url === "/chat/conversations") {
      return response([conversation, secondConversation, { ...conversation, lastMessage: "Bản trùng" }]);
    }
    assert.equal(url, endpoint);
    return new Promise((resolve) => { finishHistory = resolve; });
  },
  post: async (url, payload) => {
    if (url === "/chat/direct") {
      assert.deepEqual(payload, { targetUserId: partner.id });
      return response(conversation);
    }
    assert.equal(url, endpoint);
    if (payload.text === "Lỗi") throw new Error("Network unavailable");
    assert.equal(payload.text, own.text);
    listener(own);
    return response(own);
  },
};
const dependencies = {
  "./apiClient": { apiClient },
  "./socketService": { socketService },
  "@/utils/tokenStorage": { tokenStorage: { getUser: async () => null } },
};
const source = readFileSync(new URL("../src/services/communityService.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const module = { exports: {} };
new Function("require", "module", "exports", js)(
  (name) => name.startsWith("@/assets/") ? 1 : dependencies[name], module, module.exports,
);
const { CommunityService: chat } = module.exports;
chat.setChatUser(viewer);
assert.deepEqual(chat.getConversations(), []);
assert.equal((await chat.getOrCreateDirectChat(partner.id)).conversationId, conversationId);
chat.setActiveConversation(conversationId);
assert.ok(rooms.has(conversationId));
const history = chat.fetchMessageHistory(conversationId);
await chat.sendDirectMessage(conversationId, " Chào bạn ");
listener(incoming);
listener(incoming);
finishHistory(response([own]));
const messages = await history;
assert.deepEqual(messages.map((item) => [item.id, item.isMe]), [[own.id, true], [incoming.id, false]]);
assert.equal(chat.getConversations()[0].unreadCount, 0);
await assert.rejects(chat.sendDirectMessage(conversationId, "Lỗi"));
assert.equal(chat.getDirectMessages(conversationId).length, 2);

chat.setActiveConversation("");
listener({ ...incoming, id: "message-3" });
assert.equal(chat.getConversations()[0].unreadCount, 1);
const inbox = await chat.fetchConversations();
assert.deepEqual(inbox.map((item) => item.conversationId), [conversationId, secondConversation.conversationId]);
assert.ok(inbox.every((item) => item.user.id === partner.id));
assert.equal(inbox[0].lastMessage, conversation.lastMessage);
assert.equal(chat.getConversations()[0].unreadCount, 1);
const stale = chat.fetchMessageHistory(conversationId);
chat.setChatUser("dddddddddddddddddddddddd");
finishHistory(response([own, incoming]));
assert.deepEqual(await stale, []);
assert.deepEqual(chat.getDirectMessages(conversationId), []);
assert.deepEqual(chat.getConversations(), []);
assert.equal(rooms.size, 0);
console.log("PASS direct chat sends, realtime and inbox deduplication, history races, failures, unread state and account isolation");
