# ChoirMate 🎵

A comprehensive choir management application to track member attendance, expenses, and birthdays.

## Features

- **Member Management**: Add, edit, and view choir member information including birthdays
- **Attendance Tracking**: Track attendance for Saturday practice, Sunday practice, and special events
- **Expense Management**: Record and monitor choir fund expenses
- **Birthday Reminders**: View upcoming member birthdays
- **Dashboard**: Get an overview of all choir activities

## Installation

1. Install all dependencies:
```bash
npm run install-all
```

2. Start the application:
```bash
npm start
```

Or simply double-click `run.bat` on Windows!

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express
- **Database**: SQLite
- **Styling**: CSS3 with modern design

## Project Structure

```
ChoirMate/
├── client/          # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── types/
│   │   └── App.tsx
├── server/          # Express backend
│   ├── database.js
│   └── index.js
└── README.md
```

## Usage

### Adding Members
Navigate to the Members page to add new choir members with their contact information and birthday.

### Recording Attendance
Use the Attendance page to mark who attended Saturday practice, Sunday practice, or special events.

### Tracking Expenses
Record all choir fund expenses in the Expenses page with description, amount, and date.

### Viewing Dashboard
The dashboard provides a quick overview of recent activities and upcoming birthdays.

## License

MIT

