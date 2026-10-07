// client/js/config.js

const SERVER_URL = 
  "http://192.168.0.6:3000";


const params =
  new URLSearchParams(
    location.search
  );


export const roomFromUrl =
  params.get("room");


export {
  SERVER_URL
};