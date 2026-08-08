# Liar's Dice Cup

A phone-friendly stand-in for one player's dice cup in Liar's Dice. Roll your hand,
keep it hidden from the table, and peek whenever you like.

**Live:** https://connorld.github.io/liars-dice/

## Using it

- **Roll** shakes your dice. They land face-down under the cup.
- **Hold the cup** to peek at your hand; let go and it hides again.
  Switch *Peek mode* to **Tap** if you would rather tap once to open and once to close.
- **− / +** change how many dice you have (1–6) when you lose or gain one.
  Changing the count clears the old hand so you never read a stale roll.
- **New game** resets everyone to five dice.
- **?** opens the rules and the order of play. Dismiss it with the X, the
  backdrop, or Escape.

Your dice count, peek mode, and current hand survive a refresh. The cup is always
closed when the page loads, and it snaps shut if the app is backgrounded.

## Implementation

Static page, no build step, no dependencies: `index.html`, `styles.css`, `app.js`.
Rolls use `crypto.getRandomValues` with rejection sampling so all six faces are
equally likely. Served from GitHub Pages off `main`.

To run locally, open `index.html` in a browser, or:

```sh
python3 -m http.server 8000
```
