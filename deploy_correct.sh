#!/bin/bash
echo "=== Writing correct .env with working MongoDB URI ==="
cat > /var/www/llms/server/.env << 'ENVEOF'
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://digitalstudy:digitalstudy%23%405555@digitalstudy.lzqs6z8.mongodb.net/digitalstudy?retryWrites=true&w=majority&appName=Digitalstudy
JWT_SECRET=LmsDeploy@d3b64c5eSecure!
ENVEOF

echo "=== .env written ==="
cat /var/www/llms/server/.env

echo ""
echo "=== Stopping and deleting old PM2 process ==="
pm2 stop llms 2>/dev/null || true
pm2 delete llms 2>/dev/null || true

echo ""
echo "=== Starting fresh PM2 process ==="
cd /var/www/llms/server
pm2 start server.js --name llms
pm2 save

echo "Sleeping 8 seconds for startup..."
sleep 8

echo ""
echo "=== Health check ==="
curl -sv http://localhost:5000/api/health 2>&1 | tail -20

echo ""
echo "=== PM2 status ==="
pm2 list

echo ""
echo "=== Last 20 PM2 out logs ==="
pm2 logs llms --out --lines 20 --nostream

echo ""
echo "=== Last 15 PM2 error logs ==="
pm2 logs llms --err --lines 15 --nostream
