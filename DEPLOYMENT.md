# 🚀 Nexus Deployment Guide

## Quick Deploy (5 Minutes)

### Option 1: Railway.app (Recommended)

1. **Sign up**: https://railway.app
2. **Install CLI**:
```bash
npm install -g @railway/cli
```

3. **Deploy**:
```bash
railway login
railway init
railway up
```

4. **Add Environment Variables**:
   - Go to Railway dashboard
   - Click your project → Variables
   - Add all variables from `.env` file:
     - `DISCORD_TOKEN`
     - `OWNER_ID`
     - `TOPGG_TOKEN`
     - `DISCORDBOTLIST_TOKEN`
     - `VOIDBOTS_TOKEN`
     - `CLIENT_SECRET`
     - `CLIENT_ID`
     - `ADMIN_PASSWORD`
     - `ADMIN_WEBHOOK_URL`
     - `DASHBOARD_URL` (get this from Railway after deploy)

5. **Update DASHBOARD_URL**:
   - Copy your Railway URL (e.g. `https://nexus-production.up.railway.app`)
   - Update `DASHBOARD_URL` env variable in Railway
   - Redeploy

---

### Option 2: Render.com

1. **Sign up**: https://render.com
2. **New Web Service** → Connect GitHub repo
3. **Settings**:
   - Name: `nexus-bot`
   - Build Command: `npm install`
   - Start Command: `node index.js`
   - Plan: Free
4. **Environment Variables**: Add all from `.env`
5. **Deploy**

---

### Option 3: VPS (DigitalOcean/Hetzner)

```bash
# 1. SSH into your VPS
ssh root@your-server-ip

# 2. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install PM2
npm install -g pm2

# 4. Clone repo
git clone https://github.com/Azzraya/Nexus.git
cd Nexus

# 5. Install dependencies
npm install

# 6. Create .env file
nano .env
# (paste your environment variables)

# 7. Start with PM2
pm2 start index.js --name nexus
pm2 save
pm2 startup

# 8. Enable auto-restart
pm2 logs nexus
```

---

## Post-Deployment Checklist

- [ ] Bot shows as online in Discord
- [ ] Test `/help` command
- [ ] Test `/performance` command
- [ ] Check dashboard loads
- [ ] Verify database persists
- [ ] Set up monitoring (UptimeRobot)
- [ ] Update invite links
- [ ] Test API endpoints

---

## Monitoring Setup

### UptimeRobot (Free)

1. Sign up: https://uptimerobot.com
2. Add New Monitor:
   - Type: HTTP(s)
   - URL: Your dashboard URL
   - Interval: 5 minutes
3. Get alerts via Discord webhook

---

## Troubleshooting

### Bot not starting?
```bash
# Check logs
railway logs
# or
pm2 logs nexus
```

### Database errors?
```bash
# Ensure data/ directory exists
mkdir -p data
chmod 755 data
```

### Commands not working?
```bash
# Re-register slash commands
node deploy-commands.js
```

---

## Production Best Practices

### 1. Enable Error Tracking

Install Sentry:
```bash
npm install @sentry/node
```

Add to `index.js`:
```javascript
const Sentry = require('@sentry/node');
Sentry.init({ dsn: 'your-dsn' });
```

### 2. Daily Database Backups

Add to cron (VPS):
```bash
0 2 * * * cp /path/to/data/nexus.db /path/to/backups/nexus-$(date +\%Y\%m\%d).db
```

### 3. Monitor Performance

Set up alerts for:
- Uptime < 99%
- Response time > 1s
- Memory usage > 80%
- Error rate > 1%

---

## Scaling

### When to Scale:

- **100+ servers**: Current setup is fine
- **500+ servers**: Add Redis caching
- **1000+ servers**: Consider sharding
- **5000+ servers**: Multiple instances + load balancer

---

## Support

Issues? Check:
1. Railway/Render logs
2. Discord bot status
3. Database file exists
4. All env variables set
5. Node.js version (18+)

Still stuck? Open a GitHub issue.

