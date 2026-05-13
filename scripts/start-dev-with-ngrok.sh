#!/bin/bash
# Start development server and ngrok tunnel in parallel
# Usage: ./scripts/start-dev-with-ngrok.sh

echo "🚀 Starting SSELFIE development server with ngrok..."
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed"
    echo "   Install it: brew install ngrok/ngrok/ngrok"
    echo "   Or visit: https://ngrok.com/download"
    exit 1
fi

# Check if dev server is already running
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Dev server already running on port 3000"
    DEV_SERVER_RUNNING=true
else
    echo "🚀 Starting dev server..."
    pnpm dev &
    DEV_PID=$!
    DEV_SERVER_RUNNING=false
    
    echo "⏳ Waiting for dev server to start..."
    for i in {1..30}; do
        if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
            echo "✅ Dev server is ready!"
            DEV_SERVER_RUNNING=true
            break
        fi
        sleep 1
    done
    
    if [ "$DEV_SERVER_RUNNING" != "true" ]; then
        echo "❌ Dev server failed to start"
        kill $DEV_PID 2>/dev/null
        exit 1
    fi
fi

# Check if ngrok is already running
if curl -s http://localhost:4040/api/tunnels > /dev/null 2>&1; then
    echo "✅ ngrok is already running"
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*"' | head -1 | grep -o 'https://[^"]*')
    echo "🌐 Current ngrok URL: $NGROK_URL"
else
    echo "🌐 Starting ngrok tunnel..."
    ngrok http 3000 > /tmp/ngrok.log 2>&1 &
    NGROK_PID=$!
    
    echo "⏳ Waiting for ngrok to start..."
    sleep 3
    
    # Get ngrok URL
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"https://[^"]*"' | head -1 | grep -o 'https://[^"]*' || echo "")
    
    if [ -z "$NGROK_URL" ]; then
        echo "⚠️  Could not get ngrok URL automatically"
        echo "   Check ngrok dashboard: http://localhost:4040"
    else
        echo "✅ ngrok tunnel is ready!"
        echo "🌐 ngrok URL: $NGROK_URL"
    fi
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ Development Environment Ready!"
echo ""
echo "📡 Dev Server:    http://localhost:3000"
echo "🌐 ngrok Tunnel:  $NGROK_URL"
echo ""
echo "📋 Next Steps:"
echo "   1. Update ChatGPT Development Action server URL to:"
echo "      $NGROK_URL"
echo ""
echo "   2. Use this URL in your OpenAPI schema:"
echo "      servers:"
echo "        - url: $NGROK_URL"
echo ""
echo "   3. Test in ChatGPT: 'Read the README.md file'"
echo ""
echo "⚠️  Press Ctrl+C to stop both dev server and ngrok"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    if [ -n "$DEV_PID" ]; then
        kill $DEV_PID 2>/dev/null
        echo "✅ Dev server stopped"
    fi
    if [ -n "$NGROK_PID" ]; then
        kill $NGROK_PID 2>/dev/null
        echo "✅ ngrok stopped"
    fi
    exit 0
}

# Trap Ctrl+C
trap cleanup INT

# Keep script running
wait
