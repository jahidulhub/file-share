import {
  ID_PATTERN
} from "../config.js";

import {
  getRoom
} from "../rooms.js";

import {
  send,
  sendError,
  detach
} from "../signaling.js";


export function handleJoin(
  ws,
  message
) {
  if (ws.role) {

    sendError(
      ws,
      "already-joined",
      "This connection already has a room"
    );

    return;
  }


  const roomId =
    message.room;

  const device =
    message.device;


  if (
    typeof roomId !== "string" ||
    !ID_PATTERN.test(roomId) ||
    typeof device !== "string" ||
    !ID_PATTERN.test(device)
  ) {

    sendError(
      ws,
      "bad-room",
      "Invalid connection link"
    );

    detach(ws);

    return;
  }


  const room =
    getRoom(roomId);


  if (!room) {

    sendError(
      ws,
      "not-found",
      "Session not found"
    );

    detach(ws);

    return;
  }


  if (
    room.expiresAt <= Date.now()
  ) {

    sendError(
      ws,
      "expired",
      "Session expired"
    );

    detach(ws);

    return;
  }


  if (room.guest) {

    if (
      room.guestDevice === device
    ) {

      // Same phone returned.
      // New connection wins.

      sendError(
        room.guest,
        "replaced",
        "Opened in another tab"
      );

      detach(
        room.guest,
        true
      );

    } else {

      sendError(
        ws,
        "busy",
        "Another phone is already connected"
      );

      detach(ws);

      return;
    }
  }


  room.guest =
    ws;

  room.guestDevice =
    device;


  ws.role =
    "guest";

  ws.roomId =
    roomId;


  clearTimeout(
    ws.joinTimer
  );


  console.log(
    `[ROOM ${roomId}] Phone connected`
  );


  send(ws, {
    type: "joined",
    room: roomId,
    expiresAt: room.expiresAt,
    host: Boolean(room.host)
  });


  if (room.host) {

    send(
      room.host,
      {
        type: "peer-joined"
      }
    );
  }
}