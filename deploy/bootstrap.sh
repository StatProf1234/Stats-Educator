#!/usr/bin/env bash
# Rebuild the statseducator.com server from scratch on a fresh Ubuntu box.
#
#   scp -r deploy ubuntu@<new-ip>:/tmp/
#   ssh ubuntu@<new-ip> 'sudo bash /tmp/deploy/bootstrap.sh'
#
# Safe to re-run: every step either overwrites its own file or is a no-op.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEBROOT=/var/www/stats-educator
DOMAIN=statseducator.com

if [ "$(id -u)" -ne 0 ]; then
  echo "run with sudo" >&2
  exit 1
fi

echo "==> packages"
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  nginx rsync certbot python3-certbot-nginx unattended-upgrades

echo "==> directories"
mkdir -p "$WEBROOT" /var/www/maintenance
chown -R ubuntu:ubuntu "$WEBROOT" /var/www/maintenance

echo "==> maintenance page"
install -m 644 -o ubuntu -g ubuntu \
  "$HERE/maintenance/index.html" /var/www/maintenance/index.html

echo "==> helper scripts"
install -m 755 "$HERE/bin/maintenance"       /usr/local/bin/maintenance
install -m 755 "$HERE/bin/precompress-site"  /usr/local/bin/precompress-site

echo "==> nginx"
install -m 644 "$HERE/nginx/maintenance-map.conf" /etc/nginx/conf.d/maintenance-map.conf
# The stored site config carries the certbot TLS block, which references
# certificate files that do not exist yet on a fresh box. Install the plain
# HTTP skeleton first and let certbot add TLS back in the step below.
sed -e '/managed by Certbot/d' \
    -e 's/^    listen \[::\]:443.*$//' \
    -e 's/^    listen 443.*$//' \
    "$HERE/nginx/stats-educator.conf" > /etc/nginx/sites-available/stats-educator
if ! grep -q 'listen 80' /etc/nginx/sites-available/stats-educator; then
  sed -i 's|^    root /var/www/stats-educator;|    listen 80;\n    listen [::]:80;\n\n    root /var/www/stats-educator;|' \
    /etc/nginx/sites-available/stats-educator
fi
ln -sf /etc/nginx/sites-available/stats-educator /etc/nginx/sites-enabled/stats-educator
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable --now nginx
systemctl reload nginx

echo "==> automatic security updates"
dpkg-reconfigure -f noninteractive unattended-upgrades

cat <<NOTE

Done. Remaining manual steps:

  1. Point the DNS A record for $DOMAIN at this machine's IP, and wait for
     it to resolve (dig +short $DOMAIN).
  2. Deploy the site files:
       rsync -rlvz --delete --exclude '.git' --exclude '.github' \\
         --exclude '.gitignore' --exclude 'CLAUDE.md' --exclude 'deploy' \\
         --exclude '*.gz' ./ ubuntu@<ip>:$WEBROOT/
       ssh ubuntu@<ip> 'sudo /usr/local/bin/precompress-site'
  3. Issue the certificate (only after DNS resolves here):
       sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --redirect

NOTE
