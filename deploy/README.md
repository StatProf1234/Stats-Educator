# Server configuration

Everything here configures the EC2 machine that serves
<https://statseducator.com>. **None of it is part of the website itself.** The
deploy workflow excludes this whole folder from the rsync, so nothing in here
is ever copied into the public web root.

The site is also mirrored on GitHub Pages, which needs none of this.

## What is in here

| Path | Installed to | Purpose |
|---|---|---|
| `maintenance/index.html` | `/var/www/maintenance/index.html` | Holding page shown while the site is down |
| `bin/maintenance` | `/usr/local/bin/maintenance` | Turns maintenance mode on and off |
| `bin/precompress-site` | `/usr/local/bin/precompress-site` | Builds the `.gz` files nginx serves via `gzip_static` |
| `nginx/stats-educator.conf` | `/etc/nginx/sites-available/stats-educator` | The site config |
| `nginx/maintenance-map.conf` | `/etc/nginx/conf.d/maintenance-map.conf` | Keeps certificate renewals exempt from maintenance mode |
| `bootstrap.sh` | run once | Rebuilds the whole server on a fresh box |

## Maintenance mode

```
ssh statseducator 'sudo maintenance on'      # visitors get the holding page
ssh statseducator 'sudo maintenance off'     # back to normal
ssh statseducator 'sudo maintenance status'  # check
```

The page is served with a 503 status, which tells search engines to come back
later rather than dropping the site from results. It fetches nothing external,
so it renders even when everything else is broken, and it points visitors at
the GitHub Pages backup. It also polls the server and reloads itself as soon
as maintenance is switched off.

To preview it without taking the site down, open
<https://statseducator.com/maintenance-preview>.

## Changing something

These files are the record, not the source of truth. The server is. After
editing anything here you have to copy it up yourself:

```
scp deploy/maintenance/index.html statseducator:/var/www/maintenance/index.html

scp deploy/nginx/stats-educator.conf statseducator:/tmp/site.conf
ssh statseducator 'sudo install -m 644 /tmp/site.conf \
  /etc/nginx/sites-available/stats-educator && sudo nginx -t && sudo systemctl reload nginx'
```

If you change something directly on the server instead, copy it back down and
commit it, or the next person to rebuild the box will quietly lose the change.

## Rebuilding the server

```
scp -r deploy ubuntu@<new-ip>:/tmp/
ssh ubuntu@<new-ip> 'sudo bash /tmp/deploy/bootstrap.sh'
```

Then point DNS at the new machine, rsync the site files up, and run certbot.
The script prints those three steps when it finishes.

One caveat worth knowing: `nginx/stats-educator.conf` is stored exactly as
certbot left it, TLS block and all, and those certificate files will not exist
on a fresh machine. `bootstrap.sh` strips the certbot lines so nginx will
start, then certbot puts them back when you issue the certificate.
