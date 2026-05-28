# AI Expense Tracker

A full-stack AI-powered expense tracking application that automatically extracts data from receipt images using Claude AI. Available on web and mobile (iOS).

**Live Demo:** [ai-expense-tracker-nine-omega.vercel.app](https://ai-expense-tracker-nine-omega.vercel.app)

---

## Features

- **AI Receipt Scanning** — Take a photo or upload a receipt image. Claude AI automatically extracts the store name, total amount, category, and date
- **Web Dashboard** — View spending analytics with a pie chart breakdown by category, total spent, and receipt history
- **iOS Mobile App** — Built with React Native and Expo. Scan receipts directly from your camera or photo library
- **AI Spending Insights** — Claude analyzes your spending patterns and generates personalized recommendations
- **Month/Year Filter** — Filter receipts and charts by any month or year
- **Real-time Sync** — Receipts added on mobile appear instantly on the web dashboard
- **HEIC Support** — Handles iPhone photo formats automatically by converting to JPEG before processing

---

## Tech Stack

### Frontend (Web)

- React
- Recharts (pie chart)
- Axios
- Deployed on **Vercel**

### Mobile

- React Native + Expo
- react-native-chart-kit
- expo-image-picker
- Axios

### Backend

- Node.js + Express
- **Claude API** (Anthropic) — receipt image reading and spending insights
- Multer — image upload handling
- Sharp / heic-convert — image processing and format conversion
- PM2 — process management
- Deployed on **AWS EC2** with **Nginx** reverse proxy and **Let's Encrypt SSL**

### Database

- PostgreSQL
- Containerized with **Docker**

### Infrastructure

- AWS EC2 (t3.micro) — backend server
- Docker + docker-compose — PostgreSQL container
- Nginx — reverse proxy with HTTPS
- Vercel — frontend hosting
- Custom domain: **expense-tracker.sbs**

---

## Architecture

```
User (Web/Mobile)
      ↓
Vercel (React Frontend)
      ↓ HTTPS
Nginx (expense-tracker.sbs)
      ↓
Node.js + Express (Port 3000)
      ↓              ↓
Claude API      PostgreSQL
(Anthropic)     (Docker)
```

---

## How It Works

1. User uploads a receipt image (web drag-and-drop or mobile camera)
2. Image is sent to the Node.js backend via multipart form
3. If HEIC format (iPhone photo), it is converted to JPEG
4. Image is sent to Claude API as base64 with a structured prompt
5. Claude returns JSON with store name, amount, category, and date
6. Data is saved to PostgreSQL
7. Frontend fetches and displays updated receipt list and charts

---

## Getting Started

### Prerequisites

- Node.js v20+
- Docker Desktop
- Anthropic API key

### 1. Clone the repository

```bash
git clone https://github.com/khanhnguyen522/ai-expense-tracker.git
cd ai-expense-tracker
```

### 2. Set up the backend

```bash
cd backend
npm install
```

Create a `.env` file:

```env
PORT=3000
ANTHROPIC_API_KEY=your_api_key_here
DB_PORT=5432
```

Start PostgreSQL with Docker:

```bash
docker-compose up -d
```

Start the server:

```bash
node index.js
```

### 3. Set up the web frontend

```bash
cd web
npm install
npm start
```

Open [http://localhost:3001](http://localhost:3001)

### 4. Set up the mobile app

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go on your phone.

> **Note:** Update the `API` constant in `mobile/App.js` to point to your backend URL.

---

## API Endpoints

| Method | Endpoint        | Description                     |
| ------ | --------------- | ------------------------------- |
| GET    | `/`             | Health check                    |
| GET    | `/receipts`     | Get all receipts                |
| POST   | `/receipts`     | Upload and scan a receipt image |
| DELETE | `/receipts/:id` | Delete a receipt                |
| GET    | `/insights`     | Get AI spending insights        |

---

## Deployment

### Backend (AWS EC2)

```bash
# SSH into server
ssh -i ~/.ssh/expense-tracker-key.pem ubuntu@your-ip

# Pull latest code
cd ai-expense-tracker
git pull

# Install dependencies
cd backend
npm install

# Restart app
pm2 restart expense-tracker
```

### Frontend (Vercel)

```bash
cd web
vercel --prod
```

---

## Project Structure

```
ai-expense-tracker/
├── backend/
│   ├── src/
│   │   ├── claudeService.js   # Claude API integration
│   │   └── db.js              # PostgreSQL connection
│   ├── docker-compose.yml     # PostgreSQL container
│   ├── index.js               # Express server
│   └── package.json
├── web/
│   └── src/
│       └── App.js             # React dashboard
├── mobile/
│   └── App.js                 # React Native app
└── README.md
```

---

## Key Engineering Decisions

**Why Claude API for receipt scanning?**
Receipt photos are unpredictable — blurry, crumpled, or angled. Claude reads them like a human would and returns clean structured JSON directly, no extra parsing needed.

**Why Docker for PostgreSQL?**
The entire database setup lives in one file. Anyone cloning the repo runs `docker-compose up -d` and gets an identical environment in seconds, no manual installation required.

**Why Nginx as a reverse proxy?**
Node.js shouldn't run directly on port 443 — that requires root access, which is a security risk. Nginx handles HTTPS and forwards clean traffic to Node.js on port 3000.

**Why heic-convert on the backend?**
iPhones save photos as HEIC by default, which Claude doesn't support. The backend converts automatically so the mobile app stays simple — it just sends whatever photo the user picks.

---

## License

MIT
