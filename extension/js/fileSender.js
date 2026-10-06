// js/fileSender.js

import {
  createDataChannel,
  getDataChannel
} from "./rtc.js";


const CHUNK_SIZE =
  16 * 1024;


/* =========================
   Send file
========================= */

export async function sendFile(
  file
) {

  if (!file) {
    return;
  }


  let channel =
    getDataChannel();


  if (!channel) {

    channel =
      createDataChannel();

  }


  if (
    channel.readyState !==
    "open"
  ) {

    throw new Error(
      "File transfer connection is not ready."
    );

  }


  /* -------------------------
     Send file metadata
  ------------------------- */

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


  /* -------------------------
     Send file chunks
  ------------------------- */

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


    /*
      Give the browser a chance
      to process the data channel.

      This prevents large files
      from flooding the channel.
    */

    if (
      channel.bufferedAmount >
      4 * 1024 * 1024
    ) {

      await waitForBuffer(
        channel
      );

    }

  }


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