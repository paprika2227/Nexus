# Nexus Bot - Web Verification

Web verification page for Nexus Bot deployed on Vercel.

## Quick Start

1. **Deploy to Vercel:**
   ```bash
   npm i -g vercel
   cd vercel-verification
   vercel
   ```

2. **Set Environment Variable in Vercel:**
   - `BOT_WEBHOOK_URL` = Your bot's webhook URL (e.g., `https://your-domain.com/webhook/verify`)

3. **Update Bot `.env`:**
   ```env
   # Use the STABLE production URL (not the preview URL with hash)
   # Format: https://{project-name}.vercel.app
   VERIFICATION_WEB_URL=https://vercel-verification.vercel.app
   WEBHOOK_PORT=3001
   ```
   
   **Important:** Use the production URL `https://vercel-verification.vercel.app` (no hash), not the preview URLs that change!

4. **Start your bot** (webhook server starts automatically)

## 📖 Full Setup Guide

See [SETUP.md](./SETUP.md) for detailed instructions.

## How It Works

1. User joins server → Bot sends DM with verification link
2. User clicks link → Opens Vercel page
3. Vercel page → Calls `/api/verify` with token
4. API endpoint → Calls bot's webhook server
5. Bot webhook → Validates token and completes verification
6. User gets verified role → Success!

## File Structure

- `api/verify.js` - API endpoint that calls bot webhook
- `public/index.html` - Verification page UI
- `vercel.json` - Vercel configuration

## Testing

Visit: `https://your-vercel-url.vercel.app?token=TEST_TOKEN&id=TEST_ID`

## Notes

- Tokens expire after 1 hour
- Each token can only be used once
- Webhook must be accessible from internet (use ngrok/tunnel for local dev)
