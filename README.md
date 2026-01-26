# Classroom CS

Realtime web messenger built with Express, Socket.IO, and WebRTC. Includes
chat, calls, screen sharing, GIF search, and push notifications.

## Features

- Realtime chat with replies, reactions, edits, and typing indicators
- GIF search (GIPHY) and image/video attachments
- Voice/video calls with screen share
- Profile + avatar, call banner, and speaking indicators
- Push notifications (even when the tab is closed)

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Environment variables

- `PORT` (default: 3000)
- `CHAT_PASSWORD` (default: 0327)
- `GIPHY_API_KEY` (GIF search)
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (push notifications)
- `TURN_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL` (reliable calls)

## Railway

Railway runs `npm start` and provides `PORT` automatically.

## Health check

`GET /healthz` returns `{ "status": "ok" }`.
