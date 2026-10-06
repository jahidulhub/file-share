// client/js/wakeLock.js

let lock = null;

let wanted = false;


async function request() {

  if (!wanted) {
    return;
  }

  try {

    if (
      "wakeLock" in navigator &&
      !lock
    ) {

      lock =
        await navigator.wakeLock.request(
          "screen"
        );


      lock.addEventListener(
        "release",
        () => {

          lock = null;

        }
      );

    }

  } catch {

    // Not supported or not allowed.
    // Wake Lock normally requires HTTPS.

  }

}


export function acquireWakeLock() {

  wanted = true;

  request();

}


export function releaseWakeLock() {

  wanted = false;

  if (lock) {

    lock.release();

    lock = null;

  }

}


/*
  Browsers release the wake lock when
  the page becomes hidden.

  Request it again when the user
  returns to the page.
*/

document.addEventListener(
  "visibilitychange",
  () => {

    if (
      wanted &&
      document.visibilityState ===
        "visible"
    ) {

      request();

    }

  }
);