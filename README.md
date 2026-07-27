<<<<<<< HEAD
# MERN Student Result Analysis

This is a MERN (MongoDB, Express, React, Node.js) stack application for student result analysis.

## Project Structure

```
result-analysis/
├── backend/                 # Express backend server
│   ├── models/
│   │   └── Student.js      # MongoDB Student schema
│   ├── routes/
│   │   └── studentRoutes.js # Student API routes
│   ├── package.json
│   └── server.js           # Main server file
│
└── frontend/               # React frontend with Vite
    ├── src/
    │   ├── components/
    │   │   └── StudentResults.jsx  # Main result component
    │   ├── styles/
    │   │   └── StudentResults.css  # Component styles
    │   ├── App.jsx         # Main App component
    │   ├── main.jsx        # Entry point
    │   └── index.css       # Global styles
    ├── index.html
    ├── package.json
    └── vite.config.js      # Vite configuration with proxy
```

## Prerequisites

- Node.js (v14+)
- MongoDB running on `mongodb://127.0.0.1:27017`

## Installation & Setup

### 1. Backend Setup

```bash
cd backend
npm install
npm run dev
```

The backend will run on `http://localhost:5000`

### 2. Frontend Setup

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:3000`

## Features

- **Load Data**: Fetches all students from the MongoDB database
- **Display Results**: Shows student names, registration numbers, total marks, percentage, result status, and rank
- **Print**: Print the results table
- **Auto-ranking**: Automatically assigns ranks based on total marks

## API Endpoints

- `GET /students/all` - Fetch all students with rankings
- `POST /students/add` - Add a new student

## Converted from HTML/CSS/JS

The original HTML/CSS/JS code has been converted to:
- **React Components** for reusable UI
- **Hooks (useState)** for state management
- **Axios** for API calls
- **CSS Modules** for styling

## Development

Both frontend and backend support hot-reload during development:
- Backend uses `nodemon` for automatic restart
- Frontend uses Vite's hot module replacement (HMR)
=======
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
>>>>>>> a48dcc0ad679379bf4cc9948ccb561462a605ed7
