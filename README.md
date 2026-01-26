# 🔥 Modern Private Web Messenger

A polished, production-ready realtime web messenger built with React, Socket.IO, WebRTC, and multiplayer games.

## ✨ Features

### 💬 Chat Features
- **ChatScope UI** - Beautiful, Discord/iMessage-like chat interface
- Real-time messaging with Socket.IO
- Message replies and threading
- Emoji reactions (👍, 😂, ❤️, 🎉, 😮)
- Typing indicators
- Message editing and deletion
- GIF search (via GIPHY API)
- Image/video attachments
- Push notifications

### 📞 Voice & Video
- WebRTC voice/video calls
- Screen sharing
- Discord-style connection verification
- Connection quality indicators
- Browser compatibility (Chrome, Firefox, Safari, Edge)

### 🎮 In-Chat Games
- **Phaser.js** powered games
- **Colyseus** multiplayer game server
- iMessage-style embedded games
- Pong, and more coming soon!

### 🔐 Authentication
- Password-protected access (default: "0327")
- Session management ready
- Private room access

## 🚀 Tech Stack

### Frontend
- **React 18** - UI framework
- **ChatScope Chat UI Kit** - Professional chat components
- **Framer Motion** - Smooth animations
- **Phaser.js** - Game engine
- **Vite** - Build tool

### Backend
- **Node.js** - Runtime
- **Express** - Web server
- **Socket.IO** - Real-time messaging
- **Colyseus** - Multiplayer game server
- **WebRTC** - Voice/video calls

### Deployment
- **Railway** - Hosting platform
- Ready for production deployment

## 📦 Installation

### Prerequisites
- Node.js >= 18
- npm or yarn

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/emmaa271781-crypto/Webapp.git
cd Webapp
```

2. **Install dependencies**
```bash
npm install
```

3. **Set environment variables** (optional)
Create a `.env` file:
```env
PORT=3000
CHAT_PASSWORD=0327
GIPHY_API_KEY=your_giphy_key
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:admin@example.com
GAME_PORT=2567
```

4. **Development**
```bash
# Run both server and React dev server
npm run dev

# Or run separately:
npm run dev:server  # Server on port 3000
npm run dev:client  # Vite dev server on port 5173
```

5. **Production Build**
```bash
npm run build
npm start
```

## 🎮 Game Server

The Colyseus game server runs on port 2567 by default. Games are accessible from the chat interface via the "🎮 Play Game" button.

## 🔧 Configuration

### Environment Variables

- `PORT` - Main server port (default: 3000)
- `GAME_PORT` - Game server port (default: 2567)
- `CHAT_PASSWORD` - Room password (default: "0327")
- `GIPHY_API_KEY` - For GIF search (optional)
- `VAPID_PUBLIC_KEY` - For push notifications (optional)
- `VAPID_PRIVATE_KEY` - For push notifications (optional)
- `VAPID_SUBJECT` - For push notifications (optional)

## 📁 Project Structure

```
├── src/                  # React source code
│   ├── components/       # React components
│   │   ├── GameCanvas.jsx  # Phaser.js game component
│   │   └── ...
│   ├── hooks/            # Custom React hooks
│   ├── AppChatScope.jsx  # Main app with ChatScope UI
│   └── main.jsx          # Entry point
├── public/               # Static files (built React app)
├── server.js             # Express + Socket.IO server
├── server-games.js       # Colyseus game server
└── package.json          # Dependencies
```

## 🎨 Features in Detail

### Chat UI (ChatScope)
- Professional message bubbles
- Smooth animations
- Responsive design
- Dark theme with green accents

### WebRTC Calls
- Browser compatibility fixes
- Connection health monitoring
- Automatic reconnection
- Quality indicators

### Games
- Embedded Phaser.js games
- Multiplayer support via Colyseus
- Easy to add new games

## 🚢 Deployment

### Railway Deployment

The app is Railway-ready. Just connect your GitHub repo and Railway will:

1. Install dependencies (`npm install`)
2. Build the React app (`npm run build`)
3. Start the server (`npm start`)
4. Serve the built app from the `public/` directory

### Manual Deployment

1. Build the app:
```bash
npm run build
```

2. Start the server:
```bash
npm start
```

The server will serve the built React app from the `public/` directory.

## 🔒 Security

- Password-protected access
- Input sanitization
- File size limits
- Rate limiting ready

## 📝 License

ISC

## 🙏 Credits

- **ChatScope** - Chat UI components
- **Colyseus** - Multiplayer game framework
- **Phaser.js** - Game engine
- **Socket.IO** - Real-time communication

## 🐛 Troubleshooting

### Build Issues
- Make sure Node.js >= 18 is installed
- Run `npm install` to install all dependencies
- Check that `npm run build` completes successfully

### Game Server Issues
- Ensure port 2567 is available
- Check that Colyseus dependencies are installed

### WebRTC Issues
- Check browser compatibility
- Ensure HTTPS in production (required for WebRTC)
- Check browser console for errors

---

**Built with ❤️ using modern web technologies**
