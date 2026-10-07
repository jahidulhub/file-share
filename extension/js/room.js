import {
  SESSION_MS,
  SESSION_STORAGE_KEY,
  CLIENT_URL
} from "./config.js";


const ROOM_ID_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";


const ROOM_ID_LENGTH = 10;


let session = null;


function generateRoomId() {

  const bytes =
    crypto.getRandomValues(
      new Uint8Array(
        ROOM_ID_LENGTH
      )
    );


  return Array.from(
    bytes,
    (byte) =>
      ROOM_ID_ALPHABET[
        byte %
        ROOM_ID_ALPHABET.length
      ]
  ).join("");

}


function isValidSession(
  value
) {

  if (!value) {
    return false;
  }


  if (
    typeof value.roomId !==
    "string"
  ) {
    return false;
  }


  if (
    !Number.isFinite(
      value.createdAt
    )
  ) {
    return false;
  }


  if (
    !Number.isFinite(
      value.expiresAt
    )
  ) {
    return false;
  }


  if (
    value.expiresAt <=
    Date.now()
  ) {
    return false;
  }


  return true;

}


export async function loadSession() {

  const result =
    await chrome.storage.local.get(
      SESSION_STORAGE_KEY
    );


  const stored =
    result[
      SESSION_STORAGE_KEY
    ];


  if (
    isValidSession(stored)
  ) {

    session =
      stored;

    return session;

  }


  session =
    null;


  return null;

}


export async function createSession() {

  const now =
    Date.now();


  session = {

    roomId:
      generateRoomId(),

    createdAt:
      now,

    expiresAt:
      now + SESSION_MS

  };


  await saveSession();


  return session;

}


export async function getOrCreateSession() {

  const existing =
    await loadSession();


  if (existing) {

    return existing;

  }


  return createSession();

}


export function getSession() {

  return session;

}


export async function saveSession() {

  if (!session) {

    return;

  }


  await chrome.storage.local.set({

    [SESSION_STORAGE_KEY]:
      session

  });

}


export async function clearSession() {

  session =
    null;


  await chrome.storage.local.remove(
    SESSION_STORAGE_KEY
  );

}


export function isSessionExpired() {

  if (!session) {

    return true;

  }


  return (
    session.expiresAt <=
    Date.now()
  );

}


export function getRemainingTime() {

  if (!session) {

    return 0;

  }


  return Math.max(

    0,

    session.expiresAt -
      Date.now()

  );

}


export function getPhoneUrl() {

  if (!session) {

    return null;

  }


  return (
    `${CLIENT_URL}?room=${session.roomId}`
  );

}