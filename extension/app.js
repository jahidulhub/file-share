// app.js

import {
  getOrCreateSession,
  createSession,
  getSession,
  clearSession,
  saveSession,
  isSessionExpired,
  getRemainingTime,
  getPhoneUrl
} from "./js/room.js";

import {
  connectSignaling,
  sendSignal
} from "./js/signaling.js";

import {
  createPeerConnection,
  createDataChannel,
  closePeerConnection,
  createOffer,
  handleOffer,
  handleAnswer,
  handleIceCandidate,
  setDataHandler,
  setConnectionStateHandler
} from "./js/rtc.js";

import {
  handleIncomingFile
} from "./js/fileReceiver.js";

import {
  renderQr,
  setConnectionState,
  showWaiting,
  showConnected,
  showMessage,
  setSessionInfo,
  disconnectButton,
  clearFilesButton,
  clearReceivedList
} from "./js/ui.js";


/* =========================
   Session timer
========================= */

let sessionTimer = null;

let creatingNewSession = false;

/* =========================
   Start
========================= */

async function start() {

  console.log(
    "File Share starting..."
  );


  setDataHandler(
    handleIncomingFile
  );

  setConnectionStateHandler(
    handleWebRTCState
  );

  const session =
    await getOrCreateSession();


  if (!session) {

    showMessage(
      "!",
      "Unable to start",
      "Could not create a session."
    );

    return;
  }


  if (
    isSessionExpired()
  ) {

    showMessage(
      "!",
      "Session expired",
      "Creating a new session..."
    );

    await clearSession();

    return start();

  }


  renderQr(
    getPhoneUrl()
  );


  updateSessionInfo();


  startSessionTimer();


  connectSignaling(
    handleSignal,
    hostSession
  );


  setupEvents();

}


/* =========================
   Host session
========================= */

async function hostSession() {

  const session =
    getSession();


  if (!session) {
    return;
  }


  if (
    isSessionExpired()
  ) {

    await expireSession();

    return;
  }


  console.log(
    "Hosting room:",
    session.roomId
  );


  const sent =
    sendSignal({

      type:
        "host",

      room:
        session.roomId,

      expiresAt:
        session.expiresAt

    });


  if (!sent) {
    return;
  }


  setConnectionState(
    "waiting",
    "Waiting for phone"
  );


  renderQr(
    getPhoneUrl()
  );


  updateSessionInfo();

}


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


    /* -------------------------
       Server accepted host
    ------------------------- */

    case "hosted":

      await handleHosted(
        message
      );

      return;


    /* -------------------------
       Phone joined
    ------------------------- */

    case "peer-joined":

      await handlePeerJoined();

      return;


    /* -------------------------
       Phone left
    ------------------------- */

    case "peer-left":

      handlePeerLeft();

      return;


    /* -------------------------
       Offer
    ------------------------- */

    case "offer":

      await handleOffer(
        message.offer
      );

      return;


    /* -------------------------
       Answer
    ------------------------- */

    case "answer":

      await handleAnswer(
        message.answer
      );

      return;


    /* -------------------------
       ICE
    ------------------------- */

    case "ice-candidate":

      await handleIceCandidate(
        message.candidate
      );

      return;


    /* -------------------------
       Explicit room close
    ------------------------- */

    case "room-closed":

        if (creatingNewSession) {
            return;
        }

        await handleRoomClosed();

        return;


    /* -------------------------
       Room expired
    ------------------------- */

    case "expired":

      await expireSession(
        false
      );

      return;


    /* -------------------------
       Host replaced
    ------------------------- */

    case "replaced":

      closePeerConnection();

      showMessage(
        "!",
        "Opened elsewhere",
        "This session was opened by another Chrome window."
      );

      return;


    /* -------------------------
       Server error
    ------------------------- */

    case "error":

      setConnectionState(
        "error",
        message.message ||
          "Connection error"
      );

      return;


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

      showConnected();

      return;


    case "connecting":

      setConnectionState(
        "connecting",
        "Connecting to phone..."
      );

      return;


    case "disconnected":

      setConnectionState(
        "waiting",
        "Phone disconnected"
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
   Hosted
========================= */

async function handleHosted(
  message
) {

  const session =
    getSession();


  if (!session) {
    return;
  }


  /*
    Server is authoritative
    about the expiry time.
  */

  if (
    Number.isFinite(
      message.expiresAt
    )
  ) {

    session.expiresAt =
      message.expiresAt;

    await saveSession();

  }


  updateSessionInfo();


  showWaiting();

}


/* =========================
   Phone joined
========================= */

async function handlePeerJoined() {

  console.log(
    "Phone joined ✓"
  );


  setConnectionState(
    "connecting",
    "Connecting to phone..."
  );


  /*
    Create the WebRTC connection.
  */

  createPeerConnection();


  /*
    Extension is the offerer.

    The data channel is created
    before creating the offer.
  */

  createDataChannel();


  await createOffer();

}


/* =========================
   Phone left
========================= */

function handlePeerLeft() {

  console.log(
    "Phone disconnected"
  );


  closePeerConnection();


  showWaiting();


  updateSessionInfo();

}


/* =========================
   Room closed
========================= */

async function handleRoomClosed() {

  console.log(
    "Room closed"
  );


  closePeerConnection();


  await clearSession();


  showMessage(
    "✓",
    "Session closed",
    "Your sharing session has been closed."
  );


  stopSessionTimer();

}


/* =========================
   Expire session
========================= */

async function expireSession(
  showMessageView = true
) {

  closePeerConnection();


  await clearSession();


  stopSessionTimer();


  if (
    showMessageView
  ) {

    showMessage(
      "!",
      "Session expired",
      "This sharing session has expired."
    );

  }

}


/* =========================
   Session timer
========================= */

function startSessionTimer() {

  stopSessionTimer();


  updateSessionInfo();


  sessionTimer =
    setInterval(
      () => {

        updateSessionInfo();

      },
      1000
    );

}


function stopSessionTimer() {

  if (
    sessionTimer
  ) {

    clearInterval(
      sessionTimer
    );

    sessionTimer =
      null;

  }

}


/* =========================
   Update session info
========================= */
function updateSessionInfo() {

  const remaining =
    getRemainingTime();


  if (
    remaining <= 0
  ) {

    setSessionInfo(
      ""
    );

    expireSession();

    return;
  }


  const totalSeconds =
    Math.floor(
      remaining / 1000
    );


  const hours =
    Math.floor(
      totalSeconds / 3600
    );


  const minutes =
    Math.floor(
      (
        totalSeconds % 3600
      ) / 60
    );


  const seconds =
    totalSeconds % 60;


  const time =
    [
      String(hours).padStart(
        2,
        "0"
      ),

      String(minutes).padStart(
        2,
        "0"
      ),

      String(seconds).padStart(
        2,
        "0"
      )

    ].join(":");


  setSessionInfo(
    `Session expires in ${time}`
  );

}

/* =========================
   UI events
========================= */

function setupEvents() {
  let confirmTimer = null;

  disconnectButton.addEventListener("click", () => {
    if (!disconnectButton.classList.contains("confirm")) {
      disconnectButton.classList.add("confirm");
      disconnectButton.textContent = "Tap again to end session";
      confirmTimer = setTimeout(resetDisconnectButton, 3000);
      return;
    }
    clearTimeout(confirmTimer);
    resetDisconnectButton();
    disconnectSession();
  });

  newSessionButton.addEventListener("click", disconnectSession);
  clearFilesButton.addEventListener("click", clearReceivedList);
}

function resetDisconnectButton() {
  disconnectButton.classList.remove("confirm");
  disconnectButton.textContent = "Disconnect";
}


/* =========================
   Disconnect
========================= */
async function disconnectSession() {

  console.log(
    "Creating new session"
  );


  creatingNewSession =
    true;


  /*
    Stop the old session timer
    before clearing the session.
  */

  stopSessionTimer();


  sendSignal({
    type:
      "close-room"
  });


  closePeerConnection();


  await clearSession();


  await createSession();


  renderQr(
    getPhoneUrl()
  );


  updateSessionInfo();


  startSessionTimer();


  await hostSession();


  creatingNewSession =
    false;

}


/* =========================
   Start application
========================= */

start();