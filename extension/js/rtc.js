// js/rtc.js

import {
  peerConnection,
  setPeerConnection
} from "./state.js";

import {
  sendSignal
} from "./signaling.js";


let dataChannel = null;

let dataHandler = null;


/* =========================
   Data handler
========================= */

export function setDataHandler(
  handler
) {
  dataHandler =
    handler;
}

let connectionStateHandler = null;

export function setConnectionStateHandler(
  handler
) {
  connectionStateHandler =
    handler;
}


/* =========================
   Create peer connection
========================= */

export function createPeerConnection() {

  if (peerConnection) {
    return peerConnection;
  }

  const pc =
    new RTCPeerConnection({
      iceServers: [
        {
          urls:
            "stun:stun.l.google.com:19302"
        }
      ]
    });

  setPeerConnection(pc);


  /* ICE candidate */

  pc.onicecandidate =
    (event) => {

      if (!event.candidate) {
        return;
      }

      sendSignal({
        type:
          "ice-candidate",

        candidate:
          event.candidate
      });

    };


  /* Connection state */

  pc.onconnectionstatechange =
  () => {

    console.log(
      "WebRTC:",
      pc.connectionState
    );

    if (
      connectionStateHandler
    ) {

      connectionStateHandler(
        pc.connectionState
      );

    }

  };


  /* Phone creates the data channel */

  pc.ondatachannel =
    (event) => {

      console.log(
        "Data channel received"
      );

      setupDataChannel(
        event.channel
      );

    };


  return pc;
}


/* =========================
   Create data channel
========================= */

export function createDataChannel(
  label = "file-transfer"
) {

  const pc =
    createPeerConnection();

  if (dataChannel) {
    return dataChannel;
  }

  dataChannel =
    pc.createDataChannel(
      label
    );

  setupDataChannel(
    dataChannel
  );

  return dataChannel;
}


/* =========================
   Setup data channel
========================= */

function setupDataChannel(
  channel
) {

  dataChannel =
    channel;

  channel.binaryType =
    "arraybuffer";


  channel.onopen =
    () => {

      console.log(
        "Data channel connected ✓"
      );

    };


  channel.onclose =
    () => {

      console.log(
        "Data channel closed"
      );

      if (
        dataChannel ===
        channel
      ) {
        dataChannel =
          null;
      }

    };


  channel.onerror =
    (error) => {

      console.error(
        "Data channel error:",
        error
      );

    };


  channel.onmessage =
    async (event) => {

      if (!dataHandler) {
        return;
      }

      try {

        await dataHandler(
          event.data
        );

      } catch (error) {

        console.error(
          "Data handler error:",
          error
        );

      }

    };

}


/* =========================
   Create offer
========================= */

export async function createOffer() {

  const pc =
    createPeerConnection();

  const offer =
    await pc.createOffer();

  await pc.setLocalDescription(
    offer
  );

  sendSignal({
    type:
      "offer",

    offer:
      pc.localDescription
  });

}


/* =========================
   Handle offer
========================= */

export async function handleOffer(
  offer
) {

  const pc =
    createPeerConnection();

  await pc.setRemoteDescription(
    offer
  );

  const answer =
    await pc.createAnswer();

  await pc.setLocalDescription(
    answer
  );

  sendSignal({
    type:
      "answer",

    answer:
      pc.localDescription
  });

}


/* =========================
   Handle answer
========================= */

export async function handleAnswer(
  answer
) {

  if (!peerConnection) {
    console.warn(
      "No peer connection for answer"
    );

    return;
  }

  await peerConnection.setRemoteDescription(
    answer
  );

}


/* =========================
   Handle ICE candidate
========================= */

export async function handleIceCandidate(
  candidate
) {

  if (!peerConnection) {
    console.warn(
      "No peer connection for ICE candidate"
    );

    return;
  }

  try {

    await peerConnection.addIceCandidate(
      candidate
    );

  } catch (error) {

    console.error(
      "Failed to add ICE candidate:",
      error
    );

  }

}


/* =========================
   Get data channel
========================= */

export function getDataChannel() {
  return dataChannel;
}


/* =========================
   Send data
========================= */

export function sendData(
  data
) {

  if (
    !dataChannel ||
    dataChannel.readyState !==
      "open"
  ) {

    console.warn(
      "Data channel is not open"
    );

    return false;
  }

  dataChannel.send(
    data
  );

  return true;
}


/* =========================
   Close connection
========================= */

export function closePeerConnection() {

  if (dataChannel) {

    dataChannel.close();

    dataChannel =
      null;

  }

  if (peerConnection) {

    peerConnection.close();

    setPeerConnection(
      null
    );

  }

}