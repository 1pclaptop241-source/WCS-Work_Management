# WiseCut Studios - Work Management System

A comprehensive work management website for WiseCut Studios built with the MERN stack (MongoDB, Express, React, Node.js).

## Features

### Admin Dashboard
- View all projects with client and editor information
- Create new projects
- Assign work to editors
- Share project details with editors
- Track progress of ongoing projects
- Manage users

### Editor Dashboard
- View assigned works/projects
- Upload work files
- View payment information with automatic penalty calculation
- See deadlines with visual indicators
- View client corrections and feedback

### Client Dashboard
- Track ongoing projects
- View submitted work
- Download/view work files
- Add corrections and feedback
- Manage project details

## Tech Stack

### Backend
- Node.js with Express.js
- MongoDB with Mongoose
- JWT Authentication
- Multer for file uploads
- bcryptjs for password hashing

### Frontend
- React.js with React Router
- Axios for API calls
- Vite as build tool
- CSS with blue/green color theme

## Installation

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory:
```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/wisecutstudios
JWT_SECRET=your_super_secret_jwt_key_change_in_production
```

4. Start the server:
```bash
npm start
# or for development with nodemon
npm run dev
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Default Setup

### Create Admin Account

You'll need to create an admin account. You can do this by:

1. Starting the backend server
2. Using a MongoDB client or API tool to create the first admin user
3. Or create an admin account through the API endpoint (requires authentication)

Example using MongoDB shell or MongoDB Compass:
```javascript
// First create a regular user, then manually update role to 'admin'
// Or use the API after logging in as admin
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/register` - Register new user (admin only)
- `GET /api/auth/me` - Get current user

### Projects
- `GET /api/projects` - Get all projects (role-based filtering)
- `GET /api/projects/:id` - Get single project
- `POST /api/projects` - Create project (admin only)
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project (admin only)
- `PUT /api/projects/:id/assign` - Assign editor (admin only)
- `PUT /api/projects/:id/share-details` - Share project details (admin only)

### Works
- `POST /api/works` - Upload work (editor only)
- `GET /api/works/project/:projectId` - Get works for project
- `GET /api/works/editor/:editorId` - Get works by editor
- `PUT /api/works/:id/corrections` - Add corrections (client only)

### Payments
- `GET /api/payments/editor/:editorId` - Get payments for editor
- `GET /api/payments/project/:projectId` - Get payment for project
- `POST /api/payments/calculate` - Calculate/Recalculate payment

### Users
- `GET /api/users` - Get all users (admin only)
- `POST /api/users` - Create user (admin only)
- `GET /api/users/editors` - Get all editors
- `GET /api/users/clients` - Get all clients (admin only)

## Payment Penalty System

The system automatically calculates payment penalties when deadlines are crossed:
- **5% penalty per day late**
- **Maximum 50% reduction**
- Calculations are done automatically when viewing payment information

## File Uploads

- Files are stored in `backend/uploads/` directory
- Maximum file size: 100MB
- Files are served statically at `/uploads/:filename`

## Color Theme

The website uses a blue/green color scheme:
- Primary Blue: #2E86AB
- Primary Green: #06A77D
- Secondary Blue: #1A5F7A
- Secondary Green: #0D7A5C

## Project Structure

```
project-root/
├── backend/
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Auth & upload middleware
│   ├── config/          # Database configuration
│   └── utils/           # Utility functions
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── context/     # Context providers
│   │   ├── services/    # API services
│   │   └── styles/      # CSS files
│   └── package.json
└── README.md
```

## Development

### Running in Development Mode

1. Start MongoDB (if running locally)
2. Start backend server: `cd backend && npm run dev`
3. Start frontend dev server: `cd frontend && npm run dev`

The frontend will run on `http://localhost:3000` and proxy API requests to `http://localhost:5000`

## License

This project is proprietary software for WiseCut Studios.

