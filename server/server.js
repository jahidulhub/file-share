import express from "express";
import http from "node:http";
import {
  WebSocketServer
} from "ws";

import {
  PORT
} from "./config.js";

import {
  getRoomCount
} from "./rooms.js";

import {
  setupWebSocket
} from "./websocket.js";

import {
  startSessionManager
} from "./session.js";


const app =
  express();


const server =
  http.createServer(app);


const wss =
  new WebSocketServer({
    server,
    maxPayload: 64 * 1024
  });


// -------------------------
// HEALTH
// -------------------------

app.get(
  "/health",
  (req, res) => {

    res.json({
      ok: true,
      rooms: getRoomCount()
    });

  }
);


// -------------------------
// WEBSOCKET
// -------------------------

setupWebSocket(
  wss
);


// -------------------------
// SESSION MANAGEMENT
// -------------------------

startSessionManager(
  wss
);


// -------------------------
// START
// -------------------------

server.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log("");

    console.log(
      "================================="
    );

    console.log(
      " File Share Server"
    );

    console.log(
      "================================="
    );

    console.log(
      `Port: ${PORT}`
    );

    console.log(
      "Health: /health"
    );

    console.log(
      `WebSocket: ws://localhost:${PORT}`
    );

    console.log(
      "================================="
    );

    console.log("");
  }
);