import {
  JOIN_TIMEOUT_MS
} from "./config.js";

import {
  getRoom
} from "./rooms.js";

import {
  send,
  sendError,
  relay
} from "./signaling.js";

import {
  handleHost,
  handleCloseRoom
} from "./handlers/host.js";

import {
  handleJoin
} from "./handlers/guest.js";


export function setupWebSocket(
  wss
) {

  wss.on(
    "connection",
    (ws) => {

      ws.isAlive = true;
      ws.role = null;
      ws.roomId = null;
      ws.detached = false;


      ws.joinTimer =
        setTimeout(() => {

          if (!ws.role) {
            ws.terminate();
          }

        }, JOIN_TIMEOUT_MS);


      ws.on(
        "pong",
        () => {
          ws.isAlive = true;
        }
      );


      ws.on(
        "message",
        (raw) => {

          let message;


          try {

            message =
              JSON.parse(
                raw.toString()
              );

          } catch {

            sendError(
              ws,
              "invalid-message",
              "Invalid message"
            );

            return;
          }


          switch (
            message.type
          ) {

            case "host":

              handleHost(
                ws,
                message
              );

              break;


            case "join":

              handleJoin(
                ws,
                message
              );

              break;


            case "close-room":

              handleCloseRoom(
                ws
              );

              break;


            case "offer":
            case "answer":
            case "ice-candidate":

              handleRelayMessage(
                ws,
                message
              );

              break;
          }
        }
      );


      ws.on(
        "close",
        () => {

          clearTimeout(
            ws.joinTimer
          );


          if (
            ws.detached ||
            !ws.role
          ) {
            return;
          }


          const room =
            getRoom(
              ws.roomId
            );


          if (!room) {
            return;
          }


          // Host disconnected.

          if (
            ws.role === "host" &&
            room.host === ws
          ) {

            room.host =
              null;


            console.log(
              `[ROOM ${ws.roomId}] Host disconnected`
            );


            send(
              room.guest,
              {
                type:
                  "host-left"
              }
            );
          }


          // Phone disconnected.

          if (
            ws.role === "guest" &&
            room.guest === ws
          ) {

            room.guest =
              null;

            room.guestDevice =
              null;


            console.log(
              `[ROOM ${ws.roomId}] Phone disconnected`
            );


            send(
              room.host,
              {
                type:
                  "peer-left"
              }
            );
          }
        }
      );


      ws.on(
        "error",
        (error) => {

          console.error(
            "[SOCKET ERROR]",
            error.message
          );

        }
      );
    }
  );
}


function handleRelayMessage(
  ws,
  message
) {

  const room =
    getRoom(
      ws.roomId
    );


  if (!room) {
    return;
  }


  relay(
    ws,
    message,
    room
  );
}