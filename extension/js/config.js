// extension/js/config.js

/*===========================
  Local Signaling Server URL
==============================

export const SIGNALING_URL =
  "ws://192.168.0.6:3000";
*/

export const SIGNALING_URL =
  "wss://rare-patience-production-8095.up.railway.app";
  
export const CLIENT_URL =
  "http://192.168.0.6:5500/client/index.html";

export const SESSION_MS =
  3 * 60 * 60 * 1000;

export const SESSION_STORAGE_KEY =
  "fileShareSession";