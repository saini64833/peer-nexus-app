<div align="center">

# PeerNexus

**A browser-based P2P workspace — file drops, persistent chat, and live video matchmaking, all without leaving your tab.**

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat&logo=node.js)](https://nodejs.org)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.8-010101?style=flat&logo=socket.io)](https://socket.io)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=flat&logo=mongodb)](https://mongodb.com)
[![Stripe](https://img.shields.io/badge/Stripe-Billing-635BFF?style=flat&logo=stripe)](https://stripe.com)
[![WebRTC](https://img.shields.io/badge/WebRTC-P2P-333333?style=flat)](https://webrtc.org)

[Live Demo](https://peer-nexus-app.vercel.app) · [Report Bug](https://github.com/your-username/peer-nexus/issues) · [Request Feature](https://github.com/your-username/peer-nexus/issues)

</div>

---

## What is PeerNexus?

PeerNexus is a full-stack real-time collaboration platform that turns your browser into a complete peer-to-peer workspace. It combines three powerful modules:

- **📁 File Drop** — drag and drop any file directly to a peer via WebRTC DataChannels. Files never touch the server.
- **💬 Messages** — WhatsApp-style persistent chat with real-time delivery, typing indicators, read receipts, and image sharing.
- **📹 Go Live** — Omegle-style random video matchmaking using WebRTC streams (Premium feature).

---

## Features

### Core
- JWT authentication with httpOnly cookie sessions and silent token refresh
- Avatar upload via Cloudinary on registration
- Real-time presence — see who is online across the network
- Persistent message history stored in MongoDB
- Image sharing in chat with full-screen lightbox
- P2P file transfer with live progress tracking — zero server storage
- Soft-delete messages

### Matchmaking (Premium)
- Random video call queue powered by Socket.io signaling
- WebRTC offer/answer/ICE relay through the server
- Auto-cleanup on disconnect or skip

### Billing
- Stripe Checkout for Pro subscriptions
- Stripe Customer Portal for managing and cancelling plans
- Webhook fulfillment — `isPremium` flag updated automatically on payment events

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, React Router v7, Socket.io Client, simple-peer |
| Backend | Node.js, Express 5, Socket.io 4.8 |
| Database | MongoDB, Mongoose 9 |
| Auth | JWT (access + refresh tokens), bcryptjs, httpOnly cookies |
| Media | Cloudinary (avatar + image storage), Multer |
| Payments | Stripe (Checkout, Portal, Webhooks) |
| Realtime | Socket.io (chat, presence, signaling, matchmaking) |
| P2P | WebRTC DataChannels via simple-peer |
| Deployment | Vercel (client) · Render (server) |

---

## Project Structure

```
peer-nexus-app-main/
│
├── client/                        # React + Vite frontend
│   └── src/
│       ├── components/            # Navbar, Loader
│       ├── context/               # AuthContext, SocketContext
│       ├── features/
│       │   ├── auth/              # LoginForm, RegisterForm
│       │   ├── messaging/         # ContactList, ChatWindow, MessageBubble
│       │   ├── billing/           # CheckoutButton, PricingTierCard
│       │   └── webrtc/            # P2PDropzone, VideoPlayer, MatchmakingSpinner
│       ├── hooks/                 # useChatScroll, useWebRTC
│       ├── pages/                 # Home, Dashboard, WhatsAppClone, FileDrop,
│       │   │                      #   OmegleCloneRoom, Pricing
│       └── services/              # api.js (axios), stripe.js
│
└── server/                        # Express + Socket.io backend
    └── src/
        ├── controllers/           # authController, chatController, paymentController
        ├── db/                    # MongoDB connection, Stripe singleton
        ├── middleware/            # requireAuth, multer, stripeWebhookParser
        ├── models/                # User, Conversation, Message, Subscription
        ├── routes/                # authRoutes, chatRoutes, paymentRoutes
        ├── sockets/               # socketIndex, chatSocket, signaling, matchmaking
        └── utils/                 # asyncHandler, apiError, apiResponse, cloudinary
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (free tier works)
- Cloudinary account (free tier works)
- Stripe account (test mode)

### 1. Clone the repo

```bash
git clone https://github.com/your-username/peer-nexus.git
cd peer-nexus
```

### 2. Server setup

```bash
cd server
npm install
```

Create `server/.env`:

```env
PORT=8080
NODE_ENV=development
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/peer-nexus
CORS_ORIGIN=http://localhost:5173
CLIENT_URL=http://localhost:5173

ACCESS_TOKEN_SECRET=your_access_secret_min_32_chars
ACCESS_TOKEN_EXPIRY=1d
REFERESH_TOKEN_SECRET=your_refresh_secret_min_32_chars
REFERESH_TOKEN_EXPIRY=7d

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

STRIPE_SECRET_KEY=sk_test_51...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
```

```bash
npm run dev
# Server runs on http://localhost:8080
```

### 3. Client setup

```bash
cd client
npm install
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:8080/api/v1
VITE_SOCKET_URL=http://localhost:8080
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51...
```

```bash
npm run dev
# Client runs on http://localhost:5173
```

### 4. Stripe webhook (for local testing)

```bash
# Install Stripe CLI then run:
stripe listen --forward-to http://localhost:8080/api/v1/payment/webhook
# Copy the whsec_... printed and paste it into server/.env as STRIPE_WEBHOOK_SECRET
```

### 5. Test a payment

Use card `4242 4242 4242 4242` · expiry `12/34` · CVC `123` — no real money is charged.

---

## API Reference

### Auth — `/api/v1/auth`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/register` | Register with avatar upload |
| POST | `/login` | Login, sets httpOnly cookies |
| POST | `/logout` | Clear session |
| POST | `/refresh` | Silent token refresh |
| GET | `/me` | Get current user profile |
| PATCH | `/me` | Update profile |
| PATCH | `/change-password` | Change password |

### Chat — `/api/v1/chat`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/conversations` | All conversations (with unread count) |
| POST | `/conversations` | Get or create DM conversation |
| GET | `/conversations/:id/messages` | Paginated message history |
| POST | `/conversations/:id/messages` | Send text message |
| POST | `/conversations/:id/messages/image` | Send image (Cloudinary) |
| POST | `/conversations/:id/messages/file` | Register P2P file metadata |
| PATCH | `/conversations/:id/messages/read` | Mark all as read |
| DELETE | `/conversations/:id/messages/:msgId` | Soft-delete a message |
| GET | `/users/search?q=` | Search users by name/username |

### Payment — `/api/v1/payment`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/checkout` | Create Stripe Checkout session |
| POST | `/portal` | Open Stripe billing portal |
| GET | `/subscription` | Get subscription status |
| POST | `/webhook` | Stripe webhook handler |

---

## Socket.io Events

### Chat
| Direction | Event | Payload |
|---|---|---|
| Client → Server | `chat:join` | `{ conversationId }` |
| Client → Server | `chat:message` | `{ conversationId, content }` |
| Client → Server | `chat:typing` | `{ conversationId, isTyping }` |
| Client → Server | `chat:read` | `{ conversationId }` |
| Server → Client | `chat:message` | Message object |
| Server → Client | `chat:typing` | `{ conversationId, userId, isTyping }` |
| Server → Client | `chat:read` | `{ conversationId, readBy }` |

### Presence
| Direction | Event | Payload |
|---|---|---|
| Server → Client | `presence:online_users` | `[userId, ...]` |
| Server → Client | `presence:user_online` | `userId` |
| Server → Client | `presence:user_offline` | `userId` |

### WebRTC Signaling
| Direction | Event | Payload |
|---|---|---|
| Client → Server | `webrtc:offer` | `{ targetId, offer, transferId? }` |
| Client → Server | `webrtc:answer` | `{ targetId, answer, transferId? }` |
| Client → Server | `webrtc:ice-candidate` | `{ targetId, candidate }` |
| Client → Server | `webrtc:hangup` | `{ targetId }` |
| Client → Server | `webrtc:call-user` | `{ targetId }` |
| Server → Client | `webrtc:incoming-call` | `{ from, fromUser }` |

### Matchmaking
| Direction | Event | Payload |
|---|---|---|
| Client → Server | `matchmaking:join` | — |
| Client → Server | `matchmaking:skip` | — |
| Client → Server | `matchmaking:leave` | — |
| Server → Client | `matchmaking:matched` | `{ roomId, peer, initiator }` |
| Server → Client | `matchmaking:waiting` | `{ position }` |
| Server → Client | `matchmaking:peer_left` | `{ reason }` |

---

## Deployment

| Service | Platform | Config |
|---|---|---|
| Client | Vercel | Root dir: `client` · Add `client/public/vercel.json` for SPA routing |
| Server | Render | Root dir: `server` · Start: `node src/index.js` |

### `client/public/vercel.json`
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

Set all environment variables in the Render and Vercel dashboards matching the `.env` files above, using production URLs and live Stripe keys when ready.

---

## Environment Variables Summary

| Variable | Where | Description |
|---|---|---|
| `MONGODB_URI` | Server | MongoDB Atlas connection string |
| `ACCESS_TOKEN_SECRET` | Server | JWT signing secret |
| `REFERESH_TOKEN_SECRET` | Server | Refresh token secret (note: typo kept for compatibility) |
| `CLOUDINARY_*` | Server | Cloud name, API key, API secret |
| `STRIPE_SECRET_KEY` | Server | `sk_test_` or `sk_live_` |
| `STRIPE_WEBHOOK_SECRET` | Server | `whsec_` from Stripe Dashboard endpoint |
| `STRIPE_PRICE_PRO_MONTHLY` | Server | `price_` ID from Stripe product |
| `CORS_ORIGIN` | Server | Exact Vercel URL (no trailing slash) |
| `CLIENT_URL` | Server | Same as CORS_ORIGIN, used in Stripe redirects |
| `VITE_API_URL` | Client | Render server URL + `/api/v1` |
| `VITE_SOCKET_URL` | Client | Render server URL (no path) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Client | `pk_test_` or `pk_live_` |

---

## License

MIT — free to use, modify, and distribute.

---

<div align="center">
Built with WebRTC · Socket.io · React · Node.js
</div>