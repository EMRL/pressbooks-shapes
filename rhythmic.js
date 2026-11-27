// Coordinated directional fields: all lines follow one shared geometric rule.
const RHYTHMIC_MODES=["chevron","zigzag","herringbone","gradient","stepped","folded"];
const rhythmicLimits={count:[3,40],weight:[1,24],spacing:[6,45],angle:[0,75],fields:[1,8],amplitude:[0,180],frequency:[1,8],groups:[1,6],progression:[-80,80]};
let rhythmicState=referenceRhythmicState(),activeRhythm=0,hoveredRhythm=null;
function referenceRhythmicState(){
  return {arrangement:"chevron",symmetry:"mirrored",count:18,weight:5,spacing:17,angle:35,fields:3,amplitude:52,frequency:3,groups:3,progression:0,
    colours:["#25282a","#5da3b2","#bb2026","#f4af23","#00a47d","#a7a8a9"],objects:{}};
}
function rhythmicClone(){return JSON.parse(JSON.stringify(rhythmicState));}
function restoreRhythmicState(s){rhythmicState=JSON.parse(JSON.stringify(s));activeRhythm=0;hoveredRhythm=null;}
function rhythmicOverride(i){return rhythmicState.objects[i] ||= {};}
function rhythmicColour(key){
  if(String(key).startsWith("group:"))return rhythmicState.colours[Number(key.split(":")[1])];
  return rhythmicState.objects[key]?.colour||rhythmicState.colours[rhythmicGroup(rhythmicState,Number(key))];
}
function rhythmicGroup(s,i){return Math.min(s.groups-1,Math.floor(i*s.groups/s.count));}
// Every field meets its neighbour at the same endpoint. The repeated
// motif is extended beyond the crop (including rotated/scaled artboards).
function rhythmicField(s,f,span,amplitude){
  const left=f*span,right=left+span;
  const sign=s.symmetry==="mirrored"&&Math.abs(f%2)===1?-1:1;
  const a=amplitude*sign;
  switch(s.arrangement){
    case "zigzag": {
      const n=s.frequency*2;
      return Array.from({length:n+1},(_,j)=>[left+span*j/n,j%2?a:0]);
    }
    case "herringbone":
      // A continuous diagonal alternates direction at each field boundary.
      // Parallel fields use a shorter return slope rather than a flat cap.
      return s.symmetry==="mirrored"
        ? [[left,-a],[right,a]]
        : [[left,-a],[left+span*.8,a],[right,-a]];
    case "gradient": {
      const t=Math.max(0,Math.min(1,f/Math.max(1,s.fields-1)));
      const length=.35+.45*(s.progression<0?1-t:t);
      return [[left,0],[left+span*(1-length)/2,-a*.5],[left+span*(1+length)/2,a*.5],[right,0]];
    }
    case "stepped": {
      // Plateau runs connected by short diagonal rises, without separate
      // subpaths or coincident vertical strokes from neighbouring lines.
      const n=s.frequency*2,points=[[left,0]];
      for(let j=0;j<n;j++){
        const y=j<n/2?-a*(j+1)/(n/2):-a*(n-j-1)/(n/2);
        const x=left+span*j/n,dx=span/n;
        points.push([x+dx*.25,y],[x+dx,y]);
      }
      return points;
    }
    case "folded":
      return [[left,0],[left+span*.3,-a],[left+span*.7,a],[right,0]];
    default:
      return [[left,0],[left+span/2,-a],[right,0]];
  }
}
function rhythmicGeometry(s,settings=null){
  const lines=[],span=600/s.fields;
  const slope=Math.tan(s.angle*Math.PI/180);
  const amplitude=Math.min(s.amplitude,span/2*slope);
  // In the reference frame the entire original width remains present.
  // Only add extra fields as needed to put the two actual endpoints
  // outside the transformed square, even at minimum scale.
  const angle=(settings?.rotation||0)*Math.PI/180;
  const scale=settings?.scale||1;
  const halfWidth=300*(Math.abs(Math.cos(angle))+Math.abs(Math.sin(angle)))/scale;
  const extension=settings?Math.min(12,Math.max(0,Math.ceil((halfWidth+14-300)/span))):0;
  const profile=[];
  for(let f=-extension;f<s.fields+extension;f++){
    const points=rhythmicField(s,f,span,amplitude);
    if(profile.length){
      const last=profile[profile.length-1],first=points[0];
      // Floating point boundaries can differ by a fraction of a pixel.
      // Use the previous endpoint instead of making a tiny duplicate segment.
      if(Math.abs(last[0]-first[0])<1e-7&&Math.abs(last[1]-first[1])<1e-7)points.shift();
    }
    profile.push(...points);
  }
  if(settings&&extension){
    // Retain only the necessary overscan, not whole extra fields.
    const minX=Math.min(0,300-halfWidth-14),maxX=Math.max(600,300+halfWidth+14);
    const clipped=[];
    for(let j=1;j<profile.length;j++){
      const [ax,ay]=profile[j-1],[bx,by]=profile[j];
      if(bx<minX||ax>maxX||bx<=ax)continue;
      const x1=Math.max(ax,minX),x2=Math.min(bx,maxX);
      if(x2<=x1)continue;
      const at=x=>[x,ay+(by-ay)*(x-ax)/(bx-ax)];
      if(!clipped.length)clipped.push(at(x1));
      clipped.push(at(x2));
    }
    profile.splice(0,profile.length,...clipped);
  }
  let maxSlope=0;
  for(let j=1;j<profile.length;j++){
    const dx=profile[j][0]-profile[j-1][0],dy=profile[j][1]-profile[j-1][1];
    if(Math.abs(dx)>1e-7)maxSlope=Math.max(maxSlope,Math.abs(dy/dx));
  }
  const positions=[0];let gapTotal=0;
  for(let i=1;i<s.count;i++){
    const t=(i-.5)/(s.count-1);
    gapTotal+=s.spacing*(s.arrangement==="gradient"?1+s.progression/100*(2*t-1):1);
    positions.push(gapTotal);
  }
  for(let i=0;i<s.count;i++){
    const o=s.objects[i]||{};if(o.visible===false)continue;
    const t=i/(s.count-1),y=300+positions[i]-gapTotal/2;
    const pitch=Math.min(i>0?positions[i]-positions[i-1]:Infinity,i<s.count-1?positions[i+1]-positions[i]:Infinity);
    const clearance=pitch/Math.hypot(1,maxSlope);
    const weight=Math.min(clearance*.85,Math.max(.5,s.weight*(1+s.progression/100*(2*t-1))));
    const colour=o.colour||s.colours[rhythmicGroup(s,i)];
    lines.push({i,paths:[profile.map(([x,offset])=>[x,y+offset])],colour,weight});
  }
  return lines;
}
function rhythmicPath(line){
  return line.paths[0].map(([x,y],j)=>(j?"L":"M")+x+" "+y).join(" ");
}
function renderRhythmic(settings){
  art.replaceChildren();art.removeAttribute("transform");art.style.isolation="isolate";hoveredRhythm=null;
  const s=rhythmicState,lines=rhythmicGeometry(s,settings);
  if(settings.background)art.append(svgElement("rect",{width:600,height:600,fill:"#fff"}));
  const g=svgElement("g",{transform:"translate(300 300) rotate("+settings.rotation+") scale("+settings.scale+") translate(-300 -300)","data-rhythmic-geometry":""});
  for(const line of lines){
    const path=svgElement("path",{d:rhythmicPath(line),fill:"none",stroke:line.colour,"stroke-width":line.weight,"stroke-linejoin":"round","stroke-linecap":"butt","data-rhythmic-index":line.i,role:"button",tabindex:0,"aria-label":"Line "+(line.i+1)});
    const select=()=>{closePalette(false);selectRhythmicLine(line.i,true);};
    path.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();select();}});g.append(path);
  }
  art.append(g);stage.classList.toggle("has-background",settings.background);
  document.querySelector("#shape-count").textContent=lines.length+" lines";
  document.querySelector("#variation-readout").textContent=s.fields+" directional fields";
  document.querySelector("#shape-desc").textContent=lines.length+" coordinated lines in a "+s.arrangement+" arrangement.";
  for(const key of ["arrangement","symmetry"])document.querySelector("#rhythmic-"+key).value=s[key];
  Object.keys(rhythmicLimits).forEach(key=>{
    document.querySelector("#rhythmic-"+key).value=s[key];
    document.querySelector("#rhythmic-"+key+"-output").value=s[key]+(["weight","spacing","amplitude"].includes(key)?" px":key==="angle"?"°":key==="progression"?"%":"");
  });
  document.querySelector("#rhythmic-frequency-row").hidden=!["zigzag","stepped"].includes(s.arrangement);
  outputs.scale.value=Math.round(settings.scale*100)+"%";outputs.rotation.value=settings.rotation+"°";
  renderRhythmicEditor();refreshRangeInputs();updateRhythmicHighlight();
}
function renderRhythmicEditor(){
  activeRhythm=Math.min(activeRhythm,rhythmicState.count-1);
  const groups=document.querySelector("#rhythmic-group-list");groups.replaceChildren();
  for(let i=0;i<rhythmicState.groups;i++){
    const button=document.createElement("button");button.type="button";button.className="color-trigger";
    button.dataset.rhythmicColour="group:"+i;button.setAttribute("aria-haspopup","dialog");button.setAttribute("aria-expanded","false");button.setAttribute("aria-controls","palette-popover");
    const swatch=document.createElement("span");swatch.className="color-swatch";button.append(swatch);
    updateColourTrigger(button,rhythmicState.colours[i],"Colour group "+(i+1));button.addEventListener("click",()=>openPalette(button,"rhythmic","group:"+i));groups.append(button);
  }
  const list=document.querySelector("#rhythmic-list");list.replaceChildren();
  for(let i=0;i<rhythmicState.count;i++){
    const item=createObjectSelector(i,"Line "+(i+1),()=>{closePalette(false);selectRhythmicLine(i);},button=>{selectRhythmicLine(i);openPalette(button,"rhythmic",i);},visible=>{activeRhythm=i;rhythmicOverride(i).visible=visible;render();});
    item.colour.dataset.rhythmicColour=i;item.card.dataset.rhythmicCard=i;
    item.card.addEventListener("pointerenter",()=>{hoveredRhythm=i;updateRhythmicHighlight();});item.card.addEventListener("pointerleave",()=>{hoveredRhythm=null;updateRhythmicHighlight();});
    updateObjectSelector(item,"Line "+(i+1),rhythmicColour(i),rhythmicState.objects[i]?.visible!==false,i===activeRhythm);list.append(item.card);
  }
  updateRhythmicSelection();
}
function updateRhythmicSelection(){
  document.querySelector("#rhythmic-object-title").textContent="Line "+(activeRhythm+1)+" of "+rhythmicState.count+(rhythmicState.objects[activeRhythm]?.visible===false?" (hidden)":"");
}
function selectRhythmicLine(index,openEditor=false){
  activeRhythm=(index+rhythmicState.count)%rhythmicState.count;hoveredRhythm=null;
  if(openEditor)activateEditorTab(document.querySelector("#rhythmic-editor-tab"),false);
  document.querySelectorAll("[data-rhythmic-card]").forEach(card=>{
    const active=Number(card.dataset.rhythmicCard)===activeRhythm;
    card.classList.toggle("is-active",active);card.querySelector(".object-selector-select").setAttribute("aria-pressed",String(active));
    if(active){const list=card.parentElement,r=list.getBoundingClientRect(),c=card.getBoundingClientRect();if(c.top<r.top)list.scrollTop+=c.top-r.top;else if(c.bottom>r.bottom)list.scrollTop+=c.bottom-r.bottom;}
  });
  updateRhythmicSelection();updateRhythmicHighlight();
}
function updateRhythmicHighlight(){
  const editing=designTypeSelect.value==="rhythmic"&&document.querySelector("#rhythmic-editor-tab").getAttribute("aria-selected")==="true";
  preview.classList.toggle("rhythmic-editing",editing);
  const g=art.querySelector("[data-rhythmic-geometry]");if(!g)return;
  g.querySelectorAll("[data-editor-only]").forEach(e=>e.remove());
  const i=hoveredRhythm??activeRhythm;
  g.querySelectorAll("[data-rhythmic-index]").forEach(e=>e.classList.toggle("rhythmic-highlighted",editing&&Number(e.dataset.rhythmicIndex)===i));
  const path=g.querySelector('[data-rhythmic-index="'+i+'"]');
  if(editing&&path){const overlay=svgElement("path",{d:path.getAttribute("d"),fill:"none",stroke:path.getAttribute("stroke"),"stroke-width":path.getAttribute("stroke-width"),"stroke-linejoin":"round","pointer-events":"none","data-editor-only":"","aria-hidden":"true"});g.append(overlay);}
}
function stripRhythmicEditorDecoration(root){
  root.classList.remove("rhythmic-editing");root.querySelectorAll(".rhythmic-highlighted").forEach(e=>e.classList.remove("rhythmic-highlighted"));root.querySelectorAll("[data-editor-only]").forEach(e=>e.remove());
}
function selectRhythmicAtPoint(event){
  if(designTypeSelect.value!=="rhythmic"||event.detail===0)return;
  const g=art.querySelector("[data-rhythmic-geometry]"),matrix=g?.getScreenCTM();if(!matrix)return;
  const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse()),scale=Math.hypot(matrix.a,matrix.b);
  if(!scale)return;
  let best=null,nearest=Infinity;
  for(const line of rhythmicGeometry(rhythmicState,readSettings())){
    for(const points of line.paths)for(let j=1;j<points.length;j++){
      const [ax,ay]=points[j-1],[bx,by]=points[j],dx=bx-ax,dy=by-ay;
      const t=Math.max(0,Math.min(1,((point.x-ax)*dx+(point.y-ay)*dy)/(dx*dx+dy*dy||1)));
      const distance=Math.hypot(point.x-ax-t*dx,point.y-ay-t*dy);
      if(distance<=Math.max(8/scale,line.weight/2)&&distance<nearest){nearest=distance;best=line.i;}
    }
  }
  if(best!==null){closePalette(false);selectRhythmicLine(best,true);}
}
function initRhythmic(){
  preview.addEventListener("click",selectRhythmicAtPoint);
  Object.keys(rhythmicLimits).forEach(key=>document.querySelector("#rhythmic-"+key).addEventListener("input",e=>{closePalette(false);rhythmicState[key]=Number(e.target.value);render();}));
  for(const key of ["arrangement","symmetry"])document.querySelector("#rhythmic-"+key).addEventListener("change",e=>{closePalette(false);rhythmicState[key]=e.target.value;render();});
  document.querySelector("#rhythmic-prev").addEventListener("click",()=>{closePalette(false);selectRhythmicLine(activeRhythm-1);});
  document.querySelector("#rhythmic-next").addEventListener("click",()=>{closePalette(false);selectRhythmicLine(activeRhythm+1);});
  document.querySelector("#reference-rhythmic").addEventListener("click",()=>{closePalette(false);applyRhythmicCandidate(createRhythmicCandidate(true));});
}
function createRhythmicCandidate(reference=false){
  const s=referenceRhythmicState();
  if(!reference){
    s.arrangement=randomChoice(RHYTHMIC_MODES);s.count=randomInteger(10,26);s.spacing=randomInteger(16,27);s.weight=randomInteger(3,12);s.angle=randomInteger(18,58);s.fields=randomInteger(2,5);s.amplitude=randomInteger(25,95);s.frequency=randomInteger(1,4);
    s.symmetry=randomChoice(["mirrored","parallel"]);s.groups=randomChoice([2,2,3]);s.progression=randomChoice([-45,-25,0,0,25,45]);
    const family=randomChoice(BRAND_PALETTE.slice(0,4)),accent=randomChoice(BRAND_PALETTE.filter(f=>f!==family));
    s.colours=[family.values[4][1],family.values[2][1],accent.values[4][1],family.values[5][1],accent.values[2][1],family.values[0][1]];
  }
  return {type:"rhythmic",rhythmic:s,seed:reference?4821:randomInteger(1,1000000000),settings:{rotation:reference?0:randomChoice([0,0,0,90,180,270,45]),scale:100,background:reference||Math.random()<.5,overlapMode:"normal"}};
}
function evaluateRhythmicCandidate(c){
  const s=c.rhythmic,lines=rhythmicGeometry(s);
  let area=0;for(const line of lines)for(const points of line.paths)for(let j=1;j<points.length;j++)area+=line.weight*Math.hypot(points[j][0]-points[j-1][0],points[j][1]-points[j-1][1]);
  const coverage=area/360000;
  const span=(s.count-1)*s.spacing;
  return scoreDesignCandidate({palette:1,balance:1-Math.abs(span-440)/800,negativeSpace:1-Math.abs(coverage-.28)/.6,restraint:1-Math.abs(s.progression)/150,valid:span>=180&&span<=690&&coverage>=.08&&coverage<=.72});
}
function applyRhythmicCandidate(c){
  restorePatternFills();restoreRhythmicState(c.rhythmic);compositionSeed=c.seed;
  controls.rotation.value=c.settings.rotation;controls.scale.value=c.settings.scale;controls.background.checked=c.settings.background;
  controls.overlapModes.forEach(i=>i.checked=i.value==="normal");render();
}
function validRhythmicPreset(p){
  const s=p.rhythmic,t=p.settings;
  return p.version===2&&s&&t&&isIntegerBetween(p.randomSeed,1,1000000000)&&isIntegerBetween(t.rotationDegrees,0,359)&&isIntegerBetween(t.scalePercent,70,150)&&typeof t.background==="boolean"&&RHYTHMIC_MODES.includes(s.arrangement)&&["parallel","mirrored"].includes(s.symmetry)&&Object.entries(rhythmicLimits).every(([k,v])=>isIntegerBetween(s[k],...v))&&Array.isArray(s.colours)&&s.colours.length===6&&s.colours.every(isBrandColour)&&s.objects&&typeof s.objects==="object"&&!Array.isArray(s.objects)&&Object.entries(s.objects).every(([k,o])=>/^(0|[1-3]?[0-9])$/.test(k)&&o&&typeof o==="object"&&(o.colour===undefined||isBrandColour(o.colour))&&(o.visible===undefined||typeof o.visible==="boolean"));
}
