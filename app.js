// ===== Utils =====
function $(id) { return document.getElementById(id); }
function logLine(s) {
  const ta = $("log");
  ta.value += s + "\n";
  ta.scrollTop = ta.scrollHeight;
}
function shortId() {
  return crypto.randomUUID().slice(0, 8);
}

// ===== Step 2-2: room handling =====
const params = new URLSearchParams(window.location.search);
let room = params.get("room");

if (!room) {
  room = shortId();
  location.replace(`?room=${room}`);
}

$("room").textContent = room;
$("shareUrl").value = location.href;

$("copyUrl").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    logLine("[UI] Copied URL to clipboard");
  } catch {
    logLine("[UI] Clipboard copy failed (permission?)");
  }
});

// ===== Step 3: WebRTC + Signaling (BroadcastChannel) =====

// BroadcastChannel: same-origin tab-to-tab messaging
// Channel name is per-room so only same room tabs talk to each other.
const peerId = shortId();
const channelName = `webrtc-room-${room}`;
const bc = new BroadcastChannel(channelName);

let remotePeerId = null;
let isCaller = false;

// WebRTC config
// ICE server config is required in general; below is a common public STUN example (optional for same-network tests).
// WebRTC docs explain that peers need ICE server configuration (STUN/TURN) to discover candidates. [1](https://webrtc.org/getting-started/peer-connections)
const pc = new RTCPeerConnection({
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
});

$("conn").textContent = pc.connectionState;
$("ice").textContent = pc.iceConnectionState;

pc.onconnectionstatechange = () => {
  $("conn").textContent = pc.connectionState;
  logLine(`[PC] connectionState = ${pc.connectionState}`);
};

pc.oniceconnectionstatechange = () => {
  $("ice").textContent = pc.iceConnectionState;
  logLine(`[PC] iceConnectionState = ${pc.iceConnectionState}`);
};

// DataChannel
let dc = null;

// callee side: receive datachannel
pc.ondatachannel = (ev) => {
  dc = ev.channel;
  bindDataChannel(dc, "callee");
};

function bindDataChannel(channel, roleLabel) {
  logLine(`[DC] datachannel received/opened as ${roleLabel}`);
  channel.onopen = () => {
    logLine("[DC] open");
    $("send").disabled = false;
  };
  channel.onclose = () => {
    logLine("[DC] close");
    $("send").disabled = true;
  };
  channel.onmessage = (e) => {
    logLine(`[REMOTE] ${e.data}`);
  };
}

// Queue ICE candidates until remote description is set
let pendingRemoteCandidates = [];

async function addCandidateSafely(candidateObj) {
  if (!candidateObj) return;
  // If remoteDescription is not set yet, queue it.
  if (!pc.remoteDescription) {
    pendingRemoteCandidates.push(candidateObj);
    return;
  }
  try {
    await pc.addIceCandidate(candidateObj);
  } catch (err) {
    logLine(`[ICE] addIceCandidate failed: ${err}`);
  }
}

async function flushCandidates() {
  if (!pc.remoteDescription) return;
  const q = pendingRemoteCandidates;
  pendingRemoteCandidates = [];
  for (const c of q) {
    await addCandidateSafely(c);
  }
}

// Send ICE candidates to the other tab via BroadcastChannel
pc.onicecandidate = (event) => {
  if (!event.candidate) return;
  bc.postMessage({
    type: "ice",
    from: peerId,
    to: remotePeerId,      // may be null; receiver will still ignore non-matching if to is set
    candidate: event.candidate
  });
};

// --- Signaling messages ---
// WebRTC signaling is not specified; any mechanism can be used. [1](https://webrtc.org/getting-started/peer-connections)
bc.onmessage = async (event) => {
  const msg = event.data;
  if (!msg || msg.from === peerId) return;

  // If "to" is set and it's not for me, ignore.
  if (msg.to && msg.to !== peerId) return;

  // Remember remote id
  if (!remotePeerId) remotePeerId = msg.from;

  if (msg.type === "hello") {
    // Reply so each tab learns the other's id
    bc.postMessage({ type: "hello-ack", from: peerId, to: msg.from });
    return;
  }

  if (msg.type === "hello-ack") {
    return;
  }

  if (msg.type === "offer") {
    logLine("[SIG] offer received");
    try {
      await pc.setRemoteDescription(msg.offer);
      await flushCandidates();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      bc.postMessage({
        type: "answer",
        from: peerId,
        to: msg.from,
        answer: pc.localDescription
      });
      logLine("[SIG] answer sent");
    } catch (err) {
      logLine(`[SIG] handling offer failed: ${err}`);
    }
    return;
  }

  if (msg.type === "answer") {
    logLine("[SIG] answer received");
    try {
      await pc.setRemoteDescription(msg.answer);
      await flushCandidates();
    } catch (err) {
      logLine(`[SIG] handling answer failed: ${err}`);
    }
    return;
  }

  if (msg.type === "ice") {
    // Candidate can arrive before SDP; queue it.
    await addCandidateSafely(msg.candidate);
    return;
  }
};

// Say hello on load
bc.postMessage({ type: "hello", from: peerId });
logLine(`[SYS] peerId=${peerId} channel=${channelName}`);

// ===== Step 3-2/3-3: Create Offer (Caller) =====
async function createOfferFlow() {
  if (isCaller) {
    logLine("[UI] already caller");
    return;
  }

  isCaller = true;
  logLine("[UI] create offer...");

  // Caller creates the data channel BEFORE offer so it's negotiated.
  dc = pc.createDataChannel("chat");
  bindDataChannel(dc, "caller");

  // Create offer and set local description (recommended flow) [2](https://webrtc.org/getting-started/peer-connections-advanced)[5](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer)
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  // Send to the other tab via signaling
  bc.postMessage({
    type: "offer",
    from: peerId,
    to: remotePeerId, // may be null; other tab will still receive if to is null
    offer: pc.localDescription
  });

  logLine("[SIG] offer sent");
}

$("create-offer").addEventListener("click", () => {
  createOfferFlow().catch(err => logLine(`[UI] createOfferFlow failed: ${err}`));
});

// ===== Chat UI =====
$("send").addEventListener("click", () => {
  const text = $("msg").value.trim();
  if (!text) return;
  if (!dc || dc.readyState !== "open") {
    logLine("[DC] not open yet");
    return;
  }
  dc.send(text);
  logLine(`[ME] ${text}`);
  $("msg").value = "";
});

// cleanup
window.addEventListener("beforeunload", () => {
  try { bc.close(); } catch {}
  try { pc.close(); } catch {}
});
