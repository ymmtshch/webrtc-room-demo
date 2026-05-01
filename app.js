// ===== room 取得（?room=xxxx） =====
// URLSearchParams は URLのクエリ（?以降）を扱う標準APIです。[3](https://blog.dcycle.com/blog/2023-11-15/github-pages-https-apex-www/)
function shortId(){ return crypto.randomUUID().slice(0, 8); }
const params = new URLSearchParams(window.location.search);
let room = params.get("room");

if (!room) {
  room = shortId();
  location.replace(`?room=${room}`);
}

const $ = (id) => document.getElementById(id);
$("room").textContent = room;
$("shareUrl").value = location.href;

$("copyUrl").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(location.href);
  } catch {
    alert("クリップボードにコピーできませんでした（権限/環境を確認してください）");
  }
});

// ===== ストレージ（localStorage） =====
const STORE_KEY = `attendance-board:${room}`;

const DEFAULT_NAMES = [
  "山田",
  "佐藤",
  "鈴木"
];

function nowStr(){
  const d = new Date();
  const pad = (n)=> String(n).padStart(2,"0");
  return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// state shape:
// {
//   names: ["A","B"],
//   status: { "A": { state:"in|out|remote", updatedAt:"..." }, ... },
//   updatedAt: "..."
// }
function loadState(){
  const raw = localStorage.getItem(STORE_KEY);
  if (raw) return JSON.parse(raw);

  const names = DEFAULT_NAMES;
  const status = {};
  for (const n of names) status[n] = { state:"out", updatedAt: nowStr() };
  return { names, status, updatedAt: nowStr() };
}

function saveState(state){
  state.updatedAt = nowStr();
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
  $("updated").textContent = state.updatedAt;
}

// ===== タブ間同期（BroadcastChannel） =====
// BroadcastChannel は同一オリジンの別タブ間でメッセージ交換できる標準APIです。[2](https://aws.amazon.com/api-gateway/pricing/)
const bc = new BroadcastChannel(`attendance-board:${room}`);
const peerId = shortId();

function broadcast(type, payload){
  bc.postMessage({ type, payload, from: peerId, at: Date.now() });
}

bc.onmessage = (ev) => {
  const msg = ev.data;
  if (!msg || msg.from === peerId) return;

  if (msg.type === "state") {
    // 受信したstateで上書き
    state = msg.payload;
    // 保存しておく（リロード耐性）
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    render();
  }
};

// ===== UI =====
let state = loadState();
$("names").value = state.names.join("\n");
$("updated").textContent = state.updatedAt;

$("saveNames").addEventListener("click", () => {
  const lines = $("names").value
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean);

  // 名前更新：新規はoutで追加、削除はstatusも整理
  const newStatus = {};
  for (const n of lines) {
    newStatus[n] = state.status?.[n] ?? { state:"out", updatedAt: nowStr() };
  }
  state = { names: lines, status: newStatus, updatedAt: nowStr() };
  saveState(state);
  broadcast("state", state);
  render();
});

$("resetAll").addEventListener("click", () => {
  for (const n of state.names) {
    state.status[n] = { state:"out", updatedAt: nowStr() };
  }
  saveState(state);
  broadcast("state", state);
  render();
});

function setStatus(name, next){
  state.status[name] = { state: next, updatedAt: nowStr() };
  saveState(state);
  broadcast("state", state);
  render();
}

function statusLabel(s){
  if (s === "in") return "出勤";
  if (s === "remote") return "リモート";
  return "退勤";
}

function render(){
  $("names").value = state.names.join("\n");
  $("updated").textContent = state.updatedAt;

  const board = $("board");
  board.innerHTML = "";

  for (const name of state.names) {
    const st = state.status[name]?.state ?? "out";
    const updatedAt = state.status[name]?.updatedAt ?? "-";

    const card = document.createElement("div");
    card.className = "card";

    const left = document.createElement("div");
    left.className = "statusline";

    const title = document.createElement("div");
    title.className = "name";
    title.textContent = name;

    const tag = document.createElement("div");
    tag.className = "tag";
    tag.innerHTML = `
      <span class="dot ${st}"></span>
      <span class="badge ${st === "in" ? "in" : st === "remote" ? "remote" : "out"}">
        ${statusLabel(st)}
      </span>
      <span class="small">更新: ${updatedAt}</span>
    `;

    left.appendChild(title);
    left.appendChild(tag);

    const right = document.createElement("div");
    right.className = "buttons";

    const bIn = document.createElement("button");
    bIn.className = "btn-in";
    bIn.textContent = "出勤";
    bIn.onclick = () => setStatus(name, "in");

    const bRemote = document.createElement("button");
    bRemote.className = "btn-remote";
    bRemote.textContent = "リモート";
    bRemote.onclick = () => setStatus(name, "remote");

    const bOut = document.createElement("button");
    bOut.className = "btn-out";
    bOut.textContent = "退勤";
    bOut.onclick = () => setStatus(name, "out");

    right.appendChild(bIn);
    right.appendChild(bRemote);
    right.appendChild(bOut);

    card.appendChild(left);
    card.appendChild(right);

    board.appendChild(card);
  }
}

// 初回レンダ
saveState(state);
render();

// 片方のタブが開いたとき、最新stateを投げて同期を早める
broadcast("state", state);

// 後片付け
window.addEventListener("beforeunload", () => {
  try { bc.close(); } catch {}
});
