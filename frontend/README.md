# Foosball League Frontend

A React-based dashboard for managing the Foosball League tournament system, built with IBM Carbon Design System.

## Features

- **Dashboard**: Overview of tournament statistics
- **Teams Management**: Add, view, and delete teams
- **Matches Management**: Schedule matches and update results
- **Point Table**: View live standings and rankings

## Tech Stack

- **React 18** with Vite
- **IBM Carbon Design System** for UI components
- **React Router** for navigation
- **Axios** for API calls

## Prerequisites

- Node.js 18+ and npm
- Backend API running on `http://localhost:8000`

## Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env` file in the frontend directory:
```
VITE_API_URL=http://localhost:8000
```

## Running the Application

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Building for Production

```bash
npm run build
```

The production build will be in the `dist` directory.

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── layout/          # Layout components (Header)
│   │   ├── forms/           # Form components (TeamForm, MatchForm)
│   │   └── common/          # Reusable components (LoadingState, EmptyState)
│   ├── pages/               # Page components
│   │   ├── Dashboard.jsx
│   │   ├── Teams.jsx
│   │   ├── Matches.jsx
│   │   └── PointTable.jsx
│   ├── services/
│   │   └── api.js           # API service configuration
│   ├── App.jsx              # Main app component with routing
│   ├── main.jsx             # Entry point
│   └── index.css            # Global styles
├── .env                     # Environment variables
└── package.json
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## API Integration

The frontend connects to the backend API with the following endpoints:

- `GET /teams` - List all teams
- `POST /teams` - Create a new team
- `DELETE /teams/{_id}` - Delete a team
- `GET /matches` - List all matches
- `POST /matches` - Schedule a match
- `PUT /matches/{match_id}` - Update match result
- `GET /points-table` - Get standings

## Features Overview

### Dashboard
- Displays summary cards for total teams, matches, completed matches, and upcoming matches
- Real-time statistics from the API

### Teams Page
- DataTable with search functionality
- Add new teams via modal form
- Delete teams with confirmation
- Loading and empty states

### Matches Page
- Tabbed interface for scheduled and played matches
- Schedule new matches
- Update match results
- Visual match cards with team information

### Point Table
- Live standings with rankings
- Sortable columns
- Refresh functionality
- Highlights top team

## Accessibility

The application follows WCAG guidelines using Carbon's accessible components:
- Proper ARIA labels
- Keyboard navigation support
- Screen reader friendly
- High contrast support

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
