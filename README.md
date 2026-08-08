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

**How it syncs.** The whole game is one small JSON blob on
[textdb.dev](https://textdb.dev), a free public text bin — no account, no API
key, no backend of ours, nothing embedded in the page. The blob key is
`liarsdice-v1-<CODE>`, so the game code is all anyone needs to find it. Every
player polls it every 1.5s and writes only their own slot, merged into the copy
they just read.

There is no host and no server logic: each player is just another slot in the
blob. Your slot key is a device id kept in `localStorage` and reused across
games and reloads, so refreshing or re-opening an invite link **reclaims** your
existing slot instead of adding a duplicate. Round state (hand, commitment,
whether you have revealed) is saved against the game code, so a refresh puts you
back exactly where you were — while joining a *different* game starts you hidden,
so a stale reveal cannot follow you across. Writes happen on a roll, a reveal, a name change, and a heartbeat every
8s, so simultaneous writes are rare — and a clobbered write heals within a
heartbeat, because everyone keeps re-asserting their own slot. Players who stop
refreshing disappear from the table after 45s. Staleness is measured by when
*this* device last saw a slot change, never by comparing clocks, because phone
clocks disagree and would evict live players.

If the bin is unreachable the app says "connection lost", keeps retrying, and
every solo feature carries on working.

**Hidden dice stay hidden.** Dice values are never uploaded while they are under
your cup — only a SHA-256 commitment to them. The bin is public and
unauthenticated, so writing hidden dice and merely hiding them in the UI would
put every hand at a URL anyone with the code can read. At reveal you upload the
values plus the salt, and every other player checks them against the commitment
you published when you rolled, so a modified client cannot change its dice after
the bidding.

**What this means for privacy.** Anyone who knows or guesses a game code can read
that game's blob and overwrite it. Codes are six characters from a 32-character
alphabet (about 1.07 billion), and only revealed dice — public information at the
showdown anyway — plus names and dice counts are ever written. Do not treat the
code as a secret worth anything else.

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
