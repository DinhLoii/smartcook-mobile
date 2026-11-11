import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
function loadUtility(name) {
  const source = readFileSync(new URL(`../src/utils/${name}.ts`, import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  const utilityRequire = (path) => path.startsWith("./") ? loadUtility(path.slice(2)) : require(path);
  new Function("require", "module", "exports", output)(utilityRequire, module, module.exports);
  return module.exports;
}

const { recipeVideoHtml, MOBILE_VIDEO_ORIGIN } = loadUtility("recipeVideoPlayer");
const { parseRecipeVideoCommand } = loadUtility("recipeVideoCommands");
assert.equal(
  readFileSync(new URL("../src/utils/recipeVideoCommands.ts", import.meta.url), "utf8"),
  readFileSync(new URL("../../smartcook-web/src/utils/recipeVideoCommands.ts", import.meta.url), "utf8"),
  "Web and mobile must interpret video commands consistently",
);
assert.throws(() => recipeVideoHtml('<script>bad', MOBILE_VIDEO_ORIGIN));
assert.throws(() => recipeVideoHtml("LZ6rXyFRJjk", "javascript:alert(1)"));
const html = recipeVideoHtml("LZ6rXyFRJjk", MOBILE_VIDEO_ORIGIN);
assert.ok(html.includes("enablejsapi=1"));
assert.ok(html.includes(encodeURIComponent(MOBILE_VIDEO_ORIGIN)));
assert.ok(html.includes("strict-origin-when-cross-origin"));
let current = 15;
let paused = false;
let muted = false;
let rate = 1;
const replies = [];
const receiver = {};
const player = {
  getCurrentTime: () => current,
  getDuration: () => 242,
  seekTo: (position) => { current = position; },
  playVideo: () => { paused = false; },
  pauseVideo: () => { paused = true; },
  getPlaybackRate: () => rate,
  getAvailablePlaybackRates: () => [0.5, 1, 1.5, 2],
  setPlaybackRate: (value) => { rate = value; },
  isMuted: () => muted,
  mute: () => { muted = true; },
  unMute: () => { muted = false; },
};
const host = {
  ReactNativeWebView: { postMessage: (data) => replies.push(JSON.parse(data)) },
  location: { origin: "null" },
  parent: {},
  addEventListener: (name, callback) => { receiver[name] = callback; },
};
const context = {
  window: host,
  document: { createElement: () => ({}), head: { appendChild() {} } },
  YT: { Player: function (_id, { events }) { events.onReady({ target: player }); } },
};
vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], context);
host.onYouTubeIframeAPIReady();
assert.equal(replies[0].type, "ready");
let id = 0;
function send(text) {
  const command = parseRecipeVideoCommand(text, "video");
  host.smartCookVideoCommand({ id: ++id, command });
  assert.equal(replies.at(-1).id, id);
  return replies.at(-1).message;
}
assert.match(send("Tua nhanh 30s"), /0:45/);
assert.equal(current, 45);
current = 23;
assert.match(send("Tua nhân 30 giây."), /0:53/);
assert.equal(current, 53);
assert.match(send("Lùi 15 giây"), /0:38/);
assert.equal(current, 38);
send("Dừng video");
assert.equal(paused, true);
send("Dừng phát");
assert.equal(paused, true);
send("Tua nhanh 20s");
assert.equal(current, 58);
assert.equal(paused, true);
send("Phát tiếp");
assert.equal(paused, false);
send("Phát nhanh hơn");
assert.equal(rate, 1.5);
send("Phát chậm hơn");
assert.equal(rate, 1);
send("Tua nhanh 1p");
assert.equal(current, 118);
send("Tua lùi 10 phút");
assert.equal(current, 0);
send("Tua nhanh 10 phút");
assert.equal(current, 242);
const beforeInvalid = current;
send("Trừ 15 giây");
assert.equal(current, beforeInvalid);
host.smartCookVideoCommand({ command: { type: "recording", active: true } });
assert.equal(muted, true);
host.smartCookVideoCommand({ command: { type: "recording", active: false } });
assert.equal(muted, false);
muted = true;
host.smartCookVideoCommand({ command: { type: "recording", active: true } });
host.smartCookVideoCommand({ command: { type: "recording", active: false } });
assert.equal(muted, true, "Recording preserves a user's existing mute choice");
const messageCount = replies.length;
receiver.message({ source: host.parent, origin: "https://untrusted.example", data: JSON.stringify({ id: 999, command: { type: "play" } }) });
assert.equal(replies.length, messageCount);
receiver.message({ source: host.parent, origin: MOBILE_VIDEO_ORIGIN, data: JSON.stringify({ id: 1000, command: { type: "pause" } }) });
assert.equal(replies.at(-1).id, 1000, "The web iframe accepts its inherited parent's origin");
delete host.ReactNativeWebView;
host.parent.postMessage = (data, origin) => {
  assert.equal(origin, MOBILE_VIDEO_ORIGIN);
  replies.push(JSON.parse(data));
};
receiver.message({ source: host.parent, origin: MOBILE_VIDEO_ORIGIN, data: JSON.stringify({ id: 1001, command: { type: "play" } }) });
assert.equal(replies.at(-1).id, 1001);
console.log("PASS mobile player bridge, relative seek, pause/resume, speed, recording mute, command isolation and web parity");
