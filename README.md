# Liar's Dice Cup

A phone-friendly stand-in for one player's dice cup in Liar's Dice. Roll your hand,
keep it hidden from the table, and peek whenever you like.

**Live:** https://connorld.github.io/liars-dice/

## Using it

- **Roll** shakes your dice. They land face-down under the cup.
- **Hold the cup** to peek at your hand; let go and it hides again.
  Switch *Peek mode* to **Tap** if you would rather tap once to open and once to close.
- **Padlock** (beside Roll) makes Roll inert so a stray tap mid-round cannot
  destroy your hand. Tapping a locked Roll nudges the padlock and says why
  rather than silently doing nothing.
- **− / +** change how many dice you have (1–6) when you lose or gain one.
  Changing the count clears the old hand so you never read a stale roll, and
  releases the lock, since a new round means you need to roll.
- **New game** resets everyone to five dice.
- **?** opens the rules and the order of play. Dismiss it with the X, the
  backdrop, or Escape.

- **People icon** opens connected play (see below). Solo is the default and the
  app never touches the network unless you open it.

Your dice count, peek mode, lock state, name, and current hand survive a refresh. The cup is always
closed when the page loads, and it snaps shut if the app is backgrounded.

## Playing together

One player creates a game and gets a four-character code; everyone else joins by
code or by opening the invite link (`.../#CODE`). Each player keeps rolling and
peeking privately; at the end of a round everyone presses **Reveal** and all the
dice appear on every phone. The next roll hides them again.

**How it connects.** Phones talk directly over WebRTC. The free public PeerJS
broker (`0.peerjs.com`) is used only to introduce peers — no game data passes
through it, and there is no account or API key. The room code *is* the host's
peer id (`lwdice-<CODE>`), so no lobby service is needed. The library is loaded
from a CDN, pinned and SRI-checked, and only when you open connected play.

**Topology.** The creator is the host and relays: guests connect to the host,
and the host rebroadcasts the whole table. It follows that if the host leaves,
the game ends and everyone is told; guests can come and go freely.

**Hidden dice stay hidden.** Dice values are never transmitted while they are
under your cup — only a SHA-256 commitment to them. Sending the values early and
merely hiding them in the UI would leak the whole game to anyone with devtools
open. At reveal you send the values plus the salt, and every other player checks
them against the commitment you published when you rolled, so a modified client
cannot change its dice after the bidding.

## Implementation

Static page, no build step, no dependencies: `index.html`, `styles.css`, `app.js`.
`index.html` loads the CSS and JS with a `?v=N` query; **bump that number whenever
you change either file**, or returning players can run new markup against a
script GitHub Pages still has cached (`max-age=600`).
Rolls use `crypto.getRandomValues` with rejection sampling so all six faces are
equally likely. Served from GitHub Pages off `main`.

To run locally, open `index.html` in a browser, or:

```sh
python3 -m http.server 8000
```
