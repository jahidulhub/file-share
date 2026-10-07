// client/js/config.js

/*=======================
  Local Server URL
=========================

const SERVER_URL = 
  "http://192.168.0.6:3000";
*/

const SERVER_URL =
  "https://rare-patience-production-8095.up.railway.app";

const params =
  new URLSearchParams(
    location.search
  );


export const roomFromUrl =
  params.get("room");


export {
  SERVER_URL
};