// --- Step 2-x ---
function createRoomId() {
  return crypto.randomUUID().slice(0, 8);
}

const params = new URLSearchParams(window.location.search);
let room = params.get("room");

if (!room) {
  room = createRoomId();
  location.replace(`?room=${room}`);
}

console.log("Current room:", room);
document.getElementById("room").textContent =
  "Room: " + room;

// --- Step 3-1 ---
const pc = new RTCPeerConnection();
console.log("RTCPeerConnection created", pc);

pc.oniceconnectionstatechange = () => {
  console.log("ICE state:", pc.iceConnectionState);
};

// --- Step 3-2 ---
// ★ pc は「新しく作らない」

async function createOffer() {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  console.log("Offer created:", offer);
}

document
  .getElementById("make-offer")
  .addEventListener("click", createOffer);
