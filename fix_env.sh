#!/bin/bash
# Write the correct .env file with URL-encoded # in MongoDB URI
cat > /var/www/llms/server/.env << 'ENVEOF'
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://digitalstudy5555_db_user:digital%235555@digitalstudycluster.tkpcaax.mongodb.net/?appName=DigitalStudyCluster
JWT_SECRET=LmsDeploy@d3b64c5eSecure!
ENVEOF

echo "=== .env contents ==="
cat /var/www/llms/server/.env

echo ""
echo "=== Verifying URI password encoding ==="
grep MONGO_URI /var/www/llms/server/.env | sed 's/.*:\(.*\)@.*/Password part: \1/'

echo ""
echo "=== Restarting PM2 ==="
pm2 stop llms
pm2 delete llms
cd /var/www/llms/server
pm2 start server.js --name llms
pm2 save

echo "Waiting 8s for server to start..."
sleep 8

echo ""
echo "=== Health Check ==="
curl -s http://localhost:5000/api/health

echo ""
echo "=== PM2 Status ==="
pm2 status

echo ""
echo "=== Recent logs ==="
pm2 logs llms --lines 15 --nostream
