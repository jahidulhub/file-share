// client/js/events.js

import {
  fileInput,
  clearFilesButton,
  disconnectButton,
  clearReceivedList
} from "./ui.js";

import {
  sendFile
} from "./fileSender.js";

import {
  acquireWakeLock,
  releaseWakeLock
} from "./wakeLock.js";


let disconnectHandler =
  null;


/* =========================
   Setup events
========================= */

export function setupEvents(
  onDisconnect
) {

  disconnectHandler =
    onDisconnect;


  fileInput.addEventListener(
    "change",
    handleFileSelection
  );


  clearFilesButton.addEventListener(
    "click",
    handleClearFiles
  );


  disconnectButton.addEventListener(
    "click",
    handleDisconnect
  );

}


/* =========================
   File selection
========================= */

async function handleFileSelection(
  event
) {

  const files =
    Array.from(
      event.target.files || []
    );


  if (
    files.length ===
    0
  ) {

    return;

  }


  acquireWakeLock();


  try {

    for (
      const file
      of files
    ) {

      try {

        console.log(
          "Sending:",
          file.name
        );


        await sendFile(
          file
        );


        console.log(
          "Sent:",
          file.name
        );

      } catch (error) {

        console.error(
          "Failed to send file:",
          file.name,
          error
        );

      }

    }

  } finally {

    releaseWakeLock();

  }


  /*
    Reset the input so the user
    can choose the same file again.
  */

  fileInput.value =
    "";

}


/* =========================
   Clear file list
========================= */

function handleClearFiles() {

  clearReceivedList();

}


/* =========================
   Disconnect
========================= */

function handleDisconnect() {

  releaseWakeLock();


  if (
    disconnectHandler
  ) {

    disconnectHandler();

  }

}