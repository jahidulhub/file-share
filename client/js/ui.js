// client/js/ui.js


/* =========================
   Elements
========================= */

export const connectionBadge =
  document.getElementById(
    "connectionBadge"
  );


export const connectionText =
  document.getElementById(
    "connectionText"
  );


export const connectionSection =
  document.getElementById(
    "connectionSection"
  );


export const connectionMessage =
  document.getElementById(
    "connectionMessage"
  );


export const transferSection =
  document.getElementById(
    "transferSection"
  );


export const messageSection =
  document.getElementById(
    "messageSection"
  );


export const messageIcon =
  document.getElementById(
    "messageIcon"
  );


export const messageTitle =
  document.getElementById(
    "messageTitle"
  );


export const messageText =
  document.getElementById(
    "messageText"
  );


export const fileInput =
  document.getElementById(
    "fileInput"
  );


export const filesSection =
  document.getElementById(
    "filesSection"
  );


export const fileList =
  document.getElementById(
    "fileList"
  );


export const clearFilesButton =
  document.getElementById(
    "clearFilesButton"
  );


export const disconnectButton =
  document.getElementById(
    "disconnectButton"
  );


/* =========================
   Connection state
========================= */

export function setConnectionState(
  state,
  text
) {

  connectionBadge.dataset.state =
    state;


  connectionText.textContent =
    text;


  if (
    state ===
    "connected"
  ) {

    connectionSection.hidden =
      true;

    transferSection.hidden =
      false;

    messageSection.hidden =
      true;

    return;

  }


  if (
    state ===
      "connecting" ||
    state ===
      "waiting"
  ) {

    connectionSection.hidden =
      false;

    transferSection.hidden =
      true;

    messageSection.hidden =
      true;

    connectionMessage.textContent =
      text;

    return;

  }


  if (
    state ===
      "offline" ||
    state ===
      "error"
  ) {

    connectionSection.hidden =
      true;

    transferSection.hidden =
      true;

    messageSection.hidden =
      false;

    showMessage(
      "!",
      "Connection ended",
      text
    );

  }

}


/* =========================
   Show message
========================= */

export function showMessage(
  icon,
  title,
  text
) {

  messageIcon.textContent =
    icon;


  messageTitle.textContent =
    title;


  messageText.textContent =
    text;


  connectionSection.hidden =
    true;


  transferSection.hidden =
    true;


  messageSection.hidden =
    false;

}


/* =========================
   File size
========================= */

function formatSize(
  bytes
) {

  if (
    bytes <
    1024
  ) {

    return (
      bytes +
      " B"
    );

  }


  if (
    bytes <
    1024 *
    1024
  ) {

    return (
      Math.round(
        bytes / 1024
      ) +
      " KB"
    );

  }


  if (
    bytes <
    1024 *
    1024 *
    1024
  ) {

    return (
      (
        bytes /
        1024 /
        1024
      ).toFixed(1) +
      " MB"
    );

  }


  return (
    (
      bytes /
      1024 /
      1024 /
      1024
    ).toFixed(1) +
    " GB"
  );

}


/* =========================
   File icon
========================= */

function fileIcon(
  mime
) {

  if (
    mime.startsWith(
      "image/"
    )
  ) {

    return "🖼️";

  }


  if (
    mime ===
    "application/pdf"
  ) {

    return "📕";

  }


  if (
    mime.startsWith(
      "video/"
    )
  ) {

    return "🎞️";

  }


  if (
    mime.startsWith(
      "audio/"
    )
  ) {

    return "🎵";

  }


  return "📄";

}

/* =========================
   Add sent file
========================= */

export function addSentRow({
  file
}) {

  const row =
    document.createElement(
      "div"
    );


  row.className =
    "file-item receiving";


  row.innerHTML = `
    <div class="thumb"></div>

    <div class="meta">

      <div class="name"></div>

      <div class="sub"></div>

      <div class="progress">
        <div class="progress-bar"></div>
      </div>

    </div>

    <div class="state"></div>
  `;


  const thumb =
    row.querySelector(
      ".thumb"
    );


  const nameElement =
    row.querySelector(
      ".name"
    );


  const sub =
    row.querySelector(
      ".sub"
    );


  const bar =
    row.querySelector(
      ".progress-bar"
    );


  const state =
    row.querySelector(
      ".state"
    );


  const sizeText =
    formatSize(
      file.size
    );


  nameElement.textContent =
    file.name;


  sub.textContent =
    `${sizeText} · Sending`;


  /* =========================
     Image preview
  ========================= */

  if (
    file.type.startsWith(
      "image/"
    )
  ) {

    const url =
      URL.createObjectURL(
        file
      );


    const image =
      document.createElement(
        "img"
      );


    image.src =
      url;

    image.alt =
      "";


    thumb.appendChild(
      image
    );


    /*
      Keep the object URL alive
      while the file row exists.
    */

    row.dataset.previewUrl =
      url;

  } else {

    thumb.textContent =
      fileIcon(
        file.type ||
        "application/octet-stream"
      );

  }


  fileList.prepend(
    row
  );


  filesSection.hidden =
    false;


  return {

    setProgress(
      percent
    ) {

      bar.style.width =
        percent +
        "%";


      sub.textContent =
        `${sizeText} · ${percent}%`;

    },


    done() {

      row.classList.remove(
        "receiving"
      );


      row.classList.add(
        "done"
      );


      state.textContent =
        "✓";


      sub.textContent =
        `${sizeText} · Sent`;

    },


    fail(
      reason
    ) {

      row.classList.remove(
        "receiving"
      );


      row.classList.add(
        "failed"
      );


      state.textContent =
        "!";


      sub.textContent =
        `Failed · ${reason}`;

    }

  };

}

/* =========================
   Add received file row
========================= */

export function addReceivedRow({
  name: fileName,
  size,
  mime
}) {

  const row =
    document.createElement(
      "div"
    );


  row.className =
    "file-item receiving";


  row.innerHTML = `

    <div class="thumb"></div>

    <div class="meta">

      <div class="name"></div>

      <div class="sub"></div>

      <div class="progress">

        <div
          class="progress-bar"
        ></div>

      </div>

    </div>

    <div class="state"></div>

  `;


  const thumb =
    row.querySelector(
      ".thumb"
    );


  const nameElement =
    row.querySelector(
      ".name"
    );


  const sub =
    row.querySelector(
      ".sub"
    );


  const bar =
    row.querySelector(
      ".progress-bar"
    );


  const state =
    row.querySelector(
      ".state"
    );


  const sizeText =
    formatSize(
      size
    );


  thumb.textContent =
    fileIcon(
      mime
    );


  nameElement.textContent =
    fileName;


  sub.textContent =
    sizeText;


  fileList.prepend(
    row
  );


  filesSection.hidden =
    false;


  return {

    setProgress(
      percent
    ) {

      bar.style.width =
        percent +
        "%";


      sub.textContent =
        `${sizeText} · ${percent}%`;

    },


    done() {

      row.classList.remove(
        "receiving"
      );


      row.classList.add(
        "done"
      );


      state.textContent =
        "✓";


      sub.textContent =
        `${sizeText} · Downloaded`;

    },


    fail(
      reason
    ) {

      row.classList.remove(
        "receiving"
      );


      row.classList.add(
        "failed"
      );


      state.textContent =
        "!";


      sub.textContent =
        `Failed · ${reason}`;

    }

  };

}


/* =========================
   Clear received files
========================= */

export function clearReceivedList() {

  fileList
    .querySelectorAll(
      ".file-item:not(.receiving)"
    )
    .forEach(
      (row) => {

        row.remove();

      }
    );


  filesSection.hidden =
    fileList.children.length ===
    0;

}