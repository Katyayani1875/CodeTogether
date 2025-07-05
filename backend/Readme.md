livecodehub-backend/
├── node_modules/
├── src/
│   ├── api/
│   │   ├── auth.routes.js         # Routes for /api/v1/auth (login, signup)
│   │   ├── room.routes.js         # Routes for /api/v1/rooms (create, get details)
│   │   └── user.routes.js         # Routes for /api/v1/users (get profile)
│   │
│   ├── config/
│   │   ├── db.js                  # MongoDB connection logic
│   │   └── index.js               # Centralized config export (env variables)
│   │
│   ├── controllers/
│   │   ├── auth.controller.js     # Logic for login, signup, etc.
│   │   └── room.controller.js     # Logic for creating rooms, validating access
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.js     # Verifies JWT token to protect routes
│   │   └── error.middleware.js    # Centralized error handling
│   │
│   ├── models/
│   │   ├── user.model.js          # Mongoose schema for Users
│   │   ├── room.model.js          # Mongoose schema for Rooms (stores files, users)
│   │   └── file.model.js          # Mongoose schema for Files/Folders (optional, can be embedded in Room)
│   │
│   ├── services/                  # Business logic that can be reused
│   │   └── room.service.js        # e.g., Logic for saving file content, managing user roles
│   │
│   ├── sockets/
│   │   ├── socket.js              # Main Socket.IO server setup and event listener registration
│   │   └── handlers/
│   │       ├── room.handler.js    # Handles events like 'join-room', 'leave-room'
│   │       └── editor.handler.js  # Handles 'code-change', 'cursor-change' events
│   │
│   ├── utils/
│   │   ├── ApiError.js            # Custom Error class for API responses
│   │   ├── ApiResponse.js         # Custom Success class for API responses
│   │   └── asyncHandler.js        # Wraps async controllers to handle promise rejections
│   │
│   └── app.js                     # Express app setup, middleware registration
│
├── .env                           # Environment variables (SECRET! Not in git)
├── .env.example                   # Example environment variables
├── .gitignore                     # Files to ignore for git
├── package.json
└── server.js                      # Entry point: creates HTTP server and attaches Express & Socket.IO
lenis for smooth scroll