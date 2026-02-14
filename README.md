# BTJ RSS Reader

A Next.js RSS reader that connects to Feedly, shows unread entries in a list, opens selected content, and marks entries as read when clicked.

## Requirements

- Node.js 20+
- One of:
   - A temporary Feedly access token (`FEEDLY_ACCESS_TOKEN`), or
   - A Feedly developer app (client ID + client secret)

## Setup

1. Copy environment settings:
   - `cp .env.example .env.local`
2. Choose one auth mode in `.env.local`:
   - Token mode (fastest for local testing):
     - Set `FEEDLY_ACCESS_TOKEN` with your temporary bearer token.
   - OAuth mode:
     - Set `FEEDLY_CLIENT_ID`, `FEEDLY_CLIENT_SECRET`, and `FEEDLY_REDIRECT_URI`.
     - In Feedly app settings, add redirect URI `http://localhost:3000/api/feedly/callback`.
4. Install dependencies:
   - `npm install`
5. Start the app:
   - `npm run dev`

## Usage

1. Open `http://localhost:3000`.
2. If using OAuth mode, click **Connect Feedly Account** and authorize access.
3. Click an article in the left list:
   - It opens in the reader pane.
   - It is marked as read in Feedly.

## Available Scripts

- `npm run dev` - start development server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - run ESLint
