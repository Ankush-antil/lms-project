#!/bin/bash
echo "=== PM2 dump raw ==="
cat /root/.pm2/dump.pm2 | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    # data might be a list directly
    if isinstance(data, list):
        items = data
    else:
        items = data.get('list', data)
    
    for p in items:
        if isinstance(p, dict):
            env = p.get('pm2_env', {})
            name = env.get('name', p.get('name', 'unknown'))
            # check various places env vars could be
            mongo = env.get('MONGO_URI') or env.get('env', {}).get('MONGO_URI') or ''
            print(f'Process: {name}')
            print(f'MONGO_URI: {mongo}')
            # also dump all top-level env keys
            inner = env.get('env', {})
            for k,v in inner.items():
                if 'MONGO' in k.upper() or 'DB' in k.upper():
                    print(f'{k}={v}')
except Exception as e:
    print('Error:', str(e))
    # try raw text search
    sys.exit(0)
"

echo ""
echo "=== Raw search for mongodb in dump ==="
grep -o 'mongodb+srv://[^"\\]*' /root/.pm2/dump.pm2 2>/dev/null | head -5

echo ""
echo "=== Check if there's a backup .env ==="
find /root /var/www/llms -name "*.env*" -o -name ".env.backup" 2>/dev/null | head -10
ls -la /var/www/llms/server/.env* 2>/dev/null
