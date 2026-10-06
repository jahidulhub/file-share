const express = require("express");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");

const PORT = 3000;

const SESSION_MS = 3 * 60 * 60 * 1000; // 3 hours
const CLOCK_SLACK_MS = 60 * 1000;
const HEARTBEAT_MS = 15 * 1000;
const SWEEP_MS = 30 * 1000;
const JOIN_TIMEOUT_MS = 10 * 1000;

const ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, maxPayload: 64 * 1024 });

app.use(express.static(path.join(__dirname, "../client")));

app.get("/health", (req, res) => {
  res.json({ ok: true, rooms: rooms.size });
});

// roomId -> { expiresAt, host: ws | null, guest: ws | null, guestDevice: string | null }
const rooms = new Map();

// signaling messages that are relayed, and the field each one carries
const RELAY_FIELDS = {
  "offer": "offer",
  "answer": "answer",
  "ice-candidate": "candidate"
};


// -------------------------
// HELPERS
// -------------------------

function send(ws, message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function sendError(ws, code, message) {
  send(ws, { type: "error", code, message });
}

// close a socket without triggering the "peer left" notifications
function detach(ws, terminate = false) {
  if (!ws) return;
  ws.detached = true;
  if (terminate) ws.terminate();
  else ws.close(1000);
}

function otherSide(room, ws) {
  return ws.role === "host" ? room.guest : room.host;
}


// -------------------------
// HOST (the extension)
// -------------------------

function handleHost(ws, message) {
  if (ws.role) {
    sendError(ws, "already-joined", "This connection already has a room");
    return;
  }

  const roomId = message.room;
  if (typeof roomId !== "string" || !ID_PATTERN.test(roomId)) {
    sendError(ws, "bad-room", "Invalid room ID");
    return;
  }

  const now = Date.now();
  let expiresAt = Number(message.expiresAt);

  if (!Number.isFinite(expiresAt) || expiresAt <= now) {
    sendError(ws, "expired", "Session expired");
    return;
  }

  // the extension can never ask for more than the maximum session length
  if (expiresAt > now + SESSION_MS + CLOCK_SLACK_MS) {
    expiresAt = now + SESSION_MS;
  }

  let room = rooms.get(roomId);

  if (room) {
    // the panel was reopened (or opened in a second window): newest wins
    if (room.host && room.host !== ws) {
      sendError(room.host, "replaced", "Opened in another window");
      detach(room.host, true);
    }
  } else {
    room = { expiresAt, host: null, guest: null, guestDevice: null };
    rooms.set(roomId, room);
  }

  room.host = ws;

  ws.role = "host";
  ws.roomId = roomId;
  clearTimeout(ws.joinTimer);

  console.log(`Room ${roomId}: host connected`);

  send(ws, {
    type: "hosted",
    room: roomId,
    expiresAt: room.expiresAt,
    phone: Boolean(room.guest)
  });

  // a phone was already waiting: tell both sides to start negotiating
  if (room.guest) {
    send(room.guest, { type: "host-joined" });
    send(ws, { type: "peer-joined" });
  }
}


function handleCloseRoom(ws) {
  if (ws.role !== "host") {
    sendError(ws, "not-host", "Only the host can close the room");
    return;
  }

  const roomId = ws.roomId;
  const room = rooms.get(roomId);

  if (room) {
    if (room.guest) {
      send(room.guest, { type: "revoked" });
      detach(room.guest);
    }
    rooms.delete(roomId);
  }

  console.log(`Room ${roomId}: closed by host`);

  // the same socket can now host a brand new room
  ws.role = null;
  ws.roomId = null;

  send(ws, { type: "room-closed" });
}


// -------------------------
// GUEST (the phone)
// -------------------------

function handleJoin(ws, message) {
  if (ws.role) {
    sendError(ws, "already-joined", "This connection already has a room");
    return;
  }

  const roomId = message.room;
  const device = message.device;

  if (
    typeof roomId !== "string" || !ID_PATTERN.test(roomId) ||
    typeof device !== "string" || !ID_PATTERN.test(device)
  ) {
    sendError(ws, "bad-room", "Invalid connection link");
    detach(ws);
    return;
  }

  const room = rooms.get(roomId);

  if (!room) {
    sendError(ws, "not-found", "Session not found");
    detach(ws);
    return;
  }

  if (room.expiresAt <= Date.now()) {
    sendError(ws, "expired", "Session expired");
    detach(ws);
    return;
  }

  if (room.guest) {
    if (room.guestDevice === device) {
      // same phone came back (refresh, second tab): newest wins
      sendError(room.guest, "replaced", "Opened in another tab");
      detach(room.guest, true);
    } else {
      sendError(ws, "busy", "Another phone is already connected");
      detach(ws);
      return;
    }
  }

  room.guest = ws;
  room.guestDevice = device;

  ws.role = "guest";
  ws.roomId = roomId;
  clearTimeout(ws.joinTimer);

  console.log(`Room ${roomId}: phone connected`);

  send(ws, {
    type: "joined",
    room: roomId,
    expiresAt: room.expiresAt,
    host: Boolean(room.host)
  });

  if (room.host) {
    send(room.host, { type: "peer-joined" });
  }
}


// -------------------------
// RELAY
// -------------------------

function handleRelay(ws, message) {
  if (!ws.role) return;

  const room = rooms.get(ws.roomId);
  if (!room) return;

  const target = otherSide(room, ws);
  if (!target) return;

  const field = RELAY_FIELDS[message.type];
  send(target, { type: message.type, [field]: message[field] });
}


// -------------------------
// CONNECTIONS
// -------------------------

wss.on("connection", (ws) => {
  ws.isAlive = true;
  ws.role = null;
  ws.roomId = null;
  ws.detached = false;

  // sockets that never join a room are dropped
  ws.joinTimer = setTimeout(() => {
    if (!ws.role) ws.terminate();
  }, JOIN_TIMEOUT_MS);

  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("message", (raw) => {
    let message;

    try {
      message = JSON.parse(raw.toString());
    } catch {
      sendError(ws, "invalid-message", "Invalid message");
      return;
    }

    switch (message.type) {
      case "host":
        handleHost(ws, message);
        break;

      case "join":
        handleJoin(ws, message);
        break;

      case "close-room":
        handleCloseRoom(ws);
        break;

      case "offer":
      case "answer":
      case "ice-candidate":
        handleRelay(ws, message);
        break;
    }
  });

  ws.on("close", () => {
    clearTimeout(ws.joinTimer);

    // replaced, kicked or expired sockets leave quietly
    if (ws.detached || !ws.role) return;

    const room = rooms.get(ws.roomId);
    if (!room) return;

    if (ws.role === "host" && room.host === ws) {
      room.host = null;
      console.log(`Room ${ws.roomId}: host left`);
      send(room.guest, { type: "host-left" });
    }

    if (ws.role === "guest" && room.guest === ws) {
      room.guest = null;
      room.guestDevice = null;
      console.log(`Room ${ws.roomId}: phone left`);
      send(room.host, { type: "peer-left" });
    }
  });

  ws.on("error", (error) => {
    console.error("Socket error:", error.message);
  });
});


// -------------------------
// HEARTBEAT: drop half-open sockets
// -------------------------

setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, HEARTBEAT_MS);


// -------------------------
// SESSION EXPIRY
// -------------------------

setInterval(() => {
  const now = Date.now();

  for (const [roomId, room] of rooms) {
    if (room.expiresAt > now) continue;

    for (const ws of [room.host, room.guest]) {
      if (!ws) continue;
      send(ws, { type: "expired" });
      detach(ws);
    }

    rooms.delete(roomId);
    console.log(`Room ${roomId}: expired`);
  }
}, SWEEP_MS);


server.listen(PORT, "0.0.0.0", () => {
  console.log("");
  console.log("=================================");
  console.log(" File Share Server");
  console.log("=================================");
  console.log(`Local: http://localhost:${PORT}`);
  console.log("");
  console.log("Find Mac IP with:");
  console.log("ipconfig getifaddr en0");
  console.log("=================================");
  console.log("");
}); 