#!/usr/bin/env bash
# Demo tunnel routine (S3.4 prereq): HTTPS origin for the phone flow, one command.
# WebCrypto (IDKit bridge + seal) requires a secure context — see world-testing.md §A.8.
# Cross-platform (macOS + Git Bash/Windows): perl for in-place edits, npx kill-port
# instead of lsof (Frank's review — sed -i '' and lsof are BSD/macOS-only).
# Usage: ./scripts/demo-tunnel.sh [deadline-minutes]   (default 180)
set -euo pipefail
cd "$(dirname "$0")/.."

MINUTES="${1:-180}"

# 1. Tunnel (reuse if already up)
if ! curl -sf http://localhost:4040/api/tunnels >/dev/null 2>&1; then
  echo "▶ starting ngrok…"
  nohup ngrok http 3000 --log=stdout > "${TMPDIR:-/tmp}/seam-ngrok.log" 2>&1 &
  sleep 4
fi
TUNNEL=$(curl -s http://localhost:4040/api/tunnels | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).tunnels[0].public_url))")
echo "▶ tunnel: $TUNNEL"

# 2. Point APP_URL at the tunnel (QR/join links embed it)
TUNNEL="$TUNNEL" perl -pi -e 's|^APP_URL=.*|APP_URL="$ENV{TUNNEL}"|' .env.local
echo "▶ APP_URL updated"

# 3. Rebuild not needed (env is read at boot) — restart the production server
npx --yes kill-port 3000 >/dev/null 2>&1 || true
sleep 1
nohup npx next start -p 3000 > "${TMPDIR:-/tmp}/seam-next.log" 2>&1 &
sleep 4
echo "▶ server restarted on :3000"

# 4. Fresh demo room with links carrying the HTTPS origin
npx tsx scripts/seed-room.ts "$MINUTES"

echo ""
echo "✔ create rooms at: $TUNNEL/create"
echo "  (first visit shows ngrok's interstitial — tap 'Visit Site' once per device)"
