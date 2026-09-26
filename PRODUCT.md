# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One person: the owner of a self-hosted RuneScape: Dragonwilds dedicated server running on their own
Unraid box at home. They are comfortable with Docker, SSH and Unraid, and they also play on the
server. They check it in short glances, usually on a phone, away from the desk — before starting a
play session, or when a friend says they can't connect. Friends who play do not open the dashboard.

## Product Purpose

Answer "is the server fine?" without having to think. One look should settle: is it up and listed in
the in-game browser, is anyone playing, did last night's backup run, and is the game build behind
Steam's. When something is wrong it must be obvious without reading carefully. When everything is
fine the page should be calm and not demand attention.

Secondary: perform the few recovery actions that don't need SSH — start, stop, restart, back up now.

## Positioning

Built for one specific game server on one specific host, so it can be precise where generic container
dashboards are vague: real player names and playtime read from the game's log, the ini settings the
server actually loaded, whether the world save succeeded, and whether the installed Steam build is
behind the public one. A generic Docker dashboard can only say "container running".

## Operating Context

- Runs on Unraid 7.x beside the game server container, reached over the LAN, typically from a phone.
- Two containers: `dw-control` (Docker socket, internal network only) and `dw-dash` (web UI, no
  Docker access). The browser only ever talks to `dw-dash`.
- Facts come from the game's own log file (`Saved/Logs/RSDragonwilds.log`), its `DedicatedServer.ini`,
  SteamCMD's `appmanifest`, the Docker API, and the backup folder.
- Nightly User Script backup at 04:00 restarts the server, which also runs a game update check.
- The game server goes down for minutes at a time during updates; that is normal, not a failure.

## Capabilities and Constraints

- Shows: health, players online, per-player sessions and playtime, recent joins/leaves, CPU/memory
  against their limits, uptime, last world save, backups, grouped errors, live log, game build versus
  Steam's current build.
- Actions behind a login: start, stop, restart, back up now. One operation at a time.
- No npm dependencies; Node standard library only, no build step, no framework. Page assets are
  plain HTML, CSS and JS served from the container. This is deliberate and should stay true.
- Poll-based: state refreshes every 5 s; browsers read one JSON document.
- The game offers no remote console and no whitelist; the dashboard cannot kick or ban.
- Player identity is not verified by the game, so player names are indicative, not proof.
- Secrets never reach the page: the world password appears in the game log and is redacted upstream.

## Brand Commitments

None binding. The subject is RuneScape: Dragonwilds, a survival game in a fantasy world; the product
is not affiliated with Jagex and must not imitate Jagex branding or imply endorsement.

## Evidence on Hand

- A live server with real history: two known players ("oemna", "Undocc"), real sessions and playtime.
- Real failure modes already seen and handled: a stuck SteamCMD update ("Access Denied", state 0x6),
  the block-buffered `docker logs` lag, and game errors that appear on a healthy server.
- No usage analytics, no user research, no other installations. Do not invent any.

## Product Principles

1. **A glance must be enough.** The top of the page answers the question that brought the owner here.
2. **Calm when healthy, loud when not.** Problems earn color and position; normal operation doesn't.
3. **Say what's true, including uncertainty.** "Updating", "couldn't reach Steam" and "no heartbeat
   for 3 minutes" beat a confident wrong state.
4. **Phone first.** The common case is a short one-handed look, not a desk session.
5. **Dangerous actions look dangerous.** Stop, restart and backup disconnect players; they confirm
   and say how many are online.
6. **No dependencies, no build step.** Anything added must survive that constraint.

## Accessibility & Inclusion

No formal standard required, but: never rely on color alone for state, keep contrast legible on a
phone outdoors, respect the viewer's light/dark preference, and keep the log readable at small sizes.
