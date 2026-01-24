# Classroom CS

A lightweight realtime web messenger built with Express and Socket.IO. The
project is ready for Railway hosting and will redeploy automatically whenever
you push updates to GitHub.

## Features

- Realtime messaging with Socket.IO
- Simple name picker with join/leave notices
- Message history (last 100 messages in memory)
- Railway-friendly `npm start` entry point
- Password gate (default: `0327`)
- Emoji shortcuts and GIF links
- GIF search (via GIPHY API)
- One-click call + screen share (WebRTC)

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in multiple tabs to chat.

### Password

The default password is `0327`. You can override it by setting
`CHAT_PASSWORD` in your environment.

### GIF search

GIF search uses GIPHY. You can set `GIPHY_API_KEY` to your own key, otherwise
the app uses a demo key with limited rate.

## Railway deployment (GitHub-connected)

1. Push this repo to GitHub.
2. In Railway, create a new project from your GitHub repo.
3. Railway will detect the Node app and run:
   - **Build:** `npm install` (default)
   - **Start:** `npm start`
4. Railway provides the `PORT` environment variable automatically.

After the first deploy, any GitHub push will trigger a new deployment, so your
website stays in sync with your git updates.

## Health check

`GET /healthz` returns `{ "status": "ok" }` for uptime monitoring.
