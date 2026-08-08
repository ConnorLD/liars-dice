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

  var netBtn = document.getElementById('netBtn');
  var netDot = document.getElementById('netDot');
  var netDialog = document.getElementById('netDialog');
  var netClose = document.getElementById('netClose');
  var netOffline = document.getElementById('netOffline');
  var netOnline = document.getElementById('netOnline');
  var nameInput = document.getElementById('nameInput');
  var createBtn = document.getElementById('createBtn');
  var joinForm = document.getElementById('joinForm');
  var codeInput = document.getElementById('codeInput');
  var netCodeEl = document.getElementById('netCode');
  var copyBtn = document.getElementById('copyBtn');
  var netLink = document.getElementById('netLink');
  var netPlayers = document.getElementById('netPlayers');
  var leaveBtn = document.getElementById('leaveBtn');
  var netStatus = document.getElementById('netStatus');
  var tableBar = document.getElementById('tableBar');
  var tableCode = document.getElementById('tableCode');
  var tableWho = document.getElementById('tableWho');
  var revealBtn = document.getElementById('revealBtn');
  var showdown = document.getElementById('showdown');

  var state = {
    count: START_DICE,
    values: [],      // empty until rolled
    mode: 'hold',    // 'hold' | 'tap'
    locked: false,   // padlock: guards Roll against a mid-round fat finger
    open: false,     // never persisted: the cup always starts closed
    name: '',        // how you appear to the rest of the table
    revealed: false, // this round's dice have been shown to the others
    salt: null,      // commit-reveal: proves the revealed dice are the rolled ones
    commit: null
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
    if (typeof saved.name === 'string') state.name = saved.name.slice(0, 14);
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
        count: state.count, values: state.values, mode: state.mode,
        locked: state.locked, name: state.name
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

    renderNet();
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

    // New round: your dice go back under the cup for everyone else too, and a
    // fresh commitment goes out so the table can check your later reveal.
    state.revealed = false;
    state.salt = randomSalt();
    state.commit = null;
    if (net.status === 'live') {
      sendMe();
      sha256Hex(state.salt + ':' + values.join('')).then(function (h) {
        state.commit = h;
        sendMe();
      });
    }

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
    state.revealed = false;
    state.commit = null;
    save();
    sendMe();
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
    state.revealed = false;
    state.commit = null;
    save();
    sendMe();
    render();
    setHint('New game. Everyone back to ' + START_DICE + ' dice.');
  });

  // ---------- connected play ----------
  //
  // No backend of ours: the whole game is one small JSON blob on a free public
  // text bin, keyed by the game code. Everyone polls it and writes only their
  // own slot, merged into the copy they just read. Writes are rare (a roll, a
  // reveal, a heartbeat), so two players clobbering each other is unlikely --
  // and a lost write heals on the next heartbeat, because every player keeps
  // re-asserting its own slot.
  //
  // The bin is public and unauthenticated, so hidden dice are NEVER written to
  // it -- only a hash of them. Uploading hidden dice and merely hiding them in
  // the UI would put every hand at a URL that anyone with the code can read.

  var SYNC_URL = 'https://textdb.dev/api/data/';
  var SYNC_KEY_PREFIX = 'liarsdice-v1-';
  var POLL_MS = 1500;
  var HEARTBEAT_MS = 8000;
  var PLAYER_TTL_MS = 45000;   // a slot nobody refreshes belongs to someone who left
  var MAX_FAILS = 4;
  // No O/0/I/1: codes get read aloud across a table.
  var CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var CODE_LEN = 6;

  var net = {
    code: null,
    myId: null,
    players: {},
    status: 'off',    // off | live
    timer: null,
    lastPush: 0,
    fails: 0,
    writing: false,
    dirty: false,
    offline: false
  };

  // Freshness is tracked by when WE last saw a slot change, never by comparing
  // our clock to theirs -- phone clocks disagree and would evict live players.
  var lastSeen = {};
  var lastSig = {};

  function randomBytes(n) {
    var buf = new Uint8Array(n);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(buf);
    else for (var i = 0; i < n; i++) buf[i] = Math.floor(Math.random() * 256);
    return buf;
  }

  function randomCode() {
    // 256 is a clean multiple of the 32-character alphabet, so no modulo bias.
    var buf = randomBytes(CODE_LEN), out = '';
    for (var i = 0; i < CODE_LEN; i++) out += CODE_ALPHABET.charAt(buf[i] % CODE_ALPHABET.length);
    return out;
  }

  function randomHex(n) {
    return Array.prototype.map.call(randomBytes(n), function (b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('');
  }

  function randomSalt() { return randomHex(8); }

  function sha256Hex(text) {
    if (!window.crypto || !window.crypto.subtle) return Promise.resolve(null);
    return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
      .then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) {
          return ('0' + b.toString(16)).slice(-2);
        }).join('');
      })
      .catch(function () { return null; });
  }

  function selfId() { return net.myId || 'self'; }

  function mySlot() {
    return {
      name: state.name,
      dice: state.count,
      commit: state.commit,
      revealed: state.revealed,
      // The privacy line: dice are uploaded only once you reveal them.
      values: state.revealed ? state.values : null,
      salt: state.revealed ? state.salt : null,
      ts: Date.now()
    };
  }

  function normalise(id, p) {
    p = p || {};
    return {
      id: id,
      name: (typeof p.name === 'string' && p.name.trim()) ? p.name.trim().slice(0, 14) : 'Player',
      dice: typeof p.dice === 'number' ? Math.max(0, Math.min(6, Math.round(p.dice))) : 0,
      commit: typeof p.commit === 'string' ? p.commit : null,
      revealed: !!p.revealed,
      values: Array.isArray(p.values) ? p.values.slice(0, 6) : null,
      salt: typeof p.salt === 'string' ? p.salt : null,
      ts: typeof p.ts === 'number' ? p.ts : 0
    };
  }

  // ---------- the shared blob ----------

  function blobUrl(code) { return SYNC_URL + SYNC_KEY_PREFIX + code; }

  function fetchBlob(code) {
    return fetch(blobUrl(code), { method: 'GET', cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('read ' + r.status);
        return r.text();
      })
      .then(function (text) {
        var empty = { code: code, players: {} };
        if (!text) return empty;
        var data;
        try { data = JSON.parse(text); } catch (e) { return empty; }
        if (!data || typeof data !== 'object' || !data.players || typeof data.players !== 'object') {
          return empty;
        }
        return data;
      });
  }

  function writeBlob(code, data) {
    // text/plain keeps this a CORS "simple request", so there is no preflight.
    return fetch(blobUrl(code), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(data)
    }).then(function (r) {
      if (!r.ok) throw new Error('write ' + r.status);
    });
  }

  // Only used to decide whether a code is already in use, where we have no
  // local history to compare against and must trust their clocks a little.
  function looksOccupied(players) {
    var now = Date.now(), live = 0;
    Object.keys(players || {}).forEach(function (id) {
      var p = players[id];
      if (p && typeof p.ts === 'number' && now - p.ts < PLAYER_TTL_MS) live++;
    });
    return live;
  }

  // Everything about a slot except its heartbeat, for comparing two copies.
  function slotCore(p) {
    return JSON.stringify([p.name, p.dice, p.commit, !!p.revealed, p.values || null]);
  }

  function applyPlayers(players) {
    players = players || {};
    var now = Date.now();
    var next = {};

    Object.keys(players).forEach(function (id) {
      var slot = normalise(id, players[id]);
      var sig = JSON.stringify(slot);
      if (lastSig[id] !== sig) { lastSig[id] = sig; lastSeen[id] = now; }
      if (id === selfId() || now - lastSeen[id] <= PLAYER_TTL_MS) next[id] = slot;
    });

    // We are the authority on ourselves; our own slot may not have landed yet.
    next[selfId()] = normalise(selfId(), mySlot());

    Object.keys(lastSeen).forEach(function (id) {
      if (!next[id]) { delete lastSeen[id]; delete lastSig[id]; }
    });

    net.players = next;

    // If someone's write landed on top of ours, our slot on the server is now
    // stale or gone. Re-assert it rather than waiting for the next heartbeat.
    if (net.status === 'live' && !net.writing) {
      var mine = normalise(selfId(), mySlot());
      var theirCopy = players[selfId()];
      var clobbered = !theirCopy || slotCore(normalise(selfId(), theirCopy)) !== slotCore(mine);
      if (clobbered && now - net.lastPush > 1000) sendMe();
    }

    verifyReveals();
    renderNet();
  }

  function verifyReveals() {
    Object.keys(net.players).forEach(function (id) {
      var p = net.players[id];
      if (!p.revealed || !p.values || !p.salt || !p.commit) return;
      if (p.verifiedFor === p.commit) return;
      p.verifiedFor = p.commit;
      sha256Hex(p.salt + ':' + p.values.join('')).then(function (h) {
        if (!h) return;
        p.verified = (h === p.commit);
        renderNet();
      });
    });
  }

  // ---------- sync loop ----------

  function noteOk() {
    net.fails = 0;
    if (net.offline) {
      net.offline = false;
      setNetStatus('Back in sync.', 'good');
      renderNet();
    }
  }

  function noteFail() {
    net.fails++;
    if (net.fails >= MAX_FAILS && !net.offline) {
      net.offline = true;
      setNetStatus('Connection lost. Still retrying -- your own dice work as normal.', 'error');
      renderNet();
    }
  }

  // Push our slot, merged into whatever is on the server right now.
  function sendMe() {
    if (net.status !== 'live' || !net.code) return;
    if (net.writing) { net.dirty = true; return; }

    net.writing = true;
    var code = net.code;

    fetchBlob(code)
      .then(function (blob) {
        if (net.status !== 'live' || net.code !== code) return null;
        blob.code = code;
        blob.players = blob.players || {};
        blob.players[net.myId] = mySlot();
        return writeBlob(code, blob).then(function () {
          net.lastPush = Date.now();
          noteOk();
          applyPlayers(blob.players);
        });
      })
      .catch(function () { noteFail(); })
      .then(function () {
        net.writing = false;
        if (net.dirty) { net.dirty = false; sendMe(); }
      });
  }

  function pollOnce() {
    if (net.status !== 'live' || !net.code) return;
    var code = net.code;

    fetchBlob(code)
      .then(function (blob) {
        if (net.status !== 'live' || net.code !== code) return;
        noteOk();
        applyPlayers(blob.players);
        // Heartbeat: keeps our slot from ageing out of everyone else's table.
        if (Date.now() - net.lastPush > HEARTBEAT_MS) sendMe();
      })
      .catch(function () { noteFail(); });
  }

  function startPolling() {
    stopPolling();
    net.timer = setInterval(pollOnce, POLL_MS);
  }

  function stopPolling() {
    if (net.timer) { clearInterval(net.timer); net.timer = null; }
  }

  function setNetStatus(text, kind) {
    netStatus.textContent = text || '';
    netStatus.className = 'net-status' + (kind ? ' is-' + kind : '');
  }

  function teardown() {
    stopPolling();
    net.code = null;
    net.myId = null;
    net.players = {};
    net.status = 'off';
    net.fails = 0;
    net.offline = false;
    net.writing = false;
    net.dirty = false;
    lastSeen = {};
    lastSig = {};
    state.revealed = false;
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    render();
  }

  function onLive(created) {
    net.status = 'live';
    history.replaceState(null, '', location.pathname + location.search + '#' + net.code);
    setNetStatus(created
      ? 'Game open. Share the code or link.'
      : 'Joined game ' + net.code + '.', 'good');
    render();
  }

  function enter(code, created) {
    net.code = code;
    net.myId = 'p' + randomHex(8);
    net.players = {};
    lastSeen = {};
    lastSig = {};
    net.fails = 0;
    net.offline = false;
    net.lastPush = 0;
    onLive(created);
    sendMe();
    startPolling();
  }

  function createGame(attempt) {
    attempt = attempt || 1;
    var code = randomCode();
    setNetStatus('Opening a game...');
    createBtn.disabled = true;

    fetchBlob(code)
      .then(function (blob) {
        // Astronomically unlikely, but a live game there would be a disaster.
        if (looksOccupied(blob.players) > 0 && attempt < 4) {
          createBtn.disabled = false;
          createGame(attempt + 1);
          return;
        }
        createBtn.disabled = false;
        enter(code, true);
      })
      .catch(function () {
        createBtn.disabled = false;
        setNetStatus('Cannot reach the game service. Check your signal.', 'error');
      });
  }

  function joinGame(code) {
    setNetStatus('Looking for game ' + code + '...');
    joinBtn.disabled = true;

    fetchBlob(code)
      .then(function (blob) {
        joinBtn.disabled = false;
        if (looksOccupied(blob.players) === 0) {
          setNetStatus('No active game with that code. Check it, or create one.', 'error');
          return;
        }
        enter(code, false);
      })
      .catch(function () {
        joinBtn.disabled = false;
        setNetStatus('Cannot reach the game service. Check your signal.', 'error');
      });
  }

  function leaveGame() {
    var code = net.code, id = net.myId;
    stopPolling();
    if (code && id) {
      // Best effort: drop our slot so nobody waits out the timeout for us.
      fetchBlob(code).then(function (blob) {
        if (blob.players) delete blob.players[id];
        return writeBlob(code, blob);
      }).catch(function () {});
    }
    teardown();
    setNetStatus('You left the game.');
    renderNet();
  }

  function doReveal() {
    if (net.status !== 'live') return;
    if (!state.values.length) { setHint('Roll before you reveal.'); return; }
    if (state.revealed) return;
    state.revealed = true;
    sendMe();
    render();
    setHint('Your dice are on the table.');
  }

  // ---------- connected rendering ----------

  function playerRow(p, isSelf) {
    var row = document.createElement('div');
    row.className = 'sd-row' + (isSelf ? ' is-self' : '');

    var name = document.createElement('span');
    name.className = 'sd-name';
    name.textContent = isSelf ? 'You' : p.name;
    row.appendChild(name);

    if (p.revealed && p.values && p.values.length) {
      var dice = document.createElement('div');
      dice.className = 'sd-dice';
      p.values.slice().sort().forEach(function (v) {
        if (v < 1 || v > 6) return;
        var d = dieEl(v);
        d.classList.add('die--mini');
        dice.appendChild(d);
      });
      row.appendChild(dice);
      if (p.verified === false) {
        var warn = document.createElement('span');
        warn.className = 'sd-warn';
        warn.textContent = 'not their roll';
        row.appendChild(warn);
      }
    } else {
      var hidden = document.createElement('div');
      hidden.className = 'sd-hidden';
      for (var i = 0; i < p.dice; i++) {
        var blank = document.createElement('span');
        blank.className = 'sd-blank';
        hidden.appendChild(blank);
      }
      row.appendChild(hidden);
      var note = document.createElement('span');
      note.className = 'sd-note';
      note.textContent = 'hidden';
      row.appendChild(note);
    }
    return row;
  }

  function sortedPlayers() {
    var me = selfId();
    return Object.keys(net.players).sort(function (a, b) {
      if (a === me) return -1;
      if (b === me) return 1;
      return (net.players[a].name || '').localeCompare(net.players[b].name || '');
    }).map(function (id) { return net.players[id]; });
  }

  function renderNet() {
    var live = net.status === 'live';

    document.body.classList.toggle('connected', live);
    netDot.hidden = !live;
    tableBar.hidden = !live;
    netOffline.hidden = live;
    netOnline.hidden = !live;

    if (!live) {
      showdown.hidden = true;
      showdown.replaceChildren();
      return;
    }

    var players = sortedPlayers();
    var others = players.length - 1;

    tableCode.textContent = net.code;
    tableWho.textContent = others <= 0
      ? 'Waiting for players'
      : others + (others === 1 ? ' other player' : ' other players');

    var canReveal = state.values.length > 0 && !state.revealed;
    revealBtn.setAttribute('aria-disabled', canReveal ? 'false' : 'true');
    revealBtn.textContent = state.revealed ? 'Shown' : 'Reveal';

    showdown.hidden = false;
    showdown.replaceChildren();
    players.forEach(function (p) { showdown.appendChild(playerRow(p, p.id === selfId())); });

    netCodeEl.textContent = net.code;
    var link = location.origin + location.pathname + '#' + net.code;
    netLink.textContent = link;

    netPlayers.replaceChildren();
    players.forEach(function (p) {
      var li = document.createElement('li');
      var who = document.createElement('span');
      who.textContent = p.id === selfId() ? 'You' : p.name;
      var st = document.createElement('span');
      st.className = 'pl-state';
      st.textContent = p.revealed ? 'revealed' : p.dice + (p.dice === 1 ? ' die' : ' dice');
      li.appendChild(who);
      li.appendChild(st);
      netPlayers.appendChild(li);
    });
  }

  // ---------- connected events ----------

  function openNet() {
    setOpen(false);
    nameInput.value = state.name;
    if (netDialog.showModal) netDialog.showModal(); else netDialog.setAttribute('open', '');
    renderNet();
  }

  function closeNet() {
    if (netDialog.close) netDialog.close(); else netDialog.removeAttribute('open');
  }

  netBtn.addEventListener('click', openNet);
  netClose.addEventListener('click', closeNet);
  netDialog.addEventListener('click', function (e) { if (e.target === netDialog) closeNet(); });

  nameInput.addEventListener('input', function () {
    state.name = nameInput.value.slice(0, 14);
    save();
    sendMe();
  });

  createBtn.addEventListener('click', function () {
    if (net.status !== 'off') return;
    createGame();
  });

  joinForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (net.status !== 'off') return;
    var code = (codeInput.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== CODE_LEN) {
      setNetStatus('A game code is ' + CODE_LEN + ' characters.', 'error');
      return;
    }
    joinGame(code);
  });

  copyBtn.addEventListener('click', function () {
    var link = location.origin + location.pathname + '#' + net.code;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link)
        .then(function () { setNetStatus('Invite link copied.', 'good'); })
        .catch(function () { setNetStatus('Copy failed. The link is below to copy by hand.', 'error'); });
    } else {
      setNetStatus('Long-press the link below to copy it.');
    }
  });

  leaveBtn.addEventListener('click', leaveGame);

  revealBtn.addEventListener('click', doReveal);

  // Closing the tab cannot reliably finish a read-modify-write, so we just stop
  // refreshing our slot and let it age out of everyone else's table.
  window.addEventListener('pagehide', stopPolling);

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
  if (!state.name) state.name = 'Player ' + (10 + Math.floor(Math.random() * 90));
  nameInput.value = state.name;
  render();

  // A shared link carries the code in the hash, so it drops you into the game.
  // Also on hashchange: tapping an invite while the app is already open is a
  // same-document navigation, so nothing would happen on load alone.
  function followLinkCode() {
    if (net.status !== 'off') return;
    var linkCode = (location.hash || '').replace('#', '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (linkCode.length !== CODE_LEN) return;
    codeInput.value = linkCode;
    openNet();
    joinGame(linkCode);
  }

  window.addEventListener('hashchange', followLinkCode);
  followLinkCode();

  if (state.locked) {
    setHint('Roll is locked. Tap the padlock when you want a new round.');
  } else if (state.values.length) {
    setHint('Your last roll is still under the cup.');
  }
})();
