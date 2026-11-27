// Contours are exact offsets of circular arcs and their tangent straight sections.
// Alternating turns invert the signed radius offset; the joins share the same
// tangent and endpoint. A minimum radius and pitch protect every offset.
const CONTOUR_ARRANGEMENTS = ["serpentine", "arch", "wave", "loop"];
const CONTOUR_NEUTRAL = "#a7a8a9";
const CONTOUR_ACCENTS = ["#5da3b2", "#bb2026", "#00a47d", "#f4af23", "#25282a", "#5da3b2"];
const contourKeys = ["count", "weight", "spacing", "radius", "separation", "accents"];
let contourState = referenceContourState();
let activeContourAccent = 0;

function referenceContourState() {
  return {
    arrangement: "serpentine", count: 9, weight: 5, spacing: 19, radius: 185, separation: 0, accents: 4,
    defaultColour: CONTOUR_NEUTRAL,
    lines: Array.from({ length: 20 }, (_, i) => ({ colour: i === 4 ? "#bb2026" : null, visible: true })),
    circles: [
      { x: -185, y: 0, diameter: 182, colour: CONTOUR_ACCENTS[0], visible: true },
      { x: 185, y: 0, diameter: 182, colour: CONTOUR_ACCENTS[1], visible: true },
      { x: -190, y: -207, diameter: 95, colour: CONTOUR_ACCENTS[2], visible: true },
      { x: 190, y: 207, diameter: 95, colour: CONTOUR_ACCENTS[3], visible: true },
      { x: -260, y: 140, diameter: 65, colour: CONTOUR_ACCENTS[4], visible: true },
      { x: 260, y: -140, diameter: 65, colour: CONTOUR_ACCENTS[5], visible: true }
    ]
  };
}

function contourMinimumRadius(state) {
  return Math.max(30, Math.ceil((state.count - 1) * state.spacing / 2 + state.weight / 2 + 3));
}

function constrainContour(state) {
  state.spacing = Math.max(state.spacing, state.weight + 1, 4);
  state.radius = Math.max(state.radius, contourMinimumRadius(state));
  return state;
}

function contourSymmetry(arrangement) {
  return ["arch", "loop"].includes(arrangement) ? "mirrored" : "rotational";
}

function contourPath(state, index) {
  const offset = (index - (state.count - 1) / 2) * state.spacing;
  const R = state.radius;
  const point = (x, y) => (300 + x) + " " + (300 + y);
  if (state.arrangement === "loop") {
    const r = R + offset;
    const left = point(-r, 0), right = point(r, 0);
    return "M " + left + " A " + r + " " + r + " 0 1 0 " + right + " A " + r + " " + r + " 0 1 0 " + left + " Z";
  }
  const turns = state.arrangement === "arch" ? 1 : state.arrangement === "wave" ? 4 : 2;
  const separation = turns === 1 ? 0 : state.separation;
  let d = "";
  for (let i = 0; i < turns; i++) {
    const direction = i % 2 === 0 ? 1 : -1;
    const x = (i - (turns - 1) / 2) * 2 * R;
    const y = direction * separation / 2;
    const r = R + direction * offset;
    const left = x - r, right = x + r;
    if (i === 0) d = "M " + point(left, y - 1800) + " L " + point(left, y);
    else d += " L " + point(left, y);
    d += " A " + r + " " + r + " 0 0 " + (direction === 1 ? 0 : 1) + " " + point(right, y);
    if (i === turns - 1) d += " L " + point(right, y - direction * 1800);
  }
  return d;
}

function contourClone() {
  return JSON.parse(JSON.stringify(contourState));
}

function restoreContourState(state) {
  contourState = JSON.parse(JSON.stringify(state));
  activeContourAccent = 0;
}

function contourColour(key) {
  if (key === "default") return contourState.defaultColour;
  const [kind, index] = key.split(":");
  return kind === "line" ? (contourState.lines[Number(index)].colour || contourState.defaultColour) : contourState.circles[Number(index)].colour;
}

function setContourColour(key, colour) {
  if (key === "default") contourState.defaultColour = colour;
  else {
    const [kind, index] = key.split(":");
    (kind === "line" ? contourState.lines : contourState.circles)[Number(index)].colour = colour;
  }
}

function contourColourButton(key, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "color-trigger";
  button.dataset.contourColour = key;
  button.setAttribute("aria-haspopup", "dialog");
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", "palette-popover");
  const swatch = document.createElement("span");
  swatch.className = "color-swatch";
  button.append(swatch);
  updateColourTrigger(button, contourColour(key), label);
  button.addEventListener("click", () => openPalette(button, "contour", key));
  return button;
}

function contourVisibility(item, label, focusId) {
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = item.visible;
  input.id = focusId;
  input.setAttribute("aria-label", "Show " + label);
  input.addEventListener("change", () => {
    item.visible = input.checked;
    render();
    document.getElementById(focusId)?.focus();
  });
  return input;
}

function renderContourEditors() {
  const state = contourState;
  const defaultButton = document.querySelector("#contour-default-colour");
  updateColourTrigger(defaultButton, state.defaultColour, "Default line colour");
  const lineList = document.querySelector("#contour-line-list");
  lineList.replaceChildren();
  for (let i = 0; i < state.count; i++) {
    const line = state.lines[i];
    const item = document.createElement("div");
    item.className = "contour-line-item";
    const label = document.createElement("span");
    label.textContent = String(i + 1);
    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "reset-position-button";
    reset.innerHTML = '<i class="ph-light ph-arrow-counter-clockwise" aria-hidden="true"></i>';
    reset.setAttribute("aria-label", "Use default colour for line " + (i + 1));
    reset.disabled = line.colour === null;
    reset.addEventListener("click", () => { line.colour = null; render(); document.querySelector('[data-contour-colour="line:' + i + '"]')?.focus(); });
    item.append(label, contourColourButton("line:" + i, "Line " + (i + 1) + " colour"), contourVisibility(line, "line " + (i + 1), "contour-line-visible-" + i), reset);
    lineList.append(item);
  }
  const circleList = document.querySelector("#contour-accent-list");
  circleList.replaceChildren();
  activeContourAccent = Math.max(0, Math.min(activeContourAccent, state.accents - 1));
  for (let i = 0; i < state.accents; i++) {
    const circle = state.circles[i];
    const item = document.createElement("div");
    item.className = "contour-line-item" + (i === activeContourAccent ? " is-active" : "");
    const select = document.createElement("button");
    select.type = "button";
    select.className = "contour-accent-select";
    select.textContent = String(i + 1);
    select.setAttribute("aria-label", "Select circle " + (i + 1));
    select.setAttribute("aria-pressed", String(i === activeContourAccent));
    select.addEventListener("click", () => { activeContourAccent = i; render(); circleList.querySelectorAll(".contour-accent-select")[i]?.focus(); });
    item.append(select, contourColourButton("accent:" + i, "Circle " + (i + 1) + " colour"), contourVisibility(circle, "circle " + (i + 1), "contour-circle-visible-" + i));
    circleList.append(item);
  }
  document.querySelector("#contour-accent-controls").hidden = !state.accents;
  document.querySelector("#contour-accent-title").textContent = "Circle " + (activeContourAccent + 1);
  const circle = state.circles[activeContourAccent];
  [["size", "diameter"], ["x", "x"], ["y", "y"]].forEach(([id, key]) => {
    document.querySelector("#contour-accent-" + id).value = circle[key];
    document.querySelector("#contour-accent-" + id + "-output").value = circle[key] + " px";
  });
}

function renderContour(settings) {
  const state = constrainContour(contourState);
  art.replaceChildren();
  art.removeAttribute("transform");
  if (settings.background) {
    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("width", "600"); rect.setAttribute("height", "600"); rect.setAttribute("fill", "#ffffff");
    art.append(rect);
  }
  const geometry = document.createElementNS(SVG_NS, "g");
  geometry.setAttribute("transform", "translate(300 300) rotate(" + settings.rotation + ") scale(" + settings.scale + ") translate(-300 -300)");
  for (let i = 0; i < state.count; i++) {
    if (!state.lines[i].visible) continue;
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", contourPath(state, i));
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", contourColour("line:" + i));
    path.setAttribute("stroke-width", state.weight);
    geometry.append(path);
  }
  state.circles.slice(0, state.accents).forEach(circle => {
    if (!circle.visible) return;
    const el = document.createElementNS(SVG_NS, "circle");
    el.setAttribute("cx", 300 + circle.x);
    el.setAttribute("cy", 300 + circle.y);
    el.setAttribute("r", circle.diameter / 2);
    el.setAttribute("fill", circle.colour);
    geometry.append(el);
  });
  art.append(geometry);
  stage.classList.toggle("has-background", settings.background);
  document.querySelector("#shape-count").textContent = state.count + " lines";
  document.querySelector("#variation-readout").textContent = state.accents + " accent circles";
  document.querySelector("#shape-desc").textContent = state.count + " parallel contours in a " + state.arrangement + " arrangement.";
  const radius = document.querySelector("#contour-radius");
  const spacing = document.querySelector("#contour-spacing");
  radius.min = contourMinimumRadius(state);
  spacing.min = Math.max(4, state.weight + 1);
  rangeNumbers.get(radius.id).min = radius.min;
  rangeNumbers.get(spacing.id).min = spacing.min;
  document.querySelector("#contour-arrangement").value = state.arrangement;
  document.querySelector("#contour-symmetry").value = contourSymmetry(state.arrangement);
  document.querySelector("#contour-separation-row").hidden = ["arch", "loop"].includes(state.arrangement);
  contourKeys.forEach(key => {
    document.querySelector("#contour-" + key).value = state[key];
    document.querySelector("#contour-" + key + "-output").value = state[key] + (["count", "accents"].includes(key) ? "" : " px");
  });
  outputs.scale.value = Math.round(settings.scale * 100) + "%";
  outputs.rotation.value = settings.rotation + "°";
  renderContourEditors();
  refreshRangeInputs();
}

function initContour() {
  contourKeys.forEach(key => document.querySelector("#contour-" + key).addEventListener("input", event => {
    contourState[key] = Number(event.target.value);
    render();
  }));
  document.querySelector("#contour-arrangement").addEventListener("change", event => {
    contourState.arrangement = event.target.value;
    render();
  });
  document.querySelector("#contour-symmetry").addEventListener("change", event => {
    if (contourSymmetry(contourState.arrangement) !== event.target.value) {
      contourState.arrangement = event.target.value === "mirrored" ? "arch" : "serpentine";
    }
    render();
  });
  document.querySelector("#contour-default-colour").addEventListener("click", event => openPalette(event.currentTarget, "contour", "default"));
  [["size", "diameter"], ["x", "x"], ["y", "y"]].forEach(([id, key]) => {
    document.querySelector("#contour-accent-" + id).addEventListener("input", event => {
      contourState.circles[activeContourAccent][key] = Number(event.target.value);
      render();
    });
  });
  document.querySelector("#reset-contour-accent").addEventListener("click", () => {
    const circle = contourState.circles[activeContourAccent];
    const original = contourAccentPositions(contourState)[activeContourAccent];
    circle.x = original.x; circle.y = original.y;
    render();
  });
  document.querySelector("#reference-contour").addEventListener("click", () => {
    closePalette(false);
    applyContourCandidate(createContourCandidate(true));
  });
}

function contourAccentPositions(state) {
  const r = state.radius;
  const s = state.separation / 2;
  const inner = Math.max(10, r - (state.count - 1) * state.spacing / 2 - state.weight / 2 - 9);
  let positions;
  if (state.arrangement === "loop" || state.arrangement === "arch") {
    positions = [{x:0,y:0}, {x:-r-90,y:-r/2}, {x:r+90,y:r/2}];
  } else if (state.arrangement === "wave") {
    positions = [{x:-r,y:-s}, {x:r,y:s}];
  } else {
    positions = [{x:-r,y:s}, {x:r,y:-s}];
  }
  return positions.map(p => ({...p, diameter: Math.min(350, Math.round(inner * 1.7))}))
    .concat([{x:-190,y:-207,diameter:65}, {x:190,y:207,diameter:65}, {x:-260,y:140,diameter:50}, {x:260,y:-140,diameter:50}]).slice(0,6);
}

function createContourCandidate(reference = false) {
  const state = referenceContourState();
  if (!reference) {
    state.arrangement = randomChoice(CONTOUR_ARRANGEMENTS);
    state.count = randomInteger(5, 12);
    state.weight = randomInteger(2, 6);
    state.spacing = randomInteger(10, 19);
    state.radius = state.arrangement === "wave" ? randomInteger(85, 135) : randomInteger(125, 190);
    state.separation = randomChoice([0, 0, 20, 40]);
    state.accents = randomInteger(2, 4);
    state.defaultColour = randomChoice(["#a7a8a9", "#7c7e7f", "#cacbcb", "#25282a"]);
    state.lines.forEach(line => { line.colour = null; });
    const palette = shuffled(BRAND_PALETTE.slice(0, 4)).map(family => family.values[4][1]);
    state.lines[randomInteger(0, state.count - 1)].colour = palette[0];
    constrainContour(state);
    const positions = contourAccentPositions(state);
    state.circles = state.circles.map((circle, i) => ({...circle, ...positions[i], colour: palette[i % palette.length]}));
  }
  return {type:"contour", contour:state, settings:{rotation:reference ? 325 : randomChoice([0, 35, 90, 145, 180, 325]), scale:reference ? 100 : randomInteger(80, 110, 5), background:reference || Math.random() < .5}, seed:reference ? 4821 : randomInteger(1,1000000000)};
}

function applyContourCandidate(candidate) {
  restoreContourState(candidate.contour);
  controls.rotation.value = candidate.settings.rotation;
  controls.scale.value = candidate.settings.scale;
  controls.background.checked = candidate.settings.background;
  compositionSeed = candidate.seed;
  render();
}

function validContourPreset(payload) {
  const state = payload.contour, settings = payload.settings;
  const integer = isIntegerBetween;
  return payload.version === 2 && state && settings
    && integer(payload.randomSeed,1,1000000000)
    && integer(settings.rotationDegrees,0,359) && integer(settings.scalePercent,70,150) && typeof settings.background === "boolean"
    && CONTOUR_ARRANGEMENTS.includes(state.arrangement)
    && integer(state.count,2,20) && integer(state.weight,1,12)
    && integer(state.spacing,Math.max(4,state.weight+1),24)
    && integer(state.radius,contourMinimumRadius(state),300)
    && integer(state.separation,0,220) && integer(state.accents,0,6)
    && isBrandColour(state.defaultColour)
    && Array.isArray(state.lines) && state.lines.length === 20
    && state.lines.every(line => line && typeof line.visible === "boolean" && (line.colour === null || isBrandColour(line.colour)))
    && Array.isArray(state.circles) && state.circles.length === 6
    && state.circles.every(circle => circle && typeof circle.visible === "boolean" && isBrandColour(circle.colour) && integer(circle.x,-450,450) && integer(circle.y,-450,450) && integer(circle.diameter,10,350));
}

function contourLineHit(state, x, y) {
  const turns = state.arrangement === "arch" ? 1 : state.arrangement === "wave" ? 4 : 2;
  const separation = turns === 1 ? 0 : state.separation;
  const R = state.radius;
  const half = state.weight / 2;
  for (let i = 0; i < state.count; i++) {
    if (!state.lines[i].visible) continue;
    const offset = (i - (state.count - 1) / 2) * state.spacing;
    if (state.arrangement === "loop") {
      if (Math.abs(Math.hypot(x, y) - (R + offset)) <= half) return true;
      continue;
    }
    for (let j = 0; j < turns; j++) {
      const direction = j % 2 === 0 ? 1 : -1;
      const cx = (j - (turns - 1) / 2) * 2 * R;
      const cy = direction * separation / 2;
      const r = R + direction * offset;
      if ((y - cy) * direction >= 0 && Math.abs(Math.hypot(x - cx, y - cy) - r) <= half) return true;
      if (j === 0 && y <= cy && Math.abs(x - (cx - r)) <= half) return true;
      if (j === turns - 1 && (y - cy) * direction <= 0 && Math.abs(x - (cx + r)) <= half) return true;
      if (j < turns - 1 && Math.abs(y) <= separation / 2 && Math.abs(x - (cx + r)) <= half) return true;
    }
  }
  return false;
}

function evaluateContourCandidate(candidate) {
  const state = candidate.contour;
  const scale = candidate.settings.scale / 100;
  const angle = -candidate.settings.rotation * Math.PI / 180;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const grid = 48;
  let painted = 0, lineSamples = 0, coveredLines = 0, sx = 0, sy = 0;
  const visibleCircles = new Set();
  for (let row = 0; row < grid; row++) {
    for (let col = 0; col < grid; col++) {
      const dx = (col + .5) * 600 / grid - 300, dy = (row + .5) * 600 / grid - 300;
      const x = (dx * cos - dy * sin) / scale, y = (dx * sin + dy * cos) / scale;
      const line = contourLineHit(state, x, y);
      let circle = false;
      state.circles.slice(0, state.accents).forEach((item, i) => {
        if (item.visible && Math.hypot(x - item.x, y - item.y) <= item.diameter / 2) {
          visibleCircles.add(i); circle = true;
        }
      });
      if (line) lineSamples++;
      if (line && circle) coveredLines++;
      if (line || circle) { painted++; sx += dx; sy += dy; }
    }
  }
  const coverage = painted / (grid * grid);
  const displacement = painted ? Math.hypot(sx / painted, sy / painted) / 300 : 1;
  const exposed = lineSamples ? 1 - coveredLines / lineSamples : 0;
  const colours = new Set(state.circles.slice(0,state.accents).map(circle => circle.colour.toUpperCase()));
  return scoreDesignCandidate({
    palette: clamp01(.75 + .25 * colours.size / Math.max(1, state.accents)),
    balance: clamp01(1 - displacement / .35),
    negativeSpace: clamp01(1 - Math.abs(coverage - .30) / .30),
    restraint: .65 * exposed + .35 * clamp01(1 - state.weight / state.spacing),
    valid: lineSamples >= 35 && coverage >= .08 && coverage <= .70 && exposed >= .60 && visibleCircles.size >= Math.min(2,state.accents)
  });
}
