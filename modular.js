// Modular compositions use a single rectangular lattice per layer. Individual
// cells may change colour or visibility, but never their geometry.
const MODULAR_ARRANGEMENTS = ["offset", "aligned", "staggered", "checkerboard"];
const modularKeys = ["columns", "rows", "width", "height", "radius", "gap-x", "gap-y", "layers"];
const modularLimits = [[2,10],[2,10],[30,300],[30,300],[0,100],[0,100],[0,100],[1,4]];
let modularState = referenceModularState();
let activeModularLayer = 0;
let activeModule = {row: 1, col: 1};

function defaultModularLayer(index) {
  return {colour:["#99dbcb","#5da3b2","#f4af23","#bb2026"][index], visible:true, x:0, y:-90, opacity:index<2?100:75, modules:{}};
}

function referenceModularState() {
  return {
    arrangement: "offset", columns: 5, rows: 5, width: 170, height: 170, radius: 40, "gap-x": 9, "gap-y": 9, layers: 2,
    layerData: [
      {colour:"#99dbcb", visible:true, x:0, y:-90, opacity:100, modules:{}},
      {colour:"#5da3b2", visible:true, x:0, y:-90, opacity:100, modules:{"2:2":{colour:"#bb2026", visible:true}}},
      defaultModularLayer(2), defaultModularLayer(3)
    ]
  };
}

function modularClone() { return JSON.parse(JSON.stringify(modularState)); }
function restoreModularState(state) {
  modularState = JSON.parse(JSON.stringify(state));
  while (modularState.layerData.length < 4) modularState.layerData.push(defaultModularLayer(modularState.layerData.length));
  activeModularLayer = 0;
  activeModule = {row: 1, col: 1};
}

function modularModuleKey(row, col) { return row + ":" + col; }
function modularModule(state, layer, row, col) {
  const data = state.layerData[layer];
  const override = data.modules[modularModuleKey(row,col)];
  return {colour: override?.colour || data.colour, visible: override?.visible !== false};
}
function modularCellKey(layer, row, col) { return "module:" + layer + ":" + row + ":" + col; }
function modularCellData(key) {
  const [kind, layer, row, col] = key.split(":");
  return {kind, layer:Number(layer), row:Number(row), col:Number(col)};
}
function modularColour(key) {
  const target = modularCellData(key);
  return target.kind === "layer" ? modularState.layerData[target.layer].colour : modularModule(modularState, target.layer, target.row, target.col).colour;
}
function modularOverride(target) {
  const modules = modularState.layerData[target.layer].modules;
  const key = modularModuleKey(target.row,target.col);
  return modules[key] ||= {colour:null, visible:true};
}
function setModularColour(key, colour) {
  const target = modularCellData(key);
  if (target.kind === "layer") modularState.layerData[target.layer].colour = colour;
  else {
    const item = modularOverride(target);
    item.colour = colour; item.visible = true;
  }
}
function modularPaletteState(key) {
  const t = modularCellData(key);
  const override = modularState.layerData[t.layer].modules[modularModuleKey(t.row,t.col)];
  return {empty:override?.visible === false, reset:!override};
}
function setModularEmpty(key, empty) { modularOverride(modularCellData(key)).visible = !empty; }
function resetModularModule(key) {
  patternFills.delete("modular:"+key);
  const t = modularCellData(key);
  delete modularState.layerData[t.layer].modules[modularModuleKey(t.row,t.col)];
}
function modularPaletteTrigger(key) {
  return document.querySelector('[data-modular-colour="' + key + '"]');
}

function modularIncluded(state, layer, row, col) {
  return state.arrangement !== "checkerboard" || (row + col + layer) % 2 === 0;
}

function modularRectangles(state, layer) {
  const data = state.layerData[layer];
  if (!data.visible || data.opacity === 0) return [];
  const px = state.width + state["gap-x"], py = state.height + state["gap-y"];
  const baseX = 300 - (state.width + (state.columns - 1) * px) / 2;
  const baseY = 300 - (state.height + (state.rows - 1) * py) / 2;
  // Preserve the original diagonal half-pitch offset for the first two
  // layers, and use the other two quadrants for the additional layers.
  const offsets = [[-.25,-.25],[.25,.25],[.25,-.25],[-.25,.25]];
  const [shiftX,shiftY] = state.arrangement === "offset" && state.layers > 1
    ? offsets[layer] : [0, ["staggered","checkerboard"].includes(state.arrangement) && layer >= 2 ? .5 : 0];
  const radius = Math.min(state.width, state.height) / 2 * state.radius / 100;
  const rectangles = [];
  for (let row = 0; row < state.rows; row++) {
    for (let col = 0; col < state.columns; col++) {
      if (!modularIncluded(state,layer,row,col)) continue;
      const cell = modularModule(state,layer,row,col);
      if (!cell.visible) continue;
      const stagger = state.arrangement === "staggered" ? ((row + layer) % 2 ? .25 : -.25) : 0;
      rectangles.push({
        row,col, colour:cell.colour,
        x:baseX + col * px + (shiftX + stagger) * px + data.x,
        y:baseY + row * py + shiftY * py + data.y,
        width:state.width, height:state.height, radius
      });
    }
  }
  return rectangles;
}

function modularSvgRect(rect, fill) {
  const shape = document.createElementNS(SVG_NS, "rect");
  for (const key of ["x","y","width","height"]) shape.setAttribute(key, rect[key]);
  shape.setAttribute("rx",rect.radius);
  shape.setAttribute("fill",fill);
  return shape;
}

// Transparent removes any area occupied by two or more visible layers.
// If every rectangle has an identical counterpart, nothing would remain.
function modularLayersCoincide(layers) {
  const key = rect => [rect.x,rect.y,rect.width,rect.height,rect.radius].join(":");
  const counts = new Map();
  layers.forEach(layer => layer.forEach(rect => {
    const id = key(rect);
    counts.set(id,(counts.get(id)||0)+1);
  }));
  return counts.size > 0 && Array.from(counts.values()).every(count => count >= 2);
}

function constrainModularOverlap(settings, layers) {
  const coincident = modularLayersCoincide(layers);
  const transparent = controls.overlapModes.find(input => input.value === "transparent");
  transparent.disabled = coincident;
  document.querySelector("#overlap-transparent-help").textContent = coincident
    ? "Unavailable when overlapping grids would erase the entire pattern."
    : "Knock out overlapping areas.";
  if (coincident && settings.overlapMode === "transparent") {
    settings.overlapMode = "multiply";
    controls.overlapModes.forEach(input => input.checked = input.value === settings.overlapMode);
  }
}

function renderModular(settings) {
  const state = modularState;
  art.replaceChildren();
  art.removeAttribute("transform");
  art.style.isolation = "isolate";
  if (settings.background) {
    const white = document.createElementNS(SVG_NS,"rect");
    white.setAttribute("width","600"); white.setAttribute("height","600"); white.setAttribute("fill","#ffffff");
    art.append(white);
  }
  const geometry = document.createElementNS(SVG_NS,"g");
  geometry.setAttribute("transform","translate(300 300) rotate(" + settings.rotation + ") scale(" + settings.scale + ") translate(-300 -300)");
  geometry.style.isolation = "isolate";
  const layers = Array.from({length:state.layers},(_,i)=>modularRectangles(state,i));
  constrainModularOverlap(settings, layers);
  if (settings.overlapMode === "transparent" && state.layers > 1) {
    const defs = document.createElementNS(SVG_NS,"defs");
    layers.forEach((layer,index)=>{
      const mask = document.createElementNS(SVG_NS,"mask");
      mask.id = "modular-mask-" + index;
      mask.setAttribute("maskUnits","userSpaceOnUse");
      mask.setAttribute("maskContentUnits","userSpaceOnUse");
      for (const key of ["x","y"]) mask.setAttribute(key,"-4000");
      for (const key of ["width","height"]) mask.setAttribute(key,"8000");
      layer.forEach(rect=>mask.append(modularSvgRect(rect,"#ffffff")));
      layers.forEach((other,otherIndex)=>{if(otherIndex!==index)other.forEach(rect=>mask.append(modularSvgRect(rect,"#000000")));});
      defs.append(mask);
    });
    geometry.append(defs);
  }
  layers.forEach((layer,index)=>{
    if (!layer.length) return;
    const group = document.createElementNS(SVG_NS,"g");
    group.setAttribute("opacity",state.layerData[index].opacity / 100);
    if (settings.overlapMode === "multiply") group.style.mixBlendMode = "multiply";
    if (settings.overlapMode === "transparent" && state.layers > 1) group.setAttribute("mask","url(#modular-mask-" + index + ")");
    layer.forEach(rect=>{
      const shape = modularSvgRect(rect,svgPatternFill("modular:"+modularCellKey(index,rect.row,rect.col),rect.colour,{x:rect.x,y:rect.y}));
      shape.dataset.module = modularCellKey(index,rect.row,rect.col);
      shape.setAttribute("role","button"); shape.setAttribute("tabindex","0");
      shape.setAttribute("aria-label","Layer " + (index+1) + ", row " + (rect.row+1) + ", column " + (rect.col+1));
      const select = () => selectModularCell(index,rect.row,rect.col,true);
      shape.addEventListener("click",select);
      shape.addEventListener("keydown",event=>{if (event.key === "Enter" || event.key === " ") {event.preventDefault();select();}});
      group.append(shape);
    });
    geometry.append(group);
  });
  art.append(geometry);
  stage.classList.toggle("has-background",settings.background);
  document.querySelector("#shape-count").textContent = state.rows + " × " + state.columns + " modules";
  document.querySelector("#variation-readout").textContent = state.layers + (state.layers === 1 ? " layer" : " layers");
  document.querySelector("#shape-desc").textContent = state.rows + " rows and " + state.columns + " columns of rounded rectangles across " + state.layers + " layers.";
  document.querySelector("#modular-arrangement").value = state.arrangement;
  modularKeys.forEach(key=>{
    document.querySelector("#modular-"+key).value = state[key];
    document.querySelector("#modular-"+key+"-output").value = state[key] + (key === "radius" ? "%" : ["rows","columns","layers"].includes(key) ? "" : " px");
  });
  outputs.scale.value = Math.round(settings.scale*100)+"%";
  outputs.rotation.value = settings.rotation+"°";
  renderModularEditors();
  refreshRangeInputs();
}

function selectModularCell(layer,row,col,openColour) {
  closePalette(false);
  activeModularLayer = layer;
  activeModule = {row,col};
  activateEditorTab(document.querySelector("#module-editor-tab"),false);
  render();
  const trigger = modularPaletteTrigger(modularCellKey(layer,row,col));
  if (trigger && openColour) openPalette(trigger,"modular",modularCellKey(layer,row,col));
}
function renderModularEditors() {
  const state = modularState;
  activeModularLayer = Math.min(activeModularLayer,state.layers-1);
  activeModule.row = Math.min(activeModule.row,state.rows-1);
  activeModule.col = Math.min(activeModule.col,state.columns-1);
  const layerList = document.querySelector("#modular-layer-list");
  layerList.replaceChildren();
  for(let i=0;i<state.layers;i++){
    const label = "Layer "+(i+1);
    const data = state.layerData[i];
    const selector = createObjectSelector(i,label,()=>{
      closePalette(false);activeModularLayer=i;render();
      layerList.children[i]?.querySelector(".object-selector-select")?.focus();
    },trigger=>{
      if(activeModularLayer!==i){closePalette(false);activeModularLayer=i;render();trigger=modularPaletteTrigger("layer:"+i);}
      if(trigger)openPalette(trigger,"modular","layer:"+i);
    },visible=>{
      data.visible=visible;render();layerList.children[i]?.querySelector("input")?.focus();
    });
    selector.colour.dataset.modularColour="layer:"+i;
    updateObjectSelector(selector,label,data.colour,data.visible,activeModularLayer===i);
    paintFillSwatch(selector.colour,"modular:layer:"+i);
    layerList.append(selector.card);
  }
  const layerSelect=document.querySelector("#modular-module-layer");
  layerSelect.replaceChildren(...Array.from({length:state.layers},(_,i)=>{
    const option=document.createElement("option");option.value=i;option.textContent="Layer "+(i+1);return option;
  }));
  layerSelect.value=activeModularLayer;
  const data=state.layerData[activeModularLayer];
  document.querySelector("#modular-layer-title").textContent="Layer "+(activeModularLayer+1);
  for(const key of ["x","y","opacity"]){
    document.querySelector("#modular-layer-"+key).value=data[key];
    document.querySelector("#modular-layer-"+key+"-output").value=data[key]+(key==="opacity"?"%":" px");
  }
  document.querySelector("#modular-selected-cell").textContent="Row "+(activeModule.row+1)+" · Column "+(activeModule.col+1);
  const grid=document.querySelector("#modular-grid");
  grid.replaceChildren();
  grid.style.setProperty("--modular-columns",state.columns);
  const header=document.createElement("div");header.className="segment-grid-row";
  header.append(document.createElement("span"));
  for(let col=0;col<state.columns;col++){const label=document.createElement("span");label.className="segment-column-label";label.textContent=col+1;header.append(label);}
  grid.append(header);
  for(let row=0;row<state.rows;row++){
    const line=document.createElement("div");line.className="segment-grid-row";
    const label=document.createElement("span");label.className="segment-grid-label";label.textContent=row+1;line.append(label);
    for(let col=0;col<state.columns;col++){
      const cell=modularModule(state,activeModularLayer,row,col);
      const included=modularIncluded(state,activeModularLayer,row,col);
      const button=document.createElement("button");button.type="button";
      button.className="segment-cell"+(!cell.visible||!included?" is-empty":"")+(row===activeModule.row&&col===activeModule.col?" is-selected":"");
      button.style.setProperty("--cell-color",cell.colour);
      button.textContent=!cell.visible||!included?"∅":"";
      button.disabled=!included;
      button.dataset.modularColour=modularCellKey(activeModularLayer,row,col);
      button.setAttribute("aria-label","Row "+(row+1)+", column "+(col+1)+(included?": "+paletteLabel(cell.colour):": unavailable in checkerboard"));
      paintFillSwatch(button,"modular:"+modularCellKey(activeModularLayer,row,col));
      button.setAttribute("aria-pressed",String(row===activeModule.row&&col===activeModule.col));
      button.setAttribute("aria-haspopup","dialog");button.setAttribute("aria-expanded","false");button.setAttribute("aria-controls","palette-popover");
      button.addEventListener("click",()=>selectModularCell(activeModularLayer,row,col,true));
      line.append(button);
    }
    grid.append(line);
  }
}

function initModular() {
  modularKeys.forEach(key=>document.querySelector("#modular-"+key).addEventListener("input",event=>{
    closePalette(false);modularState[key]=Number(event.target.value);render();
  }));
  document.querySelector("#modular-arrangement").addEventListener("change",event=>{
    modularState.arrangement=event.target.value;render();
  });
  document.querySelector("#modular-module-layer").addEventListener("change",event=>{
    activeModularLayer=Number(event.target.value);render();
  });
  for(const key of ["x","y","opacity"])document.querySelector("#modular-layer-"+key).addEventListener("input",event=>{
    modularState.layerData[activeModularLayer][key]=Number(event.target.value);render();
  });
  document.querySelector("#reset-modular-layer").addEventListener("click",()=>{
    const data=modularState.layerData[activeModularLayer];data.x=0;data.y=0;render();
  });
  document.querySelector("#reference-modular").addEventListener("click",()=>{
    closePalette(false);applyModularCandidate(createModularCandidate(true));
  });
}

function createModularCandidate(reference=false) {
  const state=referenceModularState();
  if(!reference){
    state.arrangement=randomChoice(["offset","offset","staggered","checkerboard","aligned"]);
    state.columns=randomInteger(3,7);state.rows=randomInteger(3,7);
    state.width=randomInteger(75,190,5);state.height=randomInteger(75,190,5);
    state.radius=randomInteger(10,65,5);
    state["gap-x"]=randomInteger(4,24,2);state["gap-y"]=randomInteger(4,24,2);
    state.layers=randomChoice([1,2,2,2,3,4]);
    state.layerData.forEach(layer=>{layer.x=0;layer.y=0;});
    if(state.layers>1 && state.arrangement==="aligned") {
      for(let i=1;i<state.layers;i++){
        state.layerData[i].x=i%2?Math.round(state.width/3):0;
        state.layerData[i].y=i>=2?Math.round(state.height/3):0;
      }
    }
    const family=randomChoice(BRAND_PALETTE.slice(0,4));
    const other=randomChoice([family,family,...BRAND_PALETTE.slice(0,4)]);
    state.layerData[0].colour=family.values[randomChoice([1,2,3])][1];
    state.layerData[1].colour=other.values[randomChoice([2,3,4])][1];
    state.layerData[1].opacity=randomChoice([75,85,100,100]);
    state.layerData.forEach((layer,i)=>{
      layer.modules={};
      if(i>=2){
        const layerFamily=randomChoice([family,family,other,...BRAND_PALETTE.slice(0,4)]);
        layer.colour=layerFamily.values[randomChoice([1,2,3])][1];
        layer.opacity=randomChoice([60,75,85]);
      }
    });
    const layer=state.layers-1;
    const row=Math.floor((state.rows-1)/2),col=Math.floor((state.columns-1)/2);
    const accentCol=modularIncluded(state,layer,row,col)?col:col+1;
    state.layerData[layer].modules[modularModuleKey(row,accentCol)]={colour:randomChoice(BRAND_100_COLOURS),visible:true};
  }
  return {type:"modular",modular:state,settings:{rotation:reference?0:randomChoice([0,0,0,45,90]),scale:reference?100:randomInteger(85,115,5),background:reference||Math.random()<.5,overlapMode:reference?"multiply":randomChoice(["multiply","multiply","normal","transparent"])},seed:reference?4821:randomInteger(1,1000000000)};
}
function applyModularCandidate(candidate){
  restorePatternFills(candidate.patterns);
  restoreModularState(candidate.modular);
  controls.rotation.value=candidate.settings.rotation;
  controls.scale.value=candidate.settings.scale;
  controls.background.checked=candidate.settings.background;
  controls.overlapModes.forEach(input=>input.checked=input.value===candidate.settings.overlapMode);
  compositionSeed=candidate.seed;
  render();
}
function validModularPreset(payload){
  const state=payload.modular, settings=payload.settings;
  const integer=isIntegerBetween;
  return payload.version===2 && state && settings && integer(payload.randomSeed,1,1000000000)
    && integer(settings.rotationDegrees,0,359) && integer(settings.scalePercent,70,150) && typeof settings.background==="boolean"
    && ["normal","multiply","transparent"].includes(settings.overlapMode)
    && MODULAR_ARRANGEMENTS.includes(state.arrangement)
    && modularKeys.every((key,index)=>integer(state[key],...modularLimits[index]))
    && Array.isArray(state.layerData)&&state.layerData.length>=state.layers&&state.layerData.length<=4
    && state.layerData.every(layer=>layer&&isBrandColour(layer.colour)&&typeof layer.visible==="boolean"
      && integer(layer.x,-300,300)&&integer(layer.y,-300,300)&&integer(layer.opacity,0,100)
      && layer.modules&&typeof layer.modules==="object"&&!Array.isArray(layer.modules)
      && Object.entries(layer.modules).every(([key,item])=>/^[0-9]:[0-9]$/.test(key)&&item
        && (item.colour===null||isBrandColour(item.colour))&&typeof item.visible==="boolean"));
}

function modularHit(rect,x,y){
  const dx=Math.abs(x-rect.x-rect.width/2)-rect.width/2+rect.radius;
  const dy=Math.abs(y-rect.y-rect.height/2)-rect.height/2+rect.radius;
  return Math.hypot(Math.max(dx,0),Math.max(dy,0))+Math.min(Math.max(dx,dy),0)<=rect.radius;
}
function evaluateModularCandidate(candidate){
  const state=candidate.modular;
  const layers=Array.from({length:state.layers},(_,i)=>modularRectangles(state,i));
  const angle=-candidate.settings.rotation*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle),scale=candidate.settings.scale/100;
  let painted=0,intersection=0,sx=0,sy=0,accentVisible=false;
  const size=32;
  for(let row=0;row<size;row++)for(let col=0;col<size;col++){
    const dx=(col+.5)*600/size-300,dy=(row+.5)*600/size-300;
    const x=300+(dx*cos-dy*sin)/scale,y=300+(dx*sin+dy*cos)/scale;
    const hits=layers.map(layer=>layer.find(rect=>modularHit(rect,x,y)));
    const n=hits.filter(Boolean).length;
    if(n>=2)intersection++;
    if(candidate.settings.overlapMode==="transparent"?n!==1:n===0)continue;
    painted++;sx+=dx;sy+=dy;
    if(hits.some((rect,i)=>rect&&rect.colour!==state.layerData[i].colour))accentVisible=true;
  }
  const coverage=painted/(size*size),overlap=intersection/(size*size);
  const displacement=painted?Math.hypot(sx/painted,sy/painted)/300:1;
  const families=new Set(state.layerData.slice(0,state.layers).map(layer=>paletteEntry(layer.colour)?.family));
  const palette=clamp01(1-.15*(families.size-1));
  return scoreDesignCandidate({
    palette,balance:clamp01(1-displacement/.4),
    negativeSpace:clamp01(1-Math.abs(coverage-.75)/.75),
    restraint:state.layers===1?.9:clamp01(1-Math.abs(overlap-.35)/.55),
    valid:coverage>=.25&&coverage<=.99&&accentVisible
      && (state.layers===1||candidate.settings.overlapMode==="normal"||overlap>=.03||state.arrangement==="checkerboard")
  });
}
