// client/js/app.js

import {
  roomFromUrl
} from "./config.js";

import {
  peerConnection
} from "./state.js";

import {
  createPeerConnection,
  closePeerConnection,
  handleOffer,
  handleIceCandidate,
  setDataHandler,
  setConnectionStateHandler
} from "./rtc.js";

import {
  connectSignalingServer
} from "./signaling.js";

import {
  setupEvents
} from "./events.js";

import {
  handleIncomingFile
} from "./fileReceiver.js";

import {
  setConnectionState,
  showMessage
} from "./ui.js";


/* =========================
   Signaling messages
========================= */

async function handleSignal(
  message
) {

  console.log(
    "Signal:",
    message.type
  );


  switch (
    message.type
  ) {

    /* =====================
       Joined room
    ===================== */

    case "joined":

      if (
        message.host
      ) {

        setConnectionState(
          "connecting",
          "Waiting for Chrome..."
        );

      } else {

        setConnectionState(
          "waiting",
          "Waiting for Chrome..."
        );

      }

      return;


    /* =====================
       Chrome joined
    ===================== */

    case "host-joined":

      console.log(
        "Chrome joined ✓"
      );


      setConnectionState(
        "connecting",
        "Connecting to Chrome..."
      );


      if (
        peerConnection &&
        [
          "closed",
          "failed"
        ].includes(
          peerConnection.connectionState
        )
      ) {

        closePeerConnection();

      }


      if (
        !peerConnection
      ) {

        createPeerConnection();

      }


      return;


    /* =====================
       Offer from Chrome
    ===================== */

    case "offer":

      console.log(
        "Offer received from Chrome"
      );


      setConnectionState(
        "connecting",
        "Connecting to Chrome..."
      );


      await handleOffer(
        message.offer
      );


      return;

    /* =====================
       ICE candidate
    ===================== */

    case "ice-candidate":

      await handleIceCandidate(
        message.candidate
      );


      return;


    /* =====================
       Chrome disconnected
    ===================== */

    case "host-left":

      console.log(
        "Chrome disconnected"
      );


      closePeerConnection();


      setConnectionState(
        "offline",
        "Chrome disconnected"
      );


      return;


    /* =====================
       Session closed
    ===================== */

    case "revoked":

      closePeerConnection();


      showMessage(
        "✓",
        "Session closed",
        "The sharing session was closed."
      );


      return;


    /* =====================
       Session expired
    ===================== */

    case "expired":

      closePeerConnection();


      showMessage(
        "!",
        "Session expired",
        "This sharing session has expired."
      );


      return;


    /* =====================
       Another device/window
    ===================== */

    case "replaced":

      closePeerConnection();


      showMessage(
        "!",
        "Opened elsewhere",
        "This session was opened somewhere else."
      );


      return;


    /* =====================
       Server error
    ===================== */

    case "error":

      setConnectionState(
        "error",
        message.message ||
          "Connection error"
      );


      return;


    /* =====================
       Unknown message
    ===================== */

    default:

      console.warn(
        "Unknown signal:",
        message
      );

  }

}

/* =========================
   WebRTC state
========================= */

function handleWebRTCState(
  state
) {

  switch (state) {

    case "connected":

      setConnectionState(
        "connected",
        "Connected"
      );

      return;


    case "connecting":

      setConnectionState(
        "connecting",
        "Connecting to Chrome..."
      );

      return;


    case "disconnected":

      setConnectionState(
        "offline",
        "Chrome disconnected"
      );

      return;


    case "failed":

      setConnectionState(
        "error",
        "Connection failed"
      );

      return;

  }

}



/* =========================
   Disconnect locally
========================= */

function disconnect() {

  closePeerConnection();


  setConnectionState(
    "offline",
    "Session closed"
  );

}


/* =========================
   Start application
========================= */

function start() {

  console.log(
    "File Share starting..."
  );


  /* =====================
     File receiver
  ===================== */

  setDataHandler(
    handleIncomingFile
  );

  setConnectionStateHandler(
    handleWebRTCState
  );

  /* =====================
     User events
  ===================== */

  setupEvents(
    disconnect
  );


  /* =====================
     Check room
  ===================== */

  if (!roomFromUrl) {

    showMessage(
      "!",
      "Invalid connection",
      "This connection link is missing a room."
    );


    return;

  }


  /* =====================
     Start signaling
  ===================== */

  setConnectionState(
    "connecting",
    "Connecting..."
  );


  connectSignalingServer(
    handleSignal
  );

}


start();