// ===== Step 2: room handling =====

// ランダムな room ID を作る
function createRoomId() {
  return crypto.randomUUID().slice(0, 8);
}

// URL から room を取得
const params = new URLSearchParams(window.location.search);
let room = params.get("room");

// room が無ければ自動生成して URL を書き換える
if (!room) {
  room = createRoomId();
  location.replace(`?room=${room}`);
}

console.log("Current room:", room);

// 画面に表示
document.getElementById("room").textContent =
  "Room: " + room;


// ===== Step 3-1: WebRTC core =====

// WebRTC の本体（※1回だけ）
const pc = new RTCPeerConnection();
console.log("RTCPeerConnection created", pc);

// 接続状態の変化をログ
pc.oniceconnectionstatechange = () => {
  console.log("ICE state:", pc.iceConnectionState);
};


// ===== Step 3-2: create offer =====

async function createOffer() {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  console.log("Offer created:", offer);
}

// ボタンに紐づけ
document
  .getElementById("make-offer")
  .addEventListener("click", createOffer);
