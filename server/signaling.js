import { WebSocket } from "ws";


const RELAY_FIELDS = {
  offer: "offer",
  answer: "answer",
  "ice-candidate": "candidate"
};


export function send(ws, message) {
  if (
    ws &&
    ws.readyState === WebSocket.OPEN
  ) {
    ws.send(
      JSON.stringify(message)
    );
  }
}


export function sendError(
  ws,
  code,
  message
) {
  send(ws, {
    type: "error",
    code,
    message
  });
}


export function detach(
  ws,
  terminate = false
) {
  if (!ws) {
    return;
  }

  ws.detached = true;

  if (terminate) {
    ws.terminate();
  } else {
    ws.close(1000);
  }
}


function getOtherSide(
  room,
  ws
) {
  return ws.role === "host"
    ? room.guest
    : room.host;
}


export function relay(
  ws,
  message,
  room
) {
  if (!ws.role) {
    return;
  }

  const target =
    getOtherSide(room, ws);

  if (!target) {
    return;
  }

  const field =
    RELAY_FIELDS[message.type];

  if (!field) {
    return;
  }

  send(target, {
    type: message.type,
    [field]: message[field]
  });
}