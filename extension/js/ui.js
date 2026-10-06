// js/ui.js


/* =========================
   Elements
========================= */

export const qrElement =
  document.getElementById(
    "qr"
  );


export const connectionBadge =
  document.getElementById(
    "connectionBadge"
  );


export const connectionText =
  document.getElementById(
    "connectionText"
  );


export const qrSection =
  document.getElementById(
    "qrSection"
  );


export const connectedSection =
  document.getElementById(
    "connectedSection"
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


export const sessionInfoElement =
  document.getElementById(
    "sessionInfo"
  );


export const disconnectButton =
  document.getElementById(
    "disconnectButton"
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

export const newSessionButton = document.getElementById("newSessionButton");

/* =========================
   Views
========================= */

const views = {

  qr:
    qrSection,

  connected:
    connectedSection,

  message:
    messageSection

};


export function showView(
  viewName
) {

  for (
    const [
      key,
      element
    ]
    of Object.entries(
      views
    )
  ) {

    element.hidden =
      key !== viewName;

  }

}


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

}


/* =========================
   Messages
========================= */

export function showMessage(
  icon,
  title,
  text
) {

  disconnectButton.hidden =
    true;

  messageIcon.textContent =
    icon;

  messageIcon.dataset.tone =
    icon === "✓" ? "success" : "error";

  messageTitle.textContent =
    title;

  messageText.textContent =
    text;

  showView(
    "message"
  );
}


/* =========================
   Waiting
========================= */

export function showWaiting() {

  setConnectionState(
    "waiting",
    "Waiting for phone"
  );

  disconnectButton.hidden =
    true;

  disconnectButton.disabled =
    false;

  showView(
    "qr"
  );

}


/* =========================
   Connected
========================= */

export function showConnected() {

  setConnectionState(
    "connected",
    "Phone connected"
  );

  disconnectButton.hidden =
    false;

  disconnectButton.disabled =
    false;

  showView(
    "connected"
  );

}


/* =========================
   Session information
========================= */

export function setSessionInfo(
  text
) {

  sessionInfoElement.textContent =
    text;

  sessionInfoElement.hidden =
    !text;

}


/* =========================
   QR code
========================= */

export function renderQr(
  url
) {

  qrElement.innerHTML =
    "";

  if (!url) {
    return;
  }

  new QRCode(
    qrElement,
    {
      text:
        url,

      width:
        154,

      height:
        154,

      correctLevel:
        QRCode.CorrectLevel.M
    }
  );

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


  return (
    (
      bytes /
      1024 /
      1024
    ).toFixed(1) +
    " MB"
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
   Add received file
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


    setPreview(
      url
    ) {

      thumb.innerHTML =
        "";

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
      (row) => row.remove()
    );


  filesSection.hidden =
    fileList.children.length ===
    0;

}