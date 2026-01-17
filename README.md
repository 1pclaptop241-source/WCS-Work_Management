# WiseCut Studios - Work Management System

A comprehensive work management website for WiseCut Studios built with the MERN stack (MongoDB, Express, React, Node.js).

## Features

> **📘 User Guide**: For detailed usage instructions, please refer to the [User Guide](docs/USER_GUIDE.md).

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

### Tech Stack

#### Backend
- **Node.js** with **Express.js**
- **MongoDB** with **Mongoose**
- **JWT** Authentication
- **Cloudinary** for scalable file storage
- **Nodemailer** for notifications
- **Web Push** for browser notifications

#### Frontend
- **React.js** with **Vite**
- **Tailwind CSS** for styling
- **Shadcn/UI** for modern, accessible components
- **Lucide React** for icons
- **Axios** for API calls

## Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [MongoDB Community Server](https://www.mongodb.com/try/download/community) (for local DB)

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create a `.env` file:**
   ```env
   NODE_ENV=development
   PORT=5000
   
   # MongoDB Connection
   MONGODB_URI=mongodb://127.0.0.1:27017/wisecutstudios
   
   # Security
   JWT_SECRET=your_super_secret_jwt_key
   
   # Cloudinary (Required for File Uploads)
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

   # Notifications (VAPID Keys for Web Push)
   PUBLIC_VAPID_KEY=your_public_vapid_key
   PRIVATE_VAPID_KEY=your_private_vapid_key
   ```

4. **Start the server:**
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create a `.env` file:**
   ```env
   VITE_API_BASE_URL=http://localhost:5000
   VITE_VAPID_PUBLIC_KEY=your_public_vapid_key
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   The frontend typically runs on `http://localhost:5173`.

## File Uploads & Media
- All media files (work submissions, payment proofs) are uploaded to **Cloudinary**.
- API credentials for Cloudinary must be set in the backend `.env`.

## Design System
- **Framework**: Tailwind CSS + Shadcn/UI
- **Icons**: Lucide React
- **Theme**: Slate/Gray base with semantic colors for status (Green/Success, Yellow/Pending, Red/Error).
- **Fonts**: Inter / Outfit

## Project Structure

```
project-root/
├── backend/
│   ├── models/          # Mongoose Schemas
│   ├── routes/          # API Endpoints
│   ├── controllers/     # Logic
│   └── config/          # DB & Env Config
├── frontend/
│   ├── src/
│   │   ├── components/  # React Components (Admin, Client, Editor, Common)
│   │   ├── services/    # API Integrations
│   │   ├── context/     # Auth & UI Contexts
│   │   └── lib/         # Utils & Shadcn configurations
└── README.md
```

## License
Proprietary software for WiseCut Studios.

