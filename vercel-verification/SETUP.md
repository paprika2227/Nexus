# Vercel Verification Setup Guide

Complete guide to set up web verification for Nexus Bot on Vercel.

## 📋 Prerequisites

1. Vercel account (free tier works)
2. Your bot running and accessible (for webhook)
3. Node.js installed (for local testing)

## 🚀 Step-by-Step Setup

### Step 1: Deploy to Vercel

#### Option A: Using Vercel CLI (Recommended)

```bash
# Install Vercel CLI globally
npm i -g vercel

# Navigate to vercel-verification directory
cd vercel-verification

# Deploy
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? (Select your account)
# - Link to existing project? No
# - Project name? nexus-verification (or your choice)
# - Directory? ./
# - Override settings? No
```

#### Option B: Using Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your Git repository (or drag & drop the `vercel-verification` folder)
4. Configure:
   - Framework Preset: Other
   - Root Directory: `vercel-verification`
5. Click "Deploy"

### Step 2: Set Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables:

**Add:**
- **Key:** `BOT_WEBHOOK_URL`
- **Value:** Your bot's webhook URL (see below for options)

#### Webhook URL Options:

**Option 1: Local Development (ngrok)**
```bash
# Install ngrok
npm i -g ngrok

# Start ngrok tunnel
ngrok http 3001

# Use the HTTPS URL: https://xxxxx.ngrok.io/webhook/verify
```

**Option 2: Server with Public IP**
```
http://your-server-ip:3001/webhook/verify
```

**Option 3: Server with Domain**
```
https://your-domain.com/webhook/verify
```

**Option 4: Cloudflare Tunnel / Other Tunnel**
```
https://your-tunnel-url.com/webhook/verify
```

### Step 3: Get Your Stable Production URL

After deployment, Vercel provides two types of URLs:

**Preview URLs (change each deployment):**
- `https://vercel-verification-{hash}.vercel.app` ❌ Don't use this

**Production URL (stable, always the same):**
- `https://vercel-verification.vercel.app` ✅ Use this one!

To get your production URL:
1. Go to Vercel Dashboard → Your Project
2. Look for "Production" deployment
3. The URL will be: `https://{project-name}.vercel.app`
4. In your case: `https://vercel-verification.vercel.app`

**Note:** You can also set a custom domain in Vercel Settings → Domains

### Step 4: Update Bot Environment

Add to your bot's `.env` file:

```env
# Webhook server port (default: 3001)
WEBHOOK_PORT=3001

# Vercel verification URL
VERIFICATION_WEB_URL=https://your-vercel-url.vercel.app
```

**Example:**
```env
WEBHOOK_PORT=3001
VERIFICATION_WEB_URL=https://nexus-verification.vercel.app
```

### Step 5: Start Your Bot

The webhook server will automatically start when you run your bot:

```bash
node index.js
# or
node shard.js
```

You should see:
```
[Webhook] Verification webhook server running on port 3001
[Webhook] Webhook URL: http://localhost:3001/webhook/verify
```

### Step 6: Test Verification

1. Set up verification in a test server:
   ```
   /verify setup role:@Verified mode:web
   ```

2. Join the server with a test account

3. Click the verification link in the DM

4. Should redirect to Vercel and complete verification

## 🔧 Troubleshooting

### Webhook Not Working

**Check:**
1. Bot webhook server is running (check logs)
2. Port 3001 is accessible from internet
3. `BOT_WEBHOOK_URL` in Vercel matches your webhook URL
4. Firewall allows port 3001

**Test webhook manually:**
```bash
curl -X POST http://your-webhook-url/webhook/verify \
  -H "Content-Type: application/json" \
  -d '{"token":"test","verificationId":"test"}'
```

### Vercel Deployment Issues

**Check:**
1. All files are in `vercel-verification/` directory
2. `package.json` exists
3. Vercel build logs for errors

### Verification Not Completing

**Check:**
1. Token hasn't expired (1 hour limit)
2. Token hasn't been used already
3. Bot webhook server is accessible
4. Database connection is working

## 📝 File Structure

```
vercel-verification/
├── api/
│   └── verify.js          # API endpoint
├── public/
│   └── index.html         # Verification page
├── package.json
├── vercel.json
├── README.md
└── SETUP.md
```

## 🔒 Security Notes

- Tokens expire after 1 hour
- Each token can only be used once
- Webhook should be on HTTPS in production
- Consider adding rate limiting to webhook endpoint

## 🎯 Next Steps

1. Deploy to Vercel
2. Set environment variables
3. Update bot `.env`
4. Test verification
5. Configure custom domain (optional)

## 💡 Tips

- Use ngrok for local development
- Use Cloudflare Tunnel for production (free)
- Monitor Vercel logs for debugging
- Check bot logs for webhook requests

