// client/js/config.js

const SERVER_URL =
  `${location.protocol}//${location.host}`;


const params =
  new URLSearchParams(
    location.search
  );


export const roomFromUrl =
  params.get("room");


export {
  SERVER_URL
};