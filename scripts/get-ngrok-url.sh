#!/bin/bash
# Get the current ngrok public URL
# Usage: ./scripts/get-ngrok-url.sh

# Check if ngrok is running
if ! curl -s http://localhost:4040/api/tunnels > /dev/null 2>&1; then
    echo "❌ ngrok is not running"
    echo "   Start it with: ngrok http 3000"
    exit 1
fi

# Get ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"https://[^"]*"' | head -1 | grep -o 'https://[^"]*')

if [ -z "$NGROK_URL" ]; then
    echo "❌ Could not get ngrok URL"
    echo "   Check ngrok dashboard: http://localhost:4040"
    exit 1
fi

echo "$NGROK_URL"

