console.log("app.js is loaded");

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



const pc = new RTCPeerConnection();
console.log("RTCPeerConnection created", pc);
