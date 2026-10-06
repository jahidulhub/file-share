// client/js/fileSender.js

import {
  createPeerConnection,
  getDataChannel
} from "./rtc.js";

import {
  addSentRow
} from "./ui.js";


const CHUNK_SIZE =
  16 * 1024;


export async function sendFile(
  file
) {

  if (!file) {

    return;

  }


  let channel =
    getDataChannel();


  if (!channel) {

    createPeerConnection();

    channel =
      getDataChannel();

  }


  if (
    !channel ||
    channel.readyState !==
      "open"
  ) {

    throw new Error(
      "File transfer connection is not ready."
    );

  }


  /* =========================
     Add file to UI
  ========================= */

  const row =
    addSentRow({
      file
    });


  /* =========================
     Send file metadata
  ========================= */

  channel.send(

    JSON.stringify({

      type:
        "file-start",

      name:
        file.name,

      size:
        file.size,

      mime:
        file.type ||
        "application/octet-stream"

    })

  );


  /* =========================
     Send file chunks
  ========================= */

  let offset =
    0;


  while (
    offset <
    file.size
  ) {

    const chunk =
      file.slice(
        offset,
        offset +
          CHUNK_SIZE
      );


    const buffer =
      await chunk.arrayBuffer();


    channel.send(
      buffer
    );


    offset +=
      buffer.byteLength;


    /* =========================
       Update progress
    ========================= */

    const percent =
      Math.min(

        100,

        Math.round(

          offset /
          file.size *
          100

        )

      );


    row.setProgress(
      percent
    );


    /* =========================
       Backpressure
    ========================= */

    if (
      channel.bufferedAmount >
      4 * 1024 * 1024
    ) {

      await waitForBuffer(
        channel
      );

    }

  }


  /* =========================
     Transfer complete
  ========================= */

  row.done();


  console.log(
    "File sent:",
    file.name
  );

}


/* =========================
   Wait for buffer
========================= */

function waitForBuffer(
  channel
) {

  return new Promise(
    (resolve) => {

      const check =
        () => {

          if (
            channel.bufferedAmount <=
            1 * 1024 * 1024
          ) {

            resolve();

            return;

          }


          setTimeout(
            check,
            20
          );

        };


      check();

    }
  );

}