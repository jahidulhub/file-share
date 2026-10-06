// client/js/signaling.js

import {
  socket,
  setSocket
} from "./state.js";

import {
  roomFromUrl
} from "./config.js";


let messageHandler = null;


/* =========================
   Device ID
========================= */

function getDeviceId() {
  let deviceId =
    localStorage.getItem(
      "file-share-device-id"
    );

  if (!deviceId) {
    const bytes =
      crypto.getRandomValues(
        new Uint8Array(16)
      );

    deviceId =
      Array.from(
        bytes,
        (byte) =>
          byte
            .toString(16)
            .padStart(2, "0")
      ).join("");

    localStorage.setItem(
      "file-share-device-id",
      deviceId
    );
  }

  return deviceId;
}


/* =========================
   Send signal
========================= */

export function sendSignal(
  message
) {

  if (
    socket &&
    socket.readyState ===
      WebSocket.OPEN
  ) {

    socket.send(
      JSON.stringify(
        message
      )
    );

    return true;

  }


  console.warn(
    "Cannot send signal. WebSocket is not connected."
  );

  return false;

}


/* =========================
   Connect
========================= */

export function connectSignalingServer(
  onMessage
) {

  messageHandler =
    onMessage;


  const protocol =
    location.protocol ===
      "https:"
      ? "wss:"
      : "ws:";


  const socketUrl =
    `${protocol}//${location.host}`;


  console.log(
    "Connecting to signaling server:",
    socketUrl
  );


  const ws =
    new WebSocket(
      socketUrl
    );


  setSocket(
    ws
  );


  ws.onopen =
    () => {

      console.log(
        "Signaling connected ✓"
      );


      sendSignal({

        type:
          "join",

        room:
          roomFromUrl,

        device:
          getDeviceId()

      });

    };


  ws.onmessage =
    async (event) => {

      let message;


      try {

        message =
          JSON.parse(
            event.data
          );

      } catch (error) {

        console.error(
          "Invalid signaling message:",
          event.data
        );

        return;

      }


      console.log(
        "Signal:",
        message.type
      );


      if (messageHandler) {

        try {

          await messageHandler(
            message
          );

        } catch (error) {

          console.error(
            "Signal handler error:",
            error
          );

        }

      }

    };


  ws.onerror =
    (error) => {

      console.error(
        "Signaling connection error:",
        error
      );

    };


  ws.onclose =
    () => {

      console.log(
        "Signaling connection closed"
      );

      setSocket(
        null
      );

    };


  return ws;

}