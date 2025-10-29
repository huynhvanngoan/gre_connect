# Education System Backend

A comprehensive education management system with real-time messaging, video calls, and online meetings.

## 🚀 Features

- **User Management**: Students, Teachers, Staff with role-based access
- **Posts**: Announcements, Homework, Discussions, Polls, Events
- **Comments**: Nested comments with reactions
- **Notifications**: Multi-channel (in-app, email, push)
- **Classes**: Full class management with materials and grading
- **Messaging**: Real-time chat with media support
- **Calls**: Audio/Video calls with screen sharing
- **Meetings**: Scheduled online classes with breakout rooms, polls, recordings

## 📁 Project Structure

```
src/
├── models/          # Mongoose schemas
├── routes/          # API routes
├── controllers/     # Route controllers
├── middlewares/     # Custom middlewares
├── validations/     # Request validations
├── services/        # Business logic & external services
├── utils/           # Helper functions
└── config/          # Configuration files
```

## 🛠️ Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```

4. Start the server:
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## 📚 API Documentation

API documentation will be available at `http://localhost:5000/api/v1/docs` (once implemented)

## 🧪 Testing

```bash
npm test
```

## 📝 License

MIT
