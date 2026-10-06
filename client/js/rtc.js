// client/js/rtc.js

import {
  peerConnection,
  setPeerConnection
} from "./state.js";

import {
  sendSignal
} from "./signaling.js";


let dataChannel = null;

let dataHandler = null;

let connectionStateHandler =
  null;

let pendingIceCandidates = [];


/* =========================
   Data handler
========================= */

export function setDataHandler(
  handler
) {

  dataHandler =
    handler;

}


/* =========================
   Connection state handler
========================= */

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


  setPeerConnection(
    pc
  );


  /* =========================
     ICE candidates
  ========================= */

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


  /* =========================
     Connection state
  ========================= */

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


  /* =========================
     Data channel
  ========================= */

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


  await addPendingIceCandidates();


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
   Handle ICE candidate
========================= */

export async function handleIceCandidate(
  candidate
) {

  if (!peerConnection) {

    pendingIceCandidates.push(
      candidate
    );

    return;

  }


  if (
    !peerConnection.remoteDescription
  ) {

    pendingIceCandidates.push(
      candidate
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
   Add queued ICE
========================= */

async function addPendingIceCandidates() {

  if (!peerConnection) {

    return;

  }


  if (
    !peerConnection.remoteDescription
  ) {

    return;

  }


  const candidates =
    pendingIceCandidates;


  pendingIceCandidates =
    [];


  for (
    const candidate
    of candidates
  ) {

    try {

      await peerConnection.addIceCandidate(
        candidate
      );

    } catch (error) {

      console.error(
        "Failed to add queued ICE candidate:",
        error
      );

    }

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

  pendingIceCandidates =
    [];


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