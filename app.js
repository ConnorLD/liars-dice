(function () {
  'use strict';

  var MIN_DICE = 1;
  var MAX_DICE = 6;
  var START_DICE = 5;
  var STORE_KEY = 'liars-dice-v1';

  var cup = document.getElementById('cup');
  var tray = document.getElementById('tray');
  var lidText = document.getElementById('lidText');
  var lidSub = document.getElementById('lidSub');
  var tally = document.getElementById('tally');
  var hint = document.getElementById('hint');
  var rollBtn = document.getElementById('rollBtn');
  var lockBtn = document.getElementById('lockBtn');
  var minusBtn = document.getElementById('minusBtn');
  var plusBtn = document.getElementById('plusBtn');
  var countValue = document.getElementById('countValue');
  var modeBtn = document.getElementById('modeBtn');
  var modeText = document.getElementById('modeText');
  var resetBtn = document.getElementById('resetBtn');
  var helpBtn = document.getElementById('helpBtn');
  var helpDialog = document.getElementById('helpDialog');
  var helpClose = document.getElementById('helpClose');

  var state = {
    count: START_DICE,
    values: [],      // empty until rolled
    mode: 'hold',    // 'hold' | 'tap'
    locked: false,   // padlock: guards Roll against a mid-round fat finger
    open: false      // never persisted: the cup always starts closed
  };

  // ---------- persistence ----------

  function load() {
    var raw;
    try { raw = window.localStorage.getItem(STORE_KEY); } catch (e) { return; }
    if (!raw) return;
    var saved;
    try { saved = JSON.parse(raw); } catch (e) { return; }
    if (!saved || typeof saved !== 'object') return;

    if (typeof saved.count === 'number') {
      state.count = Math.min(MAX_DICE, Math.max(MIN_DICE, Math.round(saved.count)));
    }
    if (saved.mode === 'tap' || saved.mode === 'hold') state.mode = saved.mode;
    if (typeof saved.locked === 'boolean') state.locked = saved.locked;
    if (Array.isArray(saved.values) && saved.values.length === state.count) {
      state.values = saved.values.filter(function (v) {
        return typeof v === 'number' && v >= 1 && v <= 6;
      });
      if (state.values.length !== state.count) state.values = [];
    }
  }

  function save() {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify({
        count: state.count, values: state.values, mode: state.mode, locked: state.locked
      }));
    } catch (e) { /* private mode / storage full: the app still works */ }
  }

  // ---------- fair dice ----------

  function d6() {
    if (window.crypto && window.crypto.getRandomValues) {
      var buf = new Uint8Array(1);
      // Reject the tail of the byte range so all six faces stay equally likely.
      do { window.crypto.getRandomValues(buf); } while (buf[0] > 251);
      return (buf[0] % 6) + 1;
    }
    return Math.floor(Math.random() * 6) + 1;
  }

  // ---------- rendering ----------

  var PIPS = {
    1: [5],
    2: [1, 9],
    3: [1, 5, 9],
    4: [1, 3, 7, 9],
    5: [1, 3, 5, 7, 9],
    6: [1, 3, 4, 6, 7, 9]
  };

  function dieEl(value) {
    var die = document.createElement('div');
    die.className = 'die';
    die.setAttribute('role', 'img');
    die.setAttribute('aria-label', value + '');
    PIPS[value].forEach(function (slot) {
      var pip = document.createElement('span');
      pip.className = 'pip p' + slot;
      die.appendChild(pip);
    });
    return die;
  }

  var WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'];

  function tallyText(values) {
    var counts = {};
    values.forEach(function (v) { counts[v] = (counts[v] || 0) + 1; });
    return Object.keys(counts).sort().map(function (face) {
      var n = counts[face];
      return WORDS[n] + ' ' + face + (n > 1 ? 's' : '');
    }).join('  ·  ');
  }

  function render() {
    countValue.textContent = state.count;
    minusBtn.disabled = state.count <= MIN_DICE;
    plusBtn.disabled = state.count >= MAX_DICE;

    modeText.textContent = state.mode === 'hold' ? 'Hold' : 'Tap';
    modeBtn.setAttribute('aria-pressed', state.mode === 'tap' ? 'true' : 'false');

    // aria-disabled rather than disabled: a dead button explains nothing, so
    // Roll stays focusable and answers a tap by pointing at the padlock.
    rollBtn.setAttribute('aria-disabled', state.locked ? 'true' : 'false');
    lockBtn.setAttribute('aria-pressed', state.locked ? 'true' : 'false');
    lockBtn.setAttribute('aria-label',
      state.locked ? 'Unlock the Roll button' : 'Lock the Roll button');

    var rolled = state.values.length > 0;

    tray.replaceChildren();
    // Sorted low-to-high so a hand is easy to read at a glance.
    state.values.slice().sort().forEach(function (v) { tray.appendChild(dieEl(v)); });

    if (rolled) {
      lidText.textContent = state.mode === 'hold' ? 'Hold to peek' : 'Tap to peek';
      lidSub.textContent = state.count + (state.count === 1 ? ' die' : ' dice') + ' under the cup';
    } else {
      lidText.textContent = 'Not rolled yet';
      lidSub.textContent = 'Press Roll to shake ' + state.count +
        (state.count === 1 ? ' die' : ' dice');
    }

    cup.classList.toggle('open', state.open && rolled);
    tally.textContent = (state.open && rolled) ? tallyText(state.values) : '';

    cup.setAttribute('aria-label', rolled
      ? 'Dice cup with ' + state.count + ' dice. ' +
        (state.mode === 'hold' ? 'Press and hold to peek.' : 'Tap to peek.')
      : 'Empty dice cup. Press Roll first.');
  }

  function setHint(text) { hint.textContent = text; }

  // ---------- actions ----------

  function refuseRoll() {
    lockBtn.classList.remove('nudge');
    void lockBtn.offsetWidth; // restart the animation on repeat taps
    lockBtn.classList.add('nudge');
    if (navigator.vibrate) navigator.vibrate(12);
    setHint('Roll is locked. Tap the padlock to unlock it.');
  }

  function roll() {
    if (state.locked) { refuseRoll(); return; }

    state.open = false;
    var values = [];
    for (var i = 0; i < state.count; i++) values.push(d6());
    state.values = values;

    cup.classList.add('rolling');
    window.setTimeout(function () { cup.classList.remove('rolling'); }, 400);
    if (navigator.vibrate) navigator.vibrate([14, 40, 22]);

    save();
    render();
    setHint(state.mode === 'hold'
      ? 'Rolled. Hold the cup to look at your hand.'
      : 'Rolled. Tap the cup to look, tap again to hide.');
  }

  function changeCount(delta) {
    var next = Math.min(MAX_DICE, Math.max(MIN_DICE, state.count + delta));
    if (next === state.count) return;
    state.count = next;
    // A stale hand would show the wrong number of dice, so clear it.
    state.values = [];
    state.open = false;
    // Changing the count means a new round is starting and you need to roll,
    // so leaving Roll locked here would just be a dead end.
    state.locked = false;
    save();
    render();
    setHint(delta < 0 ? 'Down to ' + next + '. Roll for the next round.'
                      : 'Now ' + next + '. Roll for the next round.');
  }

  function setOpen(open) {
    if (state.open === open) return;
    state.open = open;
    render();
  }

  // ---------- events ----------

  rollBtn.addEventListener('click', roll);
  minusBtn.addEventListener('click', function () { changeCount(-1); });
  plusBtn.addEventListener('click', function () { changeCount(1); });

  lockBtn.addEventListener('click', function () {
    state.locked = !state.locked;
    save();
    render();
    setHint(state.locked
      ? 'Roll is locked. Your hand is safe from a stray tap.'
      : 'Roll unlocked.');
  });

  modeBtn.addEventListener('click', function () {
    state.mode = state.mode === 'hold' ? 'tap' : 'hold';
    state.open = false;
    save();
    render();
    setHint(state.mode === 'hold'
      ? 'Hold mode: the cup only stays open while you press it.'
      : 'Tap mode: one tap opens, another closes.');
  });

  resetBtn.addEventListener('click', function () {
    state.count = START_DICE;
    state.values = [];
    state.open = false;
    state.locked = false;
    save();
    render();
    setHint('New game. Everyone back to ' + START_DICE + ' dice.');
  });

  // ---------- help ----------

  function openHelp() {
    setOpen(false); // never leave a hand on show behind the dialog
    if (helpDialog.showModal) helpDialog.showModal();
    else helpDialog.setAttribute('open', '');
    helpDialog.querySelector('.help-body').scrollTop = 0;
  }

  function closeHelp() {
    if (helpDialog.close) helpDialog.close();
    else helpDialog.removeAttribute('open');
  }

  helpBtn.addEventListener('click', openHelp);
  helpClose.addEventListener('click', closeHelp);

  // Tapping the backdrop dismisses: the dialog itself is only hit outside the panel.
  helpDialog.addEventListener('click', function (e) {
    if (e.target === helpDialog) closeHelp();
  });

  // Peeking. In hold mode the cup tracks the press; in tap mode it toggles.
  cup.addEventListener('pointerdown', function (e) {
    if (state.mode !== 'hold') return;
    e.preventDefault();
    if (cup.setPointerCapture) {
      try { cup.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }
    setOpen(true);
  });

  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (type) {
    cup.addEventListener(type, function () {
      if (state.mode !== 'hold') return;
      setOpen(false);
    });
  });

  cup.addEventListener('click', function () {
    if (state.mode !== 'tap') return;
    setOpen(!state.open);
  });

  cup.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  // Keyboard: space/enter holds the cup open (hold mode) or toggles it (tap mode).
  cup.addEventListener('keydown', function (e) {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    if (e.repeat) return;
    if (state.mode === 'hold') setOpen(true); else setOpen(!state.open);
  });

  cup.addEventListener('keyup', function (e) {
    if (state.mode !== 'hold') return;
    if (e.key === ' ' || e.key === 'Enter') setOpen(false);
  });

  // Never leave the cup open when the app loses focus or is backgrounded.
  window.addEventListener('blur', function () { setOpen(false); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) setOpen(false);
  });

  load();
  render();
  if (state.locked) {
    setHint('Roll is locked. Tap the padlock when you want a new round.');
  } else if (state.values.length) {
    setHint('Your last roll is still under the cup.');
  }
})();
