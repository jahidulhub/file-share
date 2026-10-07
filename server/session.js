import {
  HEARTBEAT_MS,
  SWEEP_MS
} from "./config.js";

import {
  getRooms,
  deleteRoom
} from "./rooms.js";

import {
  send,
  detach
} from "./signaling.js";


export function startSessionManager(
  wss
) {

  startHeartbeat(wss);

  startExpirySweep();
}


function startHeartbeat(
  wss
) {

  setInterval(() => {

    for (
      const ws
      of wss.clients
    ) {

      if (!ws.isAlive) {

        ws.terminate();

        continue;
      }


      ws.isAlive =
        false;

      ws.ping();
    }

  }, HEARTBEAT_MS);
}


function startExpirySweep() {

  setInterval(() => {

    const now =
      Date.now();


    for (
      const [
        roomId,
        room
      ]
      of getRooms()
    ) {

      if (
        room.expiresAt >
        now
      ) {
        continue;
      }


      for (
        const ws
        of [
          room.host,
          room.guest
        ]
      ) {

        if (!ws) {
          continue;
        }


        send(
          ws,
          {
            type:
              "expired"
          }
        );


        detach(ws);
      }


      deleteRoom(
        roomId
      );


      console.log(
        `[ROOM ${roomId}] Session expired`
      );
    }

  }, SWEEP_MS);
}