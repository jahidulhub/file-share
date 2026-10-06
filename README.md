# File Share

A simple peer-to-peer file sharing tool that lets a user connect a phone to a Chrome extension by scanning a QR code and transfer files directly between devices.

The goal is to make file sharing simple:

**Open extension → Scan QR → Select/take file on phone → File appears in extension**

---

# 1. Project Architecture

```text
                         ┌──────────────────────┐
                         │       GitHub         │
                         │   Source Repository  │
                         └──────────┬───────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 │                  │                  │
                 ▼                  ▼                  ▼
          extension/             client/            server/
          Chrome Extension       Phone Web App       Node.js
                 │                  │                  │
                 │                  │                  │
                 │                  └──────────┐       │
                 │                             │       │
                 │                             ▼       │
                 │                         Google     │
                 │                          Cloud      │
                 │                             │       │
                 │                             │       │
                 └──────────────┐              │       │
                                │              │       │
                                ▼              ▼       ▼
                         Chrome Extension   Phone Web App
                                │              │
                                │              │
                                └──── WebRTC ──┘
                                   Direct P2P
```

## Deployment

```text
GitHub
│
├── website/ ────────────────→ GitHub Pages
│                               Public website
│
├── client/ ─────────────────→ Google Cloud
│                               Phone web app
│
├── server/ ─────────────────→ Google Cloud
│                               Node.js + WebSocket
│
└── extension/ ──────────────→ Chrome Web Store
                                Chrome extension
```

GitHub is the **source code repository**.

GitHub Pages hosts only the **public website**.

Google Cloud hosts the **phone web app + signaling server**.

The Chrome extension is distributed separately, eventually through the **Chrome Web Store**.

---

# 2. Repository Structure

```text
file-share/
│
├── extension/
│   ├── manifest.json
│   ├── popup/
│   ├── sidepanel/
│   ├── js/
│   ├── css/
│   └── ...
│
├── client/
│   ├── index.html
│   ├── style.css
│   ├── js/
│   │   ├── app.js
│   │   ├── config.js
│   │   ├── rtc.js
│   │   ├── signaling.js
│   │   ├── events.js
│   │   ├── fileSender.js
│   │   ├── fileReceiver.js
│   │   └── ui.js
│   └── ...
│
├── server/
│   ├── server.js
│   ├── package.json
│   └── ...
│
├── website/
│   ├── index.html
│   ├── style.css
│   └── ...
│
├── README.md
├── .gitignore
└── ...
```

---

# 3. What Each Folder Does

## `extension/`

The Chrome extension.

Responsibilities:

* Create a sharing session
* Generate a room ID
* Display QR code
* Connect to signaling server
* Create WebRTC connection
* Receive files from phone
* Display received files
* Allow the user to save/download files
* Close/revoke the sharing session

The extension is the **host**.

---

## `client/`

The phone web application.

Responsibilities:

* Open from QR code
* Connect to signaling server
* Join the room
* Create WebRTC connection
* Select files
* Take photos
* Upload PDFs/images/files
* Send files directly to extension
* Show transfer progress
* Disconnect from session

The phone is the **guest**.

The user does not need to install an app.

The phone simply opens the web page in a browser.

---

## `server/`

The Node.js signaling server.

Responsibilities:

* Create/manage rooms
* Connect extension and phone
* Match host and guest
* Exchange WebRTC signaling messages
* Manage session expiration
* Detect disconnected clients
* Prevent multiple phones from joining the same room

The server **does not normally transfer the files**.

---

## `website/`

The public File Share website.

Responsibilities:

* Explain what File Share is
* Show how it works
* Provide information about the extension
* Provide the extension download/install link
* Eventually link to the Chrome Web Store
* Provide project information

The website is separate from the phone client.

---

# 4. How File Transfer Works

The complete flow is:

```text
1. User opens Chrome extension
             │
             ▼
2. Extension creates room
             │
             ▼
3. Extension displays QR code
             │
             ▼
4. User scans QR code with phone
             │
             ▼
5. Phone opens client web app
             │
             ▼
6. Phone joins room
             │
             ▼
7. Server connects extension + phone
             │
             ▼
8. WebRTC connection is established
             │
             ▼
9. Phone selects/takes a file
             │
             ▼
10. File travels directly
    phone ───────────────→ extension
             │
             ▼
11. Extension receives file
```

The Node.js server is primarily used for **signaling**.

The actual file transfer uses a WebRTC data channel.

---

# 5. WebRTC Architecture

```text
              Signaling Server
              Google Cloud
                    │
             WebSocket messages
                    │
          ┌─────────┴─────────┐
          │                   │
          ▼                   ▼
     Chrome Extension      Phone Browser
          │                   │
          │                   │
          └────── WebRTC ─────┘
                DataChannel
                    │
                    ▼
              File Transfer
```

The signaling server exchanges:

* Offer
* Answer
* ICE candidates

After the WebRTC connection is established, files are sent through the WebRTC data channel.

---

# 6. STUN

The current WebRTC configuration uses Google STUN:

```js
const pc =
  new RTCPeerConnection({
    iceServers: [
      {
        urls:
          "stun:stun.l.google.com:19302"
      }
    ]
  });
```

STUN helps the devices discover network information needed to establish a peer-to-peer connection.

---

# 7. TURN

TURN is not currently required for the basic architecture.

If some networks cannot establish a direct WebRTC connection, a TURN server may eventually be added.

Important difference:

```text
STUN

Phone ────────────────→ Extension
          Direct
```

versus:

```text
TURN

Phone ──→ TURN Server ──→ Extension
             │
             └── File traffic passes through server
```

TURN can therefore increase server bandwidth usage and cost.

Start with STUN.

Add TURN only if real users experience connection failures.

---

# 8. Session System

The current session duration is:

```js
const SESSION_MS =
  3 * 60 * 60 * 1000;
```

This means:

**3 hours**

The session information is stored in browser/extension storage using:

```js
const SESSION_STORAGE_KEY =
  "fileShareSession";
```

The server also tracks room expiration.

A room contains:

```text
roomId
expiresAt
host
guest
guestDevice
```

---

# 9. Room System

The extension generates a room ID.

Example:

```text
ABCD7K92XZ
```

The phone receives a URL containing the room information.

Example conceptually:

```text
https://your-domain.com/?room=ABCD7K92XZ
```

The phone opens the client and joins that room.

Only one phone is allowed in a room.

If the same phone/device opens another tab, the previous guest connection can be replaced.

---

# 10. Server

The current server uses:

* Node.js
* Express
* WebSocket
* `ws`

The server serves the client:

```js
app.use(
  express.static(
    path.join(__dirname, "../client")
  )
);
```

Therefore:

```text
server/
client/
```

must remain sibling directories.

Example:

```text
file-share/
├── client/
└── server/
```

The server can serve:

```text
client/index.html
client/style.css
client/js/...
```

---

# 11. Health Check

The server provides:

```text
/health
```

Example:

```text
https://your-domain.com/health
```

Expected response:

```json
{
  "ok": true,
  "rooms": 0
}
```

This can be used to check whether the server is running.

---

# 12. Current Server Port

Development:

```text
3000
```

Local server:

```text
http://localhost:3000
```

WebSocket:

```text
ws://localhost:3000
```

When deployed behind HTTPS/Nginx:

```text
https://your-domain.com
```

and:

```text
wss://your-domain.com
```

---

# 13. Client Configuration

Current development configuration:

```js
export const SERVER_URL =
  "http://192.168.0.6:3000";

export const SIGNALING_URL =
  "ws://192.168.0.6:3000";

export const SESSION_MS =
  3 * 60 * 60 * 1000;

export const SESSION_STORAGE_KEY =
  "fileShareSession";
```

These local IP addresses are only for development on the same Wi-Fi network.

---

# 14. Production Configuration

After Google Cloud + domain + HTTPS are configured:

```js
export const SERVER_URL =
  "https://your-domain.com";

export const SIGNALING_URL =
  "wss://your-domain.com";

export const SESSION_MS =
  3 * 60 * 60 * 1000;

export const SESSION_STORAGE_KEY =
  "fileShareSession";
```

Do not change:

```js
SESSION_MS
```

or:

```js
SESSION_STORAGE_KEY
```

unless there is a specific reason.

---

# 15. Local Development

Start the server:

```bash
cd server
npm install
node server.js
```

The server should show:

```text
=================================
 File Share Server
=================================
Local: http://localhost:3000
=================================
```

Then open:

```text
http://localhost:3000
```

The server serves the `client/` directory.

---

# 16. Development Network

For testing between Mac and phone on the same Wi-Fi:

```text
Mac
 │
 │ Wi-Fi
 │
 ├── Node.js Server
 │
 │
 ▼
Phone
```

Find the Mac IP:

```bash
ipconfig getifaddr en0
```

Example:

```text
192.168.0.6
```

Then configure:

```js
export const SERVER_URL =
  "http://192.168.0.6:3000";

export const SIGNALING_URL =
  "ws://192.168.0.6:3000";
```

---

# 17. Production Deployment

Target architecture:

```text
                     Internet
                         │
                         ▼
                  your-domain.com
                         │
                         ▼
                      Nginx
                    Google Cloud
                         │
                         ▼
                   Node.js :3000
                         │
                ┌────────┴────────┐
                │                 │
                ▼                 ▼
             client/          WebSocket
                │                 │
                ▼                 │
          Phone Web App           │
                                  │
                                  ▼
                            WebRTC signaling
```

Nginx handles:

* HTTPS
* Domain
* WebSocket forwarding
* Requests to Node.js

Node.js remains on:

```text
localhost:3000
```

Port 3000 does not need to be publicly exposed once Nginx is configured.

---

# 18. Google Cloud

Google Cloud will host:

```text
client/
server/
```

The basic deployment process:

```text
1. Create Google Cloud VM
2. SSH into VM
3. Install Node.js
4. Clone GitHub repository
5. Install server dependencies
6. Start Node.js server
7. Test /health
8. Configure Nginx
9. Connect domain
10. Configure HTTPS
11. Change client config from HTTP/WS to HTTPS/WSS
12. Test using phone mobile data
```

---

# 19. GitHub

GitHub stores the complete source code:

```text
GitHub
│
└── file-share
    │
    ├── extension/
    ├── client/
    ├── server/
    ├── website/
    └── README.md
```

GitHub is the **source of truth**.

Changes should normally be:

```text
Local Mac
   │
   ▼
Git commit
   │
   ▼
GitHub
   │
   ├──→ GitHub Pages
   │
   └──→ Google Cloud
```

---

# 20. GitHub Pages

GitHub Pages hosts:

```text
website/
```

It should NOT host the Node.js server.

It should NOT be responsible for the WebSocket server.

It is only the public website.

Example:

```text
https://yourusername.github.io/file-share/
```

Eventually you can connect a custom domain.

---

# 21. Website vs Client

These are two different websites.

## Public Website

```text
website/
```

Purpose:

```text
"What is File Share?"
"How does it work?"
"Install the extension"
"About"
```

Hosted on:

```text
GitHub Pages
```

---

## Phone Client

```text
client/
```

Purpose:

```text
"Join this room"
"Take photo"
"Choose file"
"Send file"
"Transfer progress"
```

Hosted on:

```text
Google Cloud
```

The phone client is part of the actual File Share application.

---

# 22. Chrome Extension

The extension:

```text
extension/
```

is the desktop side of the application.

User experience:

```text
Install extension
       │
       ▼
Open extension
       │
       ▼
QR code appears
       │
       ▼
Scan with phone
       │
       ▼
Phone connects
       │
       ▼
Select/take file
       │
       ▼
File appears in extension
```

Eventually the extension can be published through the Chrome Web Store.

---

# 23. File Transfer

The current file sender uses:

```js
const CHUNK_SIZE = 16 * 1024;
```

Files are split into chunks and sent through the WebRTC data channel.

Conceptually:

```text
File
 │
 ├── Chunk 1
 ├── Chunk 2
 ├── Chunk 3
 ├── Chunk 4
 └── ...
       │
       ▼
WebRTC DataChannel
       │
       ▼
Extension
```

The UI displays:

* File name
* File type
* File size
* Progress
* Completion status

Images can also show a thumbnail.

---

# 24. Signaling Messages

The server handles:

```text
host
join
close-room
offer
answer
ice-candidate
```

The server can also notify clients about:

```text
hosted
joined
peer-joined
host-joined
peer-left
host-left
revoked
expired
replaced
error
room-closed
```

---

# 25. Security Model

The signaling server should only handle:

```text
Room information
WebRTC signaling
Connection state
Session expiration
```

It should NOT receive the actual file contents during normal direct P2P operation.

The browser establishes the WebRTC connection between the two devices.

---

# 26. Important Production Change

Development:

```text
HTTP
WS
```

Production:

```text
HTTPS
WSS
```

Therefore:

```text
http://192.168.x.x:3000
```

becomes:

```text
https://your-domain.com
```

and:

```text
ws://192.168.x.x:3000
```

becomes:

```text
wss://your-domain.com
```

This is important because browsers have security restrictions around WebRTC and secure contexts.

---

# 27. Nginx WebSocket Configuration

When using Nginx as the reverse proxy:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;

    proxy_http_version 1.1;

    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

This allows normal HTTP requests and WebSocket connections to reach Node.js.

---

# 28. Node.js Process

The Node.js server should eventually run as a background service.

Desired behavior:

```text
Server starts
    │
    ▼
Node.js starts
    │
    ▼
Server keeps running
    │
    ├── User connects
    ├── Phone connects
    └── WebRTC signaling
```

If Node.js crashes:

```text
Node.js crashes
       │
       ▼
Service manager
       │
       ▼
Node.js restarts
```

A simple production option is `systemd`.

---

# 29. Recommended Production Structure

On the Google Cloud VM:

```text
/home/USER/file-share/
│
├── client/
├── server/
└── ...
```

Run the server from:

```text
/home/USER/file-share/server
```

The server then serves:

```text
/home/USER/file-share/client
```

because of:

```js
path.join(__dirname, "../client")
```

---

# 30. Git Ignore

The repository should not contain unnecessary generated files.

Example `.gitignore`:

```gitignore
node_modules/
.env
.DS_Store
*.log
```

Never commit passwords, private keys, API secrets, or other credentials.

---

# 31. Deployment Responsibility

| Component        | Source            | Production Host  |
| ---------------- | ----------------- | ---------------- |
| Chrome Extension | `extension/`      | Chrome Web Store |
| Phone Web App    | `client/`         | Google Cloud     |
| Signaling Server | `server/`         | Google Cloud     |
| Public Website   | `website/`        | GitHub Pages     |
| Source Code      | Entire repository | GitHub           |

---

# 32. Final Architecture

```text
                         GITHUB
                   Source Repository
                          │
          ┌───────────────┼────────────────┐
          │               │                │
          ▼               ▼                ▼
     extension/       client/          server/
          │               │                │
          │               │                │
          ▼               └──────┬─────────┘
   Chrome Web Store              │
                                 ▼
                           GOOGLE CLOUD
                                 │
                         ┌───────┴────────┐
                         │                │
                         ▼                ▼
                    Phone Client     Node.js Server
                         │                │
                         │   WebSocket    │
                         └───────┬────────┘
                                 │
                                 ▼
                              WebRTC
                                 │
                         Direct File Transfer
                                 │
                         ┌───────┴───────┐
                         │               │
                      Phone          Extension


                         GITHUB PAGES
                              │
                              ▼
                         website/
                              │
                              ▼
                       Public Website
                              │
                              ▼
                    Install / Download
                       Extension
```

---

# 33. End-User Experience

The final user should not need to understand:

* Node.js
* WebSocket
* WebRTC
* STUN
* Google Cloud
* GitHub
* Servers
* Signaling

They should simply see:

```text
1. Install File Share extension

2. Open extension

3. Scan QR code

4. Choose a photo/PDF/file on phone

5. File appears on computer
```

That is the product.

---

# 34. Development Roadmap

## Phase 1 — Current

```text
[x] Chrome extension
[x] Phone web client
[x] QR connection
[x] WebSocket signaling
[x] WebRTC
[x] File transfer
[x] Progress UI
[x] Image preview
[x] Session expiration
[x] Reconnection/session handling
[x] Local testing
```

## Phase 2 — Repository

```text
[ ] Finalize project structure
[ ] Create README.md
[ ] Create .gitignore
[ ] Initialize Git
[ ] Push project to GitHub
```

## Phase 3 — Public Website

```text
[ ] Build website/
[ ] Explain File Share
[ ] Show product screenshots
[ ] Add installation button
[ ] Deploy to GitHub Pages
```

## Phase 4 — Google Cloud

```text
[ ] Create VM
[ ] Install Node.js
[ ] Clone repository
[ ] Run server
[ ] Test /health
[ ] Configure Nginx
[ ] Configure domain
[ ] Enable HTTPS
[ ] Enable WSS
```

## Phase 5 — Production

```text
[ ] Change client config to production URL
[ ] Test phone over mobile data
[ ] Test different Wi-Fi networks
[ ] Test large files
[ ] Test PDF
[ ] Test images
[ ] Test reconnect
[ ] Test expired sessions
[ ] Test multiple phones
```

## Phase 6 — Distribution

```text
[ ] Prepare Chrome extension
[ ] Create Chrome Web Store listing
[ ] Publish extension
[ ] Add Chrome Web Store link to website
```

---

# 35. Current Priority

Do not build everything at once.

The recommended order is:

```text
        1
        │
        ▼
   GitHub Repository
        │
        ▼
        2
   Public Website
        │
        ▼
        3
    Google Cloud
        │
        ▼
        4
   Domain + HTTPS
        │
        ▼
        5
 Production Testing
        │
        ▼
        6
 Chrome Web Store
```

The application already works locally.

The next major goal is simply:

**Move the working project from local development to a real public deployment.**

---

# 36. Important Rule

Keep these folders separate:

```text
extension/
client/
server/
website/
```

Do not move `client/` into `website/`.

The intended deployment is:

```text
client/ + server/ → Google Cloud

website/ → GitHub Pages

extension/ → Chrome Web Store
```

GitHub remains the source repository for everything.
