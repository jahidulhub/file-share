import {
  SIGNALING_URL
} from "./config.js";


import {
  socket,
  setSocket
} from "./state.js";


let messageHandler = null;

let connectedHandler = null;

let reconnectTimer = null;

let reconnectDelay = 1000;

let shouldReconnect = true;

let connecting = false;


export function connectSignaling(
  onMessage,
  onConnected
) {

  messageHandler =
    onMessage;

  connectedHandler =
    onConnected;


  shouldReconnect =
    true;


  if (
    socket &&
    (
      socket.readyState ===
        WebSocket.OPEN ||

      socket.readyState ===
        WebSocket.CONNECTING
    )
  ) {

    return;

  }


  connect();

}


function connect() {

  if (!shouldReconnect) {

    return;

  }


  if (connecting) {

    return;

  }


  if (
    socket &&
    (
      socket.readyState ===
        WebSocket.OPEN ||

      socket.readyState ===
        WebSocket.CONNECTING
    )
  ) {

    return;

  }


  connecting =
    true;


  clearTimeout(
    reconnectTimer
  );


  console.log(
    "Connecting to signaling server:",
    SIGNALING_URL
  );


  const ws =
    new WebSocket(
      SIGNALING_URL
    );


  setSocket(ws);


  ws.onopen = async () => {

    if (ws !== socket) {

      return;

    }


    connecting =
      false;


    reconnectDelay =
      1000;


    console.log(
      "Signaling connected ✓"
    );


    if (connectedHandler) {

      try {

        await connectedHandler();

      } catch (error) {

        console.error(
          "Connected handler error:",
          error
        );

      }

    }

  };


  ws.onmessage = async (
    event
  ) => {

    if (ws !== socket) {

      return;

    }


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
          "Message handler error:",
          error
        );

      }

    }

  };


  ws.onerror = () => {

    if (ws !== socket) {

      return;

    }


    console.error(
      "Signaling connection error"
    );

  };


  ws.onclose = () => {

    if (ws !== socket) {

      return;

    }


    console.log(
      "Signaling disconnected"
    );


    setSocket(null);


    connecting =
      false;


    if (!shouldReconnect) {

      return;

    }


    scheduleReconnect();

  };

}


function scheduleReconnect() {

  if (!shouldReconnect) {

    return;

  }


  clearTimeout(
    reconnectTimer
  );


  console.log(
    `Reconnecting in ${reconnectDelay}ms`
  );


  reconnectTimer =
    setTimeout(
      connect,
      reconnectDelay
    );


  reconnectDelay =
    Math.min(
      reconnectDelay * 2,
      10000
    );

}


export function sendSignal(
  message
) {

  if (
    !socket ||
    socket.readyState !==
      WebSocket.OPEN
  ) {

    console.warn(
      "Cannot send signal. WebSocket is not connected."
    );

    return false;

  }


  socket.send(
    JSON.stringify(message)
  );


  return true;

}


export function disconnectSignaling() {

  shouldReconnect =
    false;


  clearTimeout(
    reconnectTimer
  );


  reconnectTimer =
    null;


  if (socket) {

    const ws =
      socket;


    setSocket(null);


    connecting =
      false;


    ws.close();

  }

}