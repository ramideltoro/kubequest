#!/usr/bin/env bash
set -euo pipefail
[[ "$1" =~ ^(deploy|rollback)$ && "$2" =~ ^[a-f0-9]{40}$ ]] || exit 64
: "${DEPLOY_SSH_KEY:?}" "${DEPLOY_KNOWN_HOSTS:?}" "${TUNNEL_SERVICE_TOKEN_ID:?}" "${TUNNEL_SERVICE_TOKEN_SECRET:?}"
deploy_temp=$(mktemp -d)
trap 'rm -rf "$deploy_temp"' EXIT
umask 077
printf '%s\n' "$DEPLOY_SSH_KEY" > "$deploy_temp/key"
printf '%s\n' "$DEPLOY_KNOWN_HOSTS" > "$deploy_temp/known_hosts"
curl -fsSL --retry 3 https://github.com/cloudflare/cloudflared/releases/download/2026.9.1/cloudflared-linux-amd64 -o "$deploy_temp/cloudflared"
printf '03f1f25d1cc93b9ad6c60569d44060bc4f17ed97075760ed8cfca4b12dcd68cc  %s\n' "$deploy_temp/cloudflared" | sha256sum --check
chmod 0700 "$deploy_temp/cloudflared"
ssh_args=(-i "$deploy_temp/key" -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$deploy_temp/known_hosts" -o "ProxyCommand=$deploy_temp/cloudflared access ssh --hostname %h" -o ConnectTimeout=30 -o ServerAliveInterval=15 -o ServerAliveCountMax=4 kubequest-deploy@localserver.ramideltoro.com)
if [[ "$1" == deploy ]]; then
  ssh "${ssh_args[@]}" "deploy $2" < release.tar.gz
else
  ssh "${ssh_args[@]}" "rollback $2" < /dev/null
fi
