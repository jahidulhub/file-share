// js/fileReceiver.js

import {
  addReceivedRow
} from "./ui.js";


let currentFile =
  null;


/* =========================
   Handle incoming data
========================= */

export async function handleIncomingFile(
  data
) {

  if (
    typeof data ===
    "string"
  ) {

    handleMetadata(
      data
    );

    return;
  }


  if (
    data instanceof ArrayBuffer
  ) {

    handleChunk(
      data
    );

    return;
  }


  if (
    data instanceof Blob
  ) {

    const buffer =
      await data.arrayBuffer();

    handleChunk(
      buffer
    );

    return;
  }


  console.warn(
    "Unknown file data:",
    data
  );

}


/* =========================
   File metadata
========================= */

function handleMetadata(
  data
) {

  let message;


  try {

    message =
      JSON.parse(
        data
      );

  } catch {

    console.error(
      "Invalid file metadata"
    );

    return;
  }


  if (
    message.type !==
    "file-start"
  ) {

    console.warn(
      "Unknown file message:",
      message
    );

    return;
  }


  console.log(
    "Receiving:",
    message.name
  );


  const row =
    addReceivedRow({
      name:
        message.name,

      size:
        message.size,

      mime:
        message.mime ||
        "application/octet-stream"
    });


  currentFile = {

    name:
      message.name,

    size:
      message.size,

    mime:
      message.mime ||
      "application/octet-stream",

    received:
      0,

    chunks:
      [],

    row

  };

}


/* =========================
   File chunk
========================= */

function handleChunk(
  data
) {

  if (!currentFile) {

    console.warn(
      "Received file chunk without metadata"
    );

    return;
  }


  currentFile.chunks.push(
    data
  );


  currentFile.received +=
    data.byteLength;


  const percent =
    Math.min(
      100,

      Math.round(
        currentFile.received /
        currentFile.size *
        100
      )
    );


  currentFile.row.setProgress(
    percent
  );


  if (
    currentFile.received >=
    currentFile.size
  ) {

    finishFile();

  }

}

/* =========================
   Finish file
========================= */

function finishFile() {

  if (!currentFile) {
    return;
  }


  const file =
    new Blob(
      currentFile.chunks,
      {
        type:
          currentFile.mime
      }
    );


  const url =
    URL.createObjectURL(
      file
    );


  /* =========================
     Image preview
  ========================= */

  if (
    currentFile.mime.startsWith(
      "image/"
    )
  ) {

    currentFile.row.setPreview(
      url
    );

  }


  /* =========================
     Download
  ========================= */

  const link =
    document.createElement(
      "a"
    );


  link.href =
    url;

  link.download =
    currentFile.name;


  document.body.appendChild(
    link
  );

  link.click();

  link.remove();


  /* =========================
     Cleanup
  ========================= */

  setTimeout(
    () => {

      URL.revokeObjectURL(
        url
      );

    },
    1000
  );


  currentFile.row.done();


  console.log(
    "File received:",
    currentFile.name
  );


  currentFile =
    null;

}