# Security

## What's hardened

**Game server container**

- No extra Linux capabilities (`--cap-drop=ALL` plus only the six the start script needs:
  `CHOWN`, `DAC_OVERRIDE`, `FOWNER`, `SETUID`, `SETGID`, `KILL`)
- `no-new-privileges`, so nothing inside can gain more rights than it starts with
- Memory, CPU and process limits, so a runaway server can't take the host down
- Its own Docker network, so a compromised game server can't reach your other containers directly
- `UMASK=027`, so saves and settings aren't world-writable

**Dashboard**

- `dw-control` is the only container with the Docker socket. It exposes a fixed list of operations on
  one named container — there is no passthrough, no user-supplied container name, no user-supplied
  pattern. It sits on an internal network: no internet access and no published port.
- `dw-dash` has no Docker access at all and is published on one LAN address.
- Both are read-only, unprivileged, `no-new-privileges`, with memory and process limits.
- Login is required for every control. Passwords are stored as a scrypt hash; sessions are
  HttpOnly + SameSite=Strict cookies; failed logins are limited to 5 per 15 minutes per address;
  state-changing requests need a custom header, so another website can't trigger them.
- Log lines are redacted before they leave `dw-control`: the world password appears in every login
  line in the game log (`?p=<base64>`).

## What isn't, and can't be

- **The game doesn't verify player identity.** The server log says it skips verification because it
  isn't a "trusted" dedicated server, which needs signing keys only Jagex can issue. Player IDs can
  in principle be forged, so in-game bans are not airtight.
- **Connections aren't encrypted** for the same reason (no signing keypair).
- **There's no whitelist** in the game. Your options are the world password, the in-game ban list, or
  a firewall allowlist by IP address.
- **Docker socket access is root-equivalent.** `dw-control` holds it. The isolation above limits the
  blast radius, but treat that container as privileged.

## Operational advice

- Forward **only** UDP 7777 (and 8888 if you manage world settings remotely). Never expose the Unraid
  web UI, SSH, or the dashboard to the internet — use WireGuard or Tailscale.
- Use a world password that isn't reused anywhere else. It is shared with everyone who joins and
  appears in the server log.
- Keep backups off the array's cache-only pool if you care about them surviving a disk failure.
