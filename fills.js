// Pattern fills are stored separately from the existing solid-colour state.
// A child with its own colour or pattern overrides the inherited group fill.
const PATTERN_TYPES = [["horizontal","Horizontal"],["vertical","Vertical"],["diagonal","Diagonal"],["crosshatch","Crosshatch"],["dots","Dots"],["grid","Grid"],["checkerboard","Checkerboard"]];
let patternFills = new Map();
let patternDraft = null;
let patternMode = "solid";
let patternColourTarget = "foreground";
let patternDefs = null;
let patternIds = new Map();
let patternSwatchCache = new Map();

function clonePatternFills() { return Object.fromEntries(Array.from(patternFills, ([key,fill])=>[key,{...fill}])); }
function restorePatternFills(fills) { patternFills = new Map(Object.entries(fills || {}).map(([key,fill])=>[key,{...fill}])); }
function patternKey(target) {
  if(target.type==="cell")return "cell:"+target.ring+":"+target.segment;
  if(target.type==="dot")return "dot";
  return target.type+":"+target.index;
}
function patternEligible(target) { return target.type!=="orbital" && (target.type!=="contour" || String(target.index).startsWith("accent:")); }
function resolvedPattern(key) {
  if(patternFills.has(key))return patternFills.get(key);
  const parts=key.split(":");
  if(parts[0]==="cell" && !cellColors.has(cellKey(Number(parts[1]),Number(parts[2]))))return patternFills.get("group:"+parts[2]);
  if(parts[0]==="modular"&&parts[1]==="module"){
    const layer=modularState.layerData[Number(parts[2])];
    if(!layer.modules[parts[3]+":"+parts[4]]?.colour)return patternFills.get("modular:layer:"+parts[2]);
  }
  if(parts[0]==="triangular"&&parts.length===3&&!triangleState.cells[parts[1]+":"+parts[2]]?.colour)return patternFills.get("triangular:default");
  return undefined;
}
function defaultPattern(colour) {
  return {type:"diagonal",foreground:colour,background:null,spacing:16,weight:3,rotation:0,alignment:"composition"};
}
function validPatternFills(fills,type) {
  if(fills===undefined)return true;
  if(!fills||typeof fills!=="object"||Array.isArray(fills)||Object.keys(fills).length>500)return false;
  const keys={
    concentric:/^(?:dot|group:[0-7]|cell:[0-7]:[0-7])$/,
    radiating:/^(?:group:[0-7]|cell:0:[0-7])$/,
    interlocking:/^(?:group:[0-7]|cell:0:[0-7])$/,
    contour:/^contour:accent:[0-5]$/,
    modular:/^modular:(?:layer:[0-3]|module:[0-3]:[0-9]:[0-9])$/,
    triangular:/^triangular:(?:default|(?:[0-9]|1[01]):(?:[0-9]|1[01]))$/
  }[type];
  return Boolean(keys)&&Object.entries(fills).every(([key,p])=>keys.test(key)&&p&&PATTERN_TYPES.some(([id])=>id===p.type)
    &&isBrandColour(p.foreground)&&(p.background===null||isBrandColour(p.background))
    &&isIntegerBetween(p.spacing,4,64)&&isIntegerBetween(p.weight,1,Math.min(32,p.spacing-1))
    &&isIntegerBetween(p.rotation,0,359)&&["composition","object"].includes(p.alignment));
}
function svgElement(tag,attributes) {
  const element=document.createElementNS("http://www.w3.org/2000/svg",tag);
  Object.entries(attributes).forEach(([key,value])=>element.setAttribute(key,value));
  return element;
}
function makePatternDefinition(p,id,x=0,y=0,extraRotation=0){
  const s=p.spacing,w=p.weight;
  const tile=p.type==="checkerboard"?2*s:s;
  const base=p.type==="vertical"?90:["diagonal","crosshatch"].includes(p.type)?45:0;
  const pattern=svgElement("pattern",{id,patternUnits:"userSpaceOnUse",width:tile,height:tile,patternTransform:"translate("+x+" "+y+") rotate("+(p.rotation+base+extraRotation)+")"});
  if(p.background)pattern.append(svgElement("rect",{width:tile,height:tile,fill:p.background}));
  if(p.type==="dots")pattern.append(svgElement("circle",{cx:s/2,cy:s/2,r:w/2,fill:p.foreground}));
  else if(p.type==="checkerboard"){
    pattern.append(svgElement("rect",{width:s,height:s,fill:p.foreground}),svgElement("rect",{x:s,y:s,width:s,height:s,fill:p.foreground}));
  }else{
    pattern.append(svgElement("rect",{width:s,height:w,fill:p.foreground}));
    if(["grid","crosshatch"].includes(p.type))pattern.append(svgElement("rect",{width:w,height:s,fill:p.foreground}));
  }
  return pattern;
}
function beginPatternRender(){patternDefs=null;patternIds=new Map();patternSwatchCache=new Map();}
function svgPatternFill(key,solid,geometry={}){
  const p=resolvedPattern(key);
  if(!p)return solid;
  const x=p.alignment==="object"?(geometry.x||0):-(geometry.offsetX||0);
  const y=p.alignment==="object"?(geometry.y||0):-(geometry.offsetY||0);
  const rotation=p.alignment==="object"?(geometry.rotation||0):0;
  const hash=JSON.stringify([p,x,y,rotation]);
  if(patternIds.has(hash))return "url(#"+patternIds.get(hash)+")";
  if(!patternDefs){patternDefs=svgElement("defs",{});art.append(patternDefs);}
  const id="pb-fill-"+patternIds.size;
  patternIds.set(hash,id);
  patternDefs.append(makePatternDefinition(p,id,x,y,rotation));
  return "url(#"+id+")";
}
function patternImage(p,wide=false){
  const key=JSON.stringify([p,wide]);
  if(patternSwatchCache.has(key))return patternSwatchCache.get(key);
  const width=wide?120:60,height=wide?38:60;
  const svg=svgElement("svg",{viewBox:"0 0 "+width+" "+height});
  const defs=svgElement("defs",{});defs.append(makePatternDefinition(p,"swatch"));svg.append(defs,svgElement("rect",{width,height,fill:"url(#swatch)"}));
  const image='url("data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(svg))+'")';
  if(patternSwatchCache.size>512)patternSwatchCache.clear();
  patternSwatchCache.set(key,image);
  return image;
}
function paintFillSwatch(element,key){
  const p=resolvedPattern(key);
  element.classList.toggle("has-pattern",Boolean(p));
  if(p){
    element.style.setProperty("--fill-image",patternImage(p));
    const label=element.getAttribute("aria-label");
    if(label)element.setAttribute("aria-label",label+", "+PATTERN_TYPES.find(([id])=>id===p.type)[1]+" pattern");
  }else element.style.removeProperty("--fill-image");
}
function openFillEditor(target){
  const eligible=patternEligible(target);
  document.querySelector("#fill-tabs").hidden=!eligible;
  palettePopover.setAttribute("aria-label",eligible?"Choose a fill":"Choose a colour");
  patternDraft={...(resolvedPattern(patternKey(target))||defaultPattern(targetColour(target)))};
  patternColourTarget="foreground";
  showFillMode(eligible&&resolvedPattern(patternKey(target))?"pattern":"solid");
}
function showFillMode(mode){
  patternMode=mode;
  document.querySelector("#solid-fill-tab").setAttribute("aria-pressed",String(mode==="solid"));
  document.querySelector("#pattern-fill-tab").setAttribute("aria-pressed",String(mode==="pattern"));
  document.querySelector("#pattern-fill-controls").hidden=mode!=="pattern";
  if(mode==="pattern")refreshPatternEditor();
  else if(paletteTarget)highlightPatternColour(targetColour(paletteTarget));
  positionPalette();
}
function highlightPatternColour(colour){
  const options=Array.from(paletteGrid.querySelectorAll(".palette-option"));
  const selected=colour?.toUpperCase();
  options.forEach((option,index)=>{
    const active=option.dataset.color===selected;
    option.setAttribute("aria-checked",String(active));
    option.tabIndex=active||(!selected&&index===0)?0:-1;
  });
}
function refreshPatternEditor(){
  if(!patternDraft)return;
  const p=patternDraft;
  const types=document.querySelector("#pattern-types");
  types.replaceChildren();
  PATTERN_TYPES.forEach(([id,name])=>{
    const button=document.createElement("button");button.type="button";button.className="pattern-type";
    button.setAttribute("aria-pressed",String(p.type===id));
    const sample=document.createElement("span");
    sample.style.backgroundImage=patternImage({...p,type:id,rotation:0,spacing:10,weight:3});
    button.append(sample,document.createTextNode(name));
    button.addEventListener("click",()=>{p.type=id;commitPatternDraft();types.querySelector('[aria-pressed="true"]')?.focus();});
    types.append(button);
  });
  for(const key of ["foreground","background"]){
    const button=document.querySelector("#pattern-"+key);
    button.setAttribute("aria-pressed",String(patternColourTarget===key));
    button.querySelector(".pattern-colour-chip").style.background=p[key]||"transparent";
  }
  document.querySelector("#pattern-transparent").setAttribute("aria-pressed",String(p.background===null));
  for(const key of ["spacing","weight","rotation","alignment"])document.querySelector("#pattern-"+key).value=p[key];
  document.querySelector("#pattern-weight").max=Math.min(32,p.spacing-1);
  document.querySelector("#pattern-weight").disabled=p.type==="checkerboard";
  document.querySelector("#pattern-preview").style.backgroundImage=patternImage(p,true);
  highlightPatternColour(p[patternColourTarget]);
  positionPalette();
}
function commitPatternDraft(){
  if(!paletteTarget||!patternEligible(paletteTarget)||!patternDraft)return;
  choosePaletteColour(patternDraft.foreground,{...patternDraft});
  refreshPatternEditor();
}
function initFillEditor(){
  document.querySelector("#solid-fill-tab").addEventListener("click",()=>{
    if(!paletteTarget)return;
    const existing=resolvedPattern(patternKey(paletteTarget));
    showFillMode("solid");
    if(existing)choosePaletteColour(existing.foreground);
  });
  document.querySelector("#pattern-fill-tab").addEventListener("click",()=>{
    if(!paletteTarget)return;
    showFillMode("pattern");
    if(!resolvedPattern(patternKey(paletteTarget)))commitPatternDraft();
  });
  for(const key of ["foreground","background"])document.querySelector("#pattern-"+key).addEventListener("click",()=>{patternColourTarget=key;refreshPatternEditor();});
  document.querySelector("#pattern-transparent").addEventListener("click",()=>{patternDraft.background=null;patternColourTarget="background";commitPatternDraft();});
  for(const key of ["spacing","weight","rotation"]){
    const input=document.querySelector("#pattern-"+key);
    const update=(event,final)=>{
      if(!paletteTarget||!patternDraft)return;
      const value=Number(event.target.value);
      if(!final&&(event.target.value===""||!Number.isFinite(value)||value<Number(input.min)||value>Number(input.max)))return;
      if(Number.isFinite(value))patternDraft[key]=Math.max(Number(input.min),Math.min(Number(input.max),Math.round(value)));
      patternDraft.weight=Math.min(patternDraft.weight,patternDraft.spacing-1);
      commitPatternDraft();
    };
    input.addEventListener("input",event=>update(event,false));
    input.addEventListener("change",event=>update(event,true));
  }
  document.querySelector("#pattern-alignment").addEventListener("change",event=>{patternDraft.alignment=event.target.value;commitPatternDraft();});
}
// Automatic patterns need enough room to read as a texture, not a stray
// mark. Check both the actual rendered size and the number of repeats.
// Manual editing and imported presets intentionally remain unrestricted.
function generatedPatternFits(shortDimension, pattern, scale = 1) {
  const repeats = pattern.type === "checkerboard" ? 4 : 3;
  return shortDimension * scale >= 40 && shortDimension >= repeats * pattern.spacing;
}

function generatedGroupPatternFits(candidate, index, pattern) {
  const raw = candidate.settings;
  const scale = raw.scale / 100;
  const variation = raw.variation / 100;
  if (candidate.emptyGroups.has(index)) return false;
  if (candidate.type === "interlocking") {
    if (candidate.emptyCells.has(cellKey(0, index)) || candidate.cellColours.has(cellKey(0, index))) return false;
    const geometry = circleGeometry({...raw,scale,variation},index,candidate.seed,candidate.circleSizes);
    return generatedPatternFits(geometry.r * 2,pattern);
  }
  if (candidate.type === "radiating") {
    if (candidate.emptyCells.has(cellKey(0, index)) || candidate.cellColours.has(cellKey(0, index))) return false;
    const width = raw.bandWidth * scale * (1 + (seededUnit(index + 47,candidate.seed) - .5) * variation * .4);
    const position = raw.segments === 1 ? .5 : index / (raw.segments - 1);
    const length = raw.bandLength * scale * Math.max(.35,.64 + .36 * Math.sin(Math.PI * position) + (seededUnit(index + 29,candidate.seed) - .5) * variation * .5);
    return generatedPatternFits(Math.min(width,length),pattern);
  }
  const outer = 245 * scale, inner = outer * raw.clearance / 100;
  const radialSpace = Math.max(1,outer-inner);
  const gap = Math.min(raw.spacing,radialSpace/(raw.rings*2));
  const width = (radialSpace-gap*(raw.rings-1))/raw.rings;
  // A group pattern is inherited by all non-overridden visible sections.
  // Require even the narrowest of those sections to accommodate the repeat.
  const sections = [];
  for(let ring=0;ring<raw.rings;ring++){
    const key=cellKey(ring,index);
    if(candidate.emptyCells.has(key)||candidate.cellColours.has(key))continue;
    const radius = outer-ring*(width+gap)-width/2;
    sections.push(Math.min(width,2*radius*Math.sin(Math.PI/raw.segments)));
  }
  return sections.length>0 && sections.every(size=>generatedPatternFits(size,pattern));
}

function randomCandidatePatterns(candidate){
  const result={};
  if(candidate.type==="orbital")return result;
  if(candidate.seed===4821||Math.random()>=.25)return result;
  const p={...defaultPattern("#25282a"),type:randomChoice(PATTERN_TYPES.map(([id])=>id)),spacing:randomChoice([10,14,18,22]),weight:randomChoice([2,3,4]),rotation:0};
  const put=(key,colour)=>{result[key]={...p,foreground:colour};};
  const scale=candidate.settings.scale/100;
  if(candidate.type==="contour"){
    const options=candidate.contour.circles.slice(0,candidate.contour.accents).map((c,i)=>({c,i})).filter(({c})=>c.visible && circleFitsContour(candidate.contour,c) && generatedPatternFits(c.diameter,p,scale));
    if(options.length){const {c,i}=randomChoice(options);put("contour:accent:"+i,c.colour);}
  }else if(candidate.type==="modular"){
    const s=candidate.modular;
    const options=[];for(let r=0;r<s.rows;r++)for(let c=0;c<s.columns;c++)if(modularIncluded(s,0,r,c)&&modularModule(s,0,r,c).visible&&generatedPatternFits(Math.min(s.width,s.height),p,scale))options.push([r,c]);
    if(options.length){const [r,c]=randomChoice(options);put("modular:module:0:"+r+":"+c,modularModule(s,0,r,c).colour);}
  }else if(candidate.type==="triangular"){
    const s=candidate.triangular,options=[];
    for(let r=0;r<s.rows;r++)for(let c=0;c<s.columns;c++){
      const shape=triangleGeometry(s,r,c);
      // The diameter of the inscribed circle is a conservative measure of
      // the space available within a right triangle.
      const inscribedDiameter=shape.w+shape.h-Math.hypot(shape.w,shape.h);
      if(shape.visible&&generatedPatternFits(inscribedDiameter,p,scale))options.push([r,c]);
    }
    shuffled(options).slice(0,Math.max(1,Math.floor(options.length*.16))).forEach(([r,c])=>put("triangular:"+r+":"+c,triangleCell(s,r,c).colour));
  }else{
    const options=candidate.colours.map((colour,i)=>({colour,i})).filter(({i})=>generatedGroupPatternFits(candidate,i,p));
    if(options.length){const {colour,i}=randomChoice(options);put("group:"+i,colour);}
  }
  return result;
}
