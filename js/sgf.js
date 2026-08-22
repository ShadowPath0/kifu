// Parseur SGF minimal (lecture seule) + simulateur de règles du Go (captures),
// entièrement côté client — aucune dépendance externe, aucun réseau.

function sgfParseTree(text) {
  let i = 0;
  const len = text.length;

  function skipWs() {
    while (i < len && /\s/.test(text[i])) i++;
  }

  function parseValue() {
    i++; // '['
    let val = "";
    while (i < len && text[i] !== "]") {
      if (text[i] === "\\") {
        val += text[i + 1] !== undefined ? text[i + 1] : "";
        i += 2;
      } else {
        val += text[i];
        i++;
      }
    }
    i++; // ']'
    return val;
  }

  function parseProperty() {
    let key = "";
    while (i < len && /[A-Za-z]/.test(text[i])) {
      key += text[i];
      i++;
    }
    const values = [];
    skipWs();
    while (i < len && text[i] === "[") {
      values.push(parseValue());
      skipWs();
    }
    return [key, values];
  }

  function parseNode() {
    i++; // ';'
    const props = {};
    skipWs();
    while (i < len && /[A-Za-z]/.test(text[i])) {
      const [k, v] = parseProperty();
      props[k] = v;
      skipWs();
    }
    return props;
  }

  function parseSequence() {
    const nodes = [];
    skipWs();
    while (i < len && text[i] === ";") {
      nodes.push(parseNode());
      skipWs();
    }
    const variations = [];
    while (i < len && text[i] === "(") {
      variations.push(parseGameTree());
      skipWs();
    }
    return { nodes, variations };
  }

  function parseGameTree() {
    i++; // '('
    skipWs();
    const seq = parseSequence();
    skipWs();
    if (i < len && text[i] === ")") i++;
    return seq;
  }

  skipWs();
  if (text[i] !== "(") throw new Error("Fichier SGF invalide (pas de racine)");
  return parseGameTree();
}

function sgfMainLineNodes(text) {
  let seq = sgfParseTree(text);
  const nodes = [...seq.nodes];
  while (seq.variations.length) {
    seq = seq.variations[0];
    nodes.push(...seq.nodes);
  }
  return nodes;
}

function sgfCoordToRowCol(value, size) {
  if (!value || value.length < 2) return null;
  const col = value.charCodeAt(0) - 97;
  const rowFromTop = value.charCodeAt(1) - 97;
  if (col < 0 || col >= size || rowFromTop < 0 || rowFromTop >= size) return null;
  return { row: size - 1 - rowFromTop, col };
}

function sgfParseDate(raw) {
  if (!raw) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw.trim());
  if (!m) return null;
  const [, y, mo, d] = m;
  const test = new Date(`${y}-${mo}-${d}T00:00:00`);
  if (isNaN(test.getTime())) return null;
  return `${y}-${mo}-${d}`;
}

function parseSgfText(sgfContent) {
  const nodes = sgfMainLineNodes(sgfContent);
  const root = nodes[0] || {};
  const get = (key) => (root[key] ? root[key][0] : null);

  const blackPlayer = get("PB");
  const whitePlayer = get("PW");
  const result = get("RE");
  const komiRaw = get("KM");
  let komi = null;
  if (komiRaw !== null && komiRaw !== "") {
    const parsed = parseFloat(komiRaw);
    komi = isNaN(parsed) ? null : parsed;
  }
  const datePlayed = sgfParseDate(get("DT"));
  const opponentName = whitePlayer || blackPlayer || null;

  const titleBits = [];
  if (blackPlayer || whitePlayer) titleBits.push(`${blackPlayer || "?"} vs ${whitePlayer || "?"}`);
  if (datePlayed) titleBits.push(datePlayed);

  return {
    title: titleBits.length ? titleBits.join(" — ") : null,
    date_played: datePlayed,
    opponent_name: opponentName,
    result,
    komi,
    black_player: blackPlayer,
    white_player: whitePlayer,
  };
}

// ---------- rejeu des coups (règles du Go : captures) ----------

function createEmptyBoard(size) {
  return Array.from({ length: size }, () => Array(size).fill(null));
}

function boardNeighbors(r, c, size) {
  const result = [];
  if (r > 0) result.push([r - 1, c]);
  if (r < size - 1) result.push([r + 1, c]);
  if (c > 0) result.push([r, c - 1]);
  if (c < size - 1) result.push([r, c + 1]);
  return result;
}

function groupLiberties(board, r, c, size) {
  const color = board[r][c];
  const stones = [];
  const liberties = new Set();
  const seen = new Set([`${r},${c}`]);
  const stack = [[r, c]];
  while (stack.length) {
    const [cr, cc] = stack.pop();
    stones.push([cr, cc]);
    for (const [nr, nc] of boardNeighbors(cr, cc, size)) {
      const key = `${nr},${nc}`;
      const val = board[nr][nc];
      if (val === null) liberties.add(key);
      else if (val === color && !seen.has(key)) {
        seen.add(key);
        stack.push([nr, nc]);
      }
    }
  }
  return { stones, liberties };
}

function playMove(board, row, col, color, size) {
  if (board[row][col] !== null) return; // coup illégal (point occupé) : ignoré, comme le backend d'origine
  board[row][col] = color;
  const opponent = color === "b" ? "w" : "b";
  for (const [nr, nc] of boardNeighbors(row, col, size)) {
    if (board[nr][nc] === opponent) {
      const group = groupLiberties(board, nr, nc, size);
      if (group.liberties.size === 0) {
        for (const [gr, gc] of group.stones) board[gr][gc] = null;
      }
    }
  }
}

function stonesToBoard(stones, size) {
  const board = createEmptyBoard(size);
  for (const st of stones || []) board[st.row][st.col] = st.color;
  return board;
}

// Rejoue une branche (séquence libre posée par l'utilisateur) à partir d'un plateau de départ.
// Retourne, pour chaque coup de la branche (0 = position de départ), l'état du plateau.
function computeBranchStates(startStones, size, moves) {
  const board = stonesToBoard(startStones, size);
  const states = [boardSnapshot(board, size)];
  for (const mv of moves) {
    playMove(board, mv.row, mv.col, mv.color, size);
    states.push(boardSnapshot(board, size));
  }
  return states;
}

function boardSnapshot(board, size) {
  const stones = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c]) stones.push({ color: board[r][c], row: r, col: c });
    }
  }
  return stones;
}

function applySetupNode(board, node, size) {
  for (const [key, values] of Object.entries(node)) {
    if (key === "AB" || key === "AW") {
      const color = key === "AB" ? "b" : "w";
      for (const v of values) {
        const pos = sgfCoordToRowCol(v, size);
        if (pos) board[pos.row][pos.col] = color;
      }
    } else if (key === "AE") {
      for (const v of values) {
        const pos = sgfCoordToRowCol(v, size);
        if (pos) board[pos.row][pos.col] = null;
      }
    }
  }
}

function computeBoardStates(sgfContent) {
  const nodes = sgfMainLineNodes(sgfContent);
  const sizeNode = nodes.find((n) => n.SZ);
  const size = sizeNode ? parseInt(sizeNode.SZ[0], 10) : 19;
  const board = createEmptyBoard(size);

  let moveStartIndex = nodes.findIndex((n) => n.B !== undefined || n.W !== undefined);
  if (moveStartIndex === -1) moveStartIndex = nodes.length;

  for (let idx = 0; idx < moveStartIndex; idx++) {
    applySetupNode(board, nodes[idx], size);
  }

  const states = [boardSnapshot(board, size)];
  const moves = [null];

  for (let idx = moveStartIndex; idx < nodes.length; idx++) {
    const node = nodes[idx];
    const isBlack = node.B !== undefined;
    const isWhite = node.W !== undefined;
    if (!isBlack && !isWhite) continue;
    const color = isBlack ? "b" : "w";
    const raw = (isBlack ? node.B[0] : node.W[0]) || "";
    const moveNumber = moves.length;
    if (!raw || raw.length < 2) {
      moves.push({ number: moveNumber, color, pass: true });
    } else {
      const pos = sgfCoordToRowCol(raw, size);
      if (pos) playMove(board, pos.row, pos.col, color, size);
      moves.push({ number: moveNumber, color, row: pos ? pos.row : null, col: pos ? pos.col : null, pass: false });
    }
    states.push(boardSnapshot(board, size));
  }

  return { size, states, moves };
}
