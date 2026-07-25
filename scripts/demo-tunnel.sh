#!/usr/bin/env bash
# Demo tunnel routine (S3.4 prereq): clean HTTPS origin for the phone flow, one command.
# WebCrypto (IDKit bridge + seal) requires a secure context — see world-testing.md §A.8.
#
# Provider: cloudflared quick tunnel. NOT ngrok — its free-tier interstitial intercepts
# subresource requests with browser user-agents, so stylesheets/JS receive an HTML warning
# page: broken theme, no hydration, half-dead pages (root-caused Sat night; curl with a
# browser UA against a .css returned text/html). Cloudflared has no interstitial.
#
# Cross-platform (macOS + Git Bash/Windows): perl for in-place edits, npx kill-port.
# Usage: ./scripts/demo-tunnel.sh [deadline-minutes]   (default 180)
set -euo pipefail
cd "$(dirname "$0")/.."

MINUTES="${1:-180}"
LOG="${TMPDIR:-/tmp}/seam-tunnel.log"

# 1. Tunnel (reuse if already up)
TUNNEL=$(grep -o "https://[a-z0-9-]*\.trycloudflare\.com" "$LOG" 2>/dev/null | head -1 || true)
if [ -z "$TUNNEL" ] || ! curl -sf -o /dev/null "$TUNNEL"; then
  echo "▶ starting cloudflared…"
  nohup cloudflared tunnel --url http://localhost:3000 > "$LOG" 2>&1 &
  sleep 6
  TUNNEL=$(grep -o "https://[a-z0-9-]*\.trycloudflare\.com" "$LOG" | head -1)
fi
echo "▶ tunnel: $TUNNEL"

# 2. Point APP_URL at the tunnel (QR/join links embed it)
TUNNEL="$TUNNEL" perl -pi -e 's|^APP_URL=.*|APP_URL="$ENV{TUNNEL}"|' .env.local
echo "▶ APP_URL updated"

# 3. Restart the production server (env is read at boot; no rebuild needed)
npx --yes kill-port 3000 >/dev/null 2>&1 || true
sleep 1
nohup npx next start -p 3000 > "${TMPDIR:-/tmp}/seam-next.log" 2>&1 &
sleep 4
echo "▶ server restarted on :3000"

# 4. Fresh demo room with links carrying the HTTPS origin
npx tsx scripts/seed-room.ts "$MINUTES"

echo ""
echo "✔ create rooms at: $TUNNEL/create"
