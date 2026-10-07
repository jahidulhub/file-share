import {
  SESSION_MS,
  CLOCK_SLACK_MS,
  ID_PATTERN
} from "../config.js";

import {
  getRoom,
  createRoom,
  deleteRoom
} from "../rooms.js";

import {
  send,
  sendError,
  detach
} from "../signaling.js";


export function handleHost(
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


  if (
    typeof roomId !== "string" ||
    !ID_PATTERN.test(roomId)
  ) {
    sendError(
      ws,
      "bad-room",
      "Invalid room ID"
    );

    return;
  }


  const now =
    Date.now();

  let expiresAt =
    Number(message.expiresAt);


  if (
    !Number.isFinite(expiresAt) ||
    expiresAt <= now
  ) {
    sendError(
      ws,
      "expired",
      "Session expired"
    );

    return;
  }


  if (
    expiresAt >
    now +
    SESSION_MS +
    CLOCK_SLACK_MS
  ) {
    expiresAt =
      now + SESSION_MS;
  }


  let room =
    getRoom(roomId);

  let isReconnect = false;


  if (room) {

    // The room already exists.
    // If there is no current host,
    // this is a reconnection.

    isReconnect =
      room.host === null;


    // Another host is currently using
    // this room. Newest connection wins.

    if (
      room.host &&
      room.host !== ws
    ) {
      sendError(
        room.host,
        "replaced",
        "Opened in another window"
      );

      detach(
        room.host,
        true
      );
    }

  } else {

    room =
      createRoom(
        roomId,
        expiresAt
      );
  }


  room.host = ws;


  ws.role = "host";
  ws.roomId = roomId;


  clearTimeout(
    ws.joinTimer
  );


  if (isReconnect) {

    console.log(
      `[ROOM ${roomId}] Host reconnected`
    );

  } else {

    console.log(
      `[ROOM ${roomId}] Host connected`
    );
  }


  send(ws, {
    type: "hosted",
    room: roomId,
    expiresAt: room.expiresAt,
    phone: Boolean(room.guest)
  });


  // Phone was already waiting.

  if (room.guest) {

    send(
      room.guest,
      {
        type: "host-joined"
      }
    );

    send(
      ws,
      {
        type: "peer-joined"
      }
    );
  }
}


export function handleCloseRoom(ws) {
  if (ws.role !== "host") {

    sendError(
      ws,
      "not-host",
      "Only the host can close the room"
    );

    return;
  }


  const roomId =
    ws.roomId;

  const room =
    getRoom(roomId);


  if (room) {

    if (room.guest) {

      send(
        room.guest,
        {
          type: "revoked"
        }
      );

      detach(
        room.guest
      );
    }


    deleteRoom(roomId);
  }


  console.log(
    `[ROOM ${roomId}] Closed by host`
  );


  ws.role = null;
  ws.roomId = null;


  send(
    ws,
    {
      type: "room-closed"
    }
  );
}