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

Your dice count, peek mode, lock state, and current hand survive a refresh. The cup is always
closed when the page loads, and it snaps shut if the app is backgrounded.

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
