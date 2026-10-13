# Information Security Microservice: Stock Price Checker

A Node.js/Express microservice that exposes a real-time stock price REST API, built to meet the [freeCodeCamp Information Security](https://www.freecodecamp.org/learn/information-security/) curriculum requirements.

---

## Architecture & Security

### Content Security Policy (CSP)
Enforced via **Helmet.js** on every response:

```
Content-Security-Policy:
  default-src 'self';
  script-src  'self';
  style-src   'self';
```

Only same-origin scripts and stylesheets are permitted — third-party injection is blocked at the HTTP header level.

### Anonymized IP Tracking
Raw client IPs are **never stored**. Before persisting, each IP address is irreversibly hashed:

```js
// routes/api.js
function hashIP(ip) {
  return crypto.createHash('sha256').update(ip || '0.0.0.0').digest('hex');
}
```

This satisfies data-minimisation principles (GDPR Art. 5, KVKK) — the database holds only SHA-256 digests, not personally identifiable network data.

### Upstream Proxy
Stock quotes are fetched from **freeCodeCamp's sandboxed proxy** (`stock-price-checker-proxy.freecodecamp.rocks`) — keeping production secrets out of the client and avoiding direct third-party API key exposure.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express 4 |
| Security headers | Helmet.js |
| Database | MongoDB Atlas (via Mongoose) |
| Testing | Mocha + Chai + chai-http |
| Environment | dotenv |

---

## Getting Started

### Prerequisites
- Node.js ≥ 18
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster

### Installation

```bash
git clone https://github.com/<your-username>/stock-price-checker.git
cd stock-price-checker
npm install
```

### Environment Setup

**Never commit `.env`.** Use `sample.env` as your template:

```bash
cp sample.env .env
# then edit .env with your real credentials
```

| Variable | Description |
|---|---|
| `PORT` | HTTP port (default `3000`) |
| `NODE_ENV` | `development` / `test` / `production` |
| `DB` | MongoDB Atlas connection URI |

### Running

```bash
npm start
# Server starts on http://localhost:3000
# Tests run automatically when NODE_ENV=test
```

---

## API Reference

### Single stock quote

```
GET /api/stock-prices?stock=GOOG
```

**Response:**
```json
{
  "stockData": {
    "stock": "GOOG",
    "price": 178.25,
    "likes": 3
  }
}
```

### Single stock quote + like

```
GET /api/stock-prices?stock=GOOG&like=true
```

Each unique IP (anonymised via SHA-256) may like a stock only once. Duplicate likes are silently ignored.

### Two-stock comparison

```
GET /api/stock-prices?stock=GOOG&stock=MSFT
GET /api/stock-prices?stock=GOOG&stock=MSFT&like=true
```

**Response:**
```json
{
  "stockData": [
    { "stock": "GOOG", "price": 178.25, "rel_likes":  1 },
    { "stock": "MSFT", "price": 415.80, "rel_likes": -1 }
  ]
}
```

`rel_likes` is the difference in like counts between the two stocks (`likes_A - likes_B` and `likes_B - likes_A`).

---

## Testing

All **5 functional tests** pass via Mocha/Chai:

| # | Test |
|---|---|
| 1 | Viewing one stock (`GOOG`) — validates `stock`, `price`, `likes` |
| 2 | Liking a stock — `likes` ≥ 1 |
| 3 | Liking same stock again from same IP — count unchanged |
| 4 | Viewing two stocks — returns array, `rel_likes` sum = 0 |
| 5 | Liking two stocks — returns array, `rel_likes` sum = 0 |

Run manually:

```bash
NODE_ENV=test npm start
```

---

## Security Checklist

- [x] Helmet CSP: `script-src 'self'`, `style-src 'self'`
- [x] No raw IPs stored (SHA-256 hashed)
- [x] `.env` excluded via `.gitignore`
- [x] `sample.env` committed as developer reference
- [x] `node_modules/` excluded from version control
- [x] MongoDB URI never hard-coded in source

---

## License

MIT
