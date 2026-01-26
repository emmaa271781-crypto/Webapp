# Classroom CS - Modern Chat App

A polished, animated, Discord/iMessage-like realtime web messenger built with React, Socket.IO, and Framer Motion.

## Features

✨ **Modern UI**
- Discord/iMessage-style message bubbles
- Smooth Framer Motion animations
- Polished, responsive design
- Dark theme with beautiful gradients

💬 **Chat Features**
- Realtime messaging with Socket.IO
- Message replies and threading
- Emoji reactions
- Typing indicators
- Message editing and deletion
- GIF search (via GIPHY API)
- Image/video attachments
- Push notifications

📞 **Voice & Video**
- WebRTC voice/video calls
- Screen sharing
- Call status indicators

## Tech Stack

- **Frontend**: React 18, Framer Motion, Vite
- **Backend**: Node.js, Express, Socket.IO
- **Real-time**: Socket.IO for messaging, WebRTC for calls
- **Deployment**: Railway-ready

## Setup

### Install Dependencies

```bash
npm install
```

### Development

```bash
# Run both server and React dev server
npm run dev

# Or run separately:
npm run dev:server  # Server on port 3000
npm run dev:client  # Vite dev server on port 5173
```

### Production Build

```bash
# Build React app
npm run build

# Start server (serves built React app)
npm start
```

## Environment Variables

- `PORT` - Server port (default: 3000)
- `CHAT_PASSWORD` - Room password (default: "0327")
- `GIPHY_API_KEY` - For GIF search (optional)
- `VAPID_PUBLIC_KEY` - For push notifications (optional)
- `VAPID_PRIVATE_KEY` - For push notifications (optional)
- `VAPID_SUBJECT` - For push notifications (optional)

## Project Structure

```
├── src/              # React source code
│   ├── components/   # React components
│   ├── hooks/        # Custom React hooks
│   └── App.jsx       # Main app component
├── public/           # Static files (built React app)
├── server.js         # Express + Socket.IO server
└── vite.config.js    # Vite configuration
```

## Features in Detail

### Message Features
- **Replies**: Click "Reply" on any message to reply
- **Reactions**: Click emoji reactions (👍, 😂, ❤️, 🎉, 😮)
- **Editing**: Edit your own messages
- **Deletion**: Delete your own messages
- **Attachments**: Upload images/videos (max 3MB)
- **GIFs**: Search and send GIFs via GIPHY

### Animations
- Message slide-in animations
- Reaction pop animations
- Smooth hover effects
- Typing indicator animations
- Panel transitions

## Deployment

The app is Railway-ready. Just connect your GitHub repo and Railway will:
1. Build the React app (`npm run build`)
2. Start the server (`npm start`)
3. Serve the built app from the `public/` directory

## License

ISC
