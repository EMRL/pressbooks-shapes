// All triangles share one right-triangle aspect ratio. Reflections change
// orientation without distorting the shape, and scale never exceeds its cell.
const TRIANGLE_ARRANGEMENTS = ["uniform","rows","columns","checkerboard","pinwheel","mirrored"];
const TRIANGLE_ORIENTATIONS = ["bottom-right","bottom-left","top-left","top-right"];
const triangleKeys = ["columns","rows","ratio","size","gap-x","gap-y"];
const triangleLimits = [[2,12],[2,12],[50,200],[10,100],[0,40],[0,40]];
let triangleState = referenceTriangleState();
let activeTriangle = {row:0,col:0};

function referenceTriangleState() {
  return {
    arrangement:"uniform",orientation:"bottom-right",anchor:"corner",columns:3,rows:3,ratio:100,size:100,"gap-x":0,"gap-y":0,
    defaultColour:"#a7a8a9",cells:{"1:2":{colour:"#5da3b2",visible:true,size:100},"2:1":{colour:"#f4af23",visible:true,size:100},"2:2":{colour:"#bb2026",visible:true,size:100}}
  };
}
function triangleClone(){return JSON.parse(JSON.stringify(triangleState));}
function restoreTriangleState(state){triangleState=JSON.parse(JSON.stringify(state));activeTriangle={row:0,col:0};}
function triangleKey(row,col){return row+":"+col;}
function triangleCell(state,row,col){
  const override=state.cells[triangleKey(row,col)];
  return {colour:override?.colour||state.defaultColour,visible:override?.visible!==false,size:override?.size??100};
}
function triangleOverride(key){return triangleState.cells[key] ||= {colour:null,visible:true,size:100};}
function triangleColour(key){
  if(key==="default")return triangleState.defaultColour;
  const [row,col]=key.split(":").map(Number);
  return triangleCell(triangleState,row,col).colour;
}
function setTriangleColour(key,colour){
  if(key==="default")triangleState.defaultColour=colour;
  else{const cell=triangleOverride(key);cell.colour=colour;cell.visible=true;}
}
function trianglePaletteState(key){
  const cell=triangleState.cells[key];
  return {empty:cell?.visible===false,reset:!cell};
}
function trianglePaletteTrigger(key){return document.querySelector('[data-triangle-colour="'+key+'"]');}
function resetTriangle(key){delete triangleState.cells[key];patternFills.delete("triangular:"+key);}

function triangleOrientation(state,row,col){
  const base=TRIANGLE_ORIENTATIONS.indexOf(state.orientation);
  let turn=0;
  switch(state.arrangement){
    case "rows":turn=(row%2)*2;break;
    case "columns":turn=(col%2)*2;break;
    case "checkerboard":turn=((row+col)%2)*2;break;
    case "pinwheel":turn=[[0,1],[3,2]][row%2][col%2];break;
    case "mirrored":{
      const horizontal=col>(state.columns-1)/2,vertical=row>(state.rows-1)/2;
      let corner=base;
      if(horizontal)corner=[1,0,3,2][corner];
      if(vertical)corner=[3,2,1,0][corner];
      return TRIANGLE_ORIENTATIONS[corner];
    }
  }
  return TRIANGLE_ORIENTATIONS[(base+turn)%4];
}
function triangleGeometry(state,row,col){
  const ratio=state.ratio/100;
  const height=Math.min((600-(state.rows-1)*state["gap-y"])/state.rows,(600-(state.columns-1)*state["gap-x"])/(state.columns*ratio));
  const width=height*ratio;
  const totalW=width*state.columns+state["gap-x"]*(state.columns-1);
  const totalH=height*state.rows+state["gap-y"]*(state.rows-1);
  const x=(600-totalW)/2+col*(width+state["gap-x"]);
  const y=(600-totalH)/2+row*(height+state["gap-y"]);
  const orientation=triangleOrientation(state,row,col);
  const right=orientation.endsWith("right"),bottom=orientation.startsWith("bottom");
  const cell=triangleCell(state,row,col);
  const scale=state.size/100*cell.size/100;
  const w=width*scale,h=height*scale;
  const left=state.anchor==="centre"?x+(width-w)/2:right?x+width-w:x;
  const top=state.anchor==="centre"?y+(height-h)/2:bottom?y+height-h:y;
  const cx=right?left+w:left,cy=bottom?top+h:top;
  const points=[[cx,cy],[right?left:left+w,cy],[cx,bottom?top:top+h]];
  return {row,col,orientation,colour:cell.colour,visible:cell.visible,points,left,top,w,h,right,bottom};
}

function renderTriangular(settings){
  const state=triangleState;
  art.replaceChildren();art.removeAttribute("transform");art.style.isolation="isolate";
  if(settings.background){
    const white=document.createElementNS(SVG_NS,"rect");
    white.setAttribute("width","600");white.setAttribute("height","600");white.setAttribute("fill","#ffffff");art.append(white);
  }
  const geometry=document.createElementNS(SVG_NS,"g");
  geometry.setAttribute("transform","translate(300 300) rotate("+settings.rotation+") scale("+settings.scale+") translate(-300 -300)");
  let count=0;
  for(let row=0;row<state.rows;row++)for(let col=0;col<state.columns;col++){
    const triangle=triangleGeometry(state,row,col);
    if(!triangle.visible)continue;
    count++;
    const shape=document.createElementNS(SVG_NS,"polygon");
    shape.setAttribute("points",triangle.points.map(point=>point.join(",")).join(" "));
    shape.setAttribute("fill",svgPatternFill("triangular:"+triangleKey(row,col),triangle.colour,{x:triangle.left,y:triangle.top,rotation:90*TRIANGLE_ORIENTATIONS.indexOf(triangle.orientation)}));
    shape.setAttribute("role","button");shape.setAttribute("tabindex","0");
    shape.setAttribute("aria-label","Triangle row "+(row+1)+", column "+(col+1));
    const select=()=>selectTriangle(row,col,true);
    shape.addEventListener("click",select);
    shape.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();select();}});
    geometry.append(shape);
  }
  art.append(geometry);
  stage.classList.toggle("has-background",settings.background);
  document.querySelector("#shape-count").textContent=state.rows+" × "+state.columns+" grid";
  document.querySelector("#variation-readout").textContent=count+" visible triangles";
  document.querySelector("#shape-desc").textContent=count+" proportional right triangles arranged in a "+state.rows+" by "+state.columns+" grid.";
  for(const key of ["arrangement","orientation","anchor"])document.querySelector("#triangle-"+key).value=state[key];
  triangleKeys.forEach(key=>{
    document.querySelector("#triangle-"+key).value=state[key];
    document.querySelector("#triangle-"+key+"-output").value=state[key]+(["ratio","size"].includes(key)?"%":key.startsWith("gap")?" px":"");
  });
  outputs.scale.value=Math.round(settings.scale*100)+"%";outputs.rotation.value=settings.rotation+"°";
  renderTriangleEditor();refreshRangeInputs();
}
function selectTriangle(row,col,openColour){
  closePalette(false);activeTriangle={row,col};
  activateEditorTab(document.querySelector("#triangle-editor-tab"),false);
  render();
  const key=triangleKey(row,col),trigger=trianglePaletteTrigger(key);
  if(trigger&&openColour)openPalette(trigger,"triangular",key);
}
function renderTriangleEditor(){
  const state=triangleState;
  activeTriangle.row=Math.min(activeTriangle.row,state.rows-1);activeTriangle.col=Math.min(activeTriangle.col,state.columns-1);
  const defaultList=document.querySelector("#triangle-default-list");
  defaultList.replaceChildren();
  const defaultButton=document.createElement("button");defaultButton.type="button";defaultButton.className="color-trigger";
  defaultButton.dataset.triangleColour="default";defaultButton.setAttribute("aria-haspopup","dialog");defaultButton.setAttribute("aria-expanded","false");defaultButton.setAttribute("aria-controls","palette-popover");
  const swatch=document.createElement("span");swatch.className="color-swatch";defaultButton.append(swatch);
  updateColourTrigger(defaultButton,state.defaultColour,"Default triangle colour");
  paintFillSwatch(defaultButton,"triangular:default");
  defaultButton.addEventListener("click",()=>openPalette(defaultButton,"triangular","default"));
  const defaultRow=document.createElement("div");defaultRow.className="control-label";
  const strong=document.createElement("strong");strong.textContent="Default triangle colour";defaultRow.append(strong,defaultButton);defaultList.append(defaultRow);

  const grid=document.querySelector("#triangle-grid");grid.replaceChildren();grid.style.setProperty("--modular-columns",state.columns);
  const header=document.createElement("div");header.className="segment-grid-row";header.append(document.createElement("span"));
  for(let col=0;col<state.columns;col++){const label=document.createElement("span");label.className="segment-column-label";label.textContent=col+1;header.append(label);}
  grid.append(header);
  for(let row=0;row<state.rows;row++){
    const line=document.createElement("div");line.className="segment-grid-row";
    const label=document.createElement("span");label.className="segment-grid-label";label.textContent=row+1;line.append(label);
    for(let col=0;col<state.columns;col++){
      const cell=triangleCell(state,row,col);
      const orientation=triangleOrientation(state,row,col);
      const right=orientation.endsWith("right"),bottom=orientation.startsWith("bottom");
      const x=right?"100%":"0%",y=bottom?"100%":"0%";
      const button=document.createElement("button");button.type="button";
      const selected=row===activeTriangle.row&&col===activeTriangle.col;
      button.className="segment-cell"+(!cell.visible?" is-empty":"")+(selected?" is-selected":"");
      button.style.setProperty("--cell-color",cell.colour);
      button.style.setProperty("--triangle-clip","polygon("+x+" "+y+", "+(right?"0%":"100%")+" "+y+", "+x+" "+(bottom?"0%":"100%")+")");
      button.style.setProperty("--triangle-scale",state.size*cell.size/10000);
      button.style.setProperty("--triangle-origin",state.anchor==="centre"?"center":x+" "+y);
      button.textContent=cell.visible?"":"∅";
      button.dataset.triangleColour=triangleKey(row,col);
      button.setAttribute("aria-label","Row "+(row+1)+", column "+(col+1)+", "+(cell.visible?paletteLabel(cell.colour):"empty"));
      paintFillSwatch(button,"triangular:"+triangleKey(row,col));
      button.setAttribute("aria-pressed",String(selected));button.setAttribute("aria-haspopup","dialog");button.setAttribute("aria-expanded","false");button.setAttribute("aria-controls","palette-popover");
      button.addEventListener("click",()=>selectTriangle(row,col,true));line.append(button);
    }
    grid.append(line);
  }
  const cell=triangleCell(state,activeTriangle.row,activeTriangle.col);
  document.querySelector("#triangle-selected-cell").textContent="Row "+(activeTriangle.row+1)+" · Column "+(activeTriangle.col+1);
  document.querySelector("#triangle-object-title").textContent="Triangle "+(activeTriangle.row*state.columns+activeTriangle.col+1);
  document.querySelector("#triangle-object-size").value=cell.size;
  document.querySelector("#triangle-object-size-output").value=cell.size+"%";
  document.querySelector("#reset-triangle").disabled=!state.cells[triangleKey(activeTriangle.row,activeTriangle.col)]&&!patternFills.has("triangular:"+triangleKey(activeTriangle.row,activeTriangle.col));
}

function initTriangular(){
  triangleKeys.forEach(key=>document.querySelector("#triangle-"+key).addEventListener("input",event=>{closePalette(false);triangleState[key]=Number(event.target.value);render();}));
  for(const key of ["arrangement","orientation","anchor"])document.querySelector("#triangle-"+key).addEventListener("change",event=>{triangleState[key]=event.target.value;render();});
  document.querySelector("#triangle-object-size").addEventListener("input",event=>{triangleOverride(triangleKey(activeTriangle.row,activeTriangle.col)).size=Number(event.target.value);render();});
  document.querySelector("#reset-triangle").addEventListener("click",()=>{closePalette(false);resetTriangle(triangleKey(activeTriangle.row,activeTriangle.col));render();});
  document.querySelector("#reference-triangular").addEventListener("click",()=>{closePalette(false);applyTriangularCandidate(createTriangularCandidate(true));});
}
function createTriangularCandidate(reference=false){
  const state=referenceTriangleState();
  if(!reference){
    state.columns=randomInteger(3,8);state.rows=randomInteger(3,8);
    state.arrangement=randomChoice(TRIANGLE_ARRANGEMENTS);
    state.orientation=randomChoice(TRIANGLE_ORIENTATIONS);
    state.anchor=randomChoice(["corner","corner","centre"]);
    state.ratio=randomChoice([75,100,100,100,125,150]);
    state.size=randomChoice([75,85,95,100,100,100]);
    state["gap-x"]=state["gap-y"]=randomChoice([0,0,0,4,8]);
    state.defaultColour=randomChoice(["#a7a8a9","#cacbcb","#5da3b2","#99dbcb","#bb2026","#dfedf0","#f4af23"]);
    state.cells={};
    const strategy=randomChoice(["diagonal","diagonal","cluster","graduated"]);
    const palette=shuffled(BRAND_100_COLOURS.filter(colour=>colour.toUpperCase()!==state.defaultColour.toUpperCase()));
    const reverse=randomChoice([true,false]);
    const threshold=state.rows+state.columns-4;
    for(let row=0;row<state.rows;row++)for(let col=0;col<state.columns;col++){
      const rr=reverse?state.rows-1-row:row,cc=reverse?state.columns-1-col:col;
      const diagonal=rr+cc;
      let colour=null,size=100,visible=true;
      if(strategy==="diagonal"&&diagonal>=threshold)colour=palette[Math.min(2,diagonal-threshold)];
      if(strategy==="cluster"&&rr>=state.rows-2&&cc>=state.columns-2)colour=palette[Math.min(2,(rr+cc)%3)];
      if(strategy==="graduated"){
        size=Math.round(55+45*diagonal/(state.rows+state.columns-2));
        if(diagonal>=threshold)colour=palette[0];
      }
      if(diagonal<=1&&Math.random()<.35)visible=false;
      if(colour||size!==100||!visible)state.cells[triangleKey(row,col)]={colour,visible,size};
    }
  }
  return {type:"triangular",triangular:state,settings:{rotation:reference?0:randomChoice([0,0,0,90,180,270]),scale:reference?100:randomChoice([100,100,105,110]),background:reference||Math.random()<.5},seed:reference?4821:randomInteger(1,1000000000)};
}
function applyTriangularCandidate(candidate){
  restorePatternFills(candidate.patterns);
  restoreTriangleState(candidate.triangular);controls.rotation.value=candidate.settings.rotation;controls.scale.value=candidate.settings.scale;controls.background.checked=candidate.settings.background;compositionSeed=candidate.seed;render();
}
function validTriangularPreset(payload){
  const state=payload.triangular,settings=payload.settings,integer=isIntegerBetween;
  return payload.version===2&&state&&settings&&integer(payload.randomSeed,1,1000000000)
    &&integer(settings.rotationDegrees,0,359)&&integer(settings.scalePercent,70,150)&&typeof settings.background==="boolean"
    &&TRIANGLE_ARRANGEMENTS.includes(state.arrangement)&&TRIANGLE_ORIENTATIONS.includes(state.orientation)&&["corner","centre"].includes(state.anchor)
    &&triangleKeys.every((key,index)=>integer(state[key],...triangleLimits[index]))&&isBrandColour(state.defaultColour)
    &&state.cells&&typeof state.cells==="object"&&!Array.isArray(state.cells)
    &&Object.entries(state.cells).every(([key,cell])=>/^(?:[0-9]|1[01]):(?:[0-9]|1[01])$/.test(key)&&cell
      &&(cell.colour===null||isBrandColour(cell.colour))&&typeof cell.visible==="boolean"&&integer(cell.size,10,100));
}
function evaluateTriangularCandidate(candidate){
  const state=candidate.triangular;
  const shapes=[];
  for(let row=0;row<state.rows;row++)for(let col=0;col<state.columns;col++){
    const shape=triangleGeometry(state,row,col);if(shape.visible)shapes.push(shape);
  }
  const grid=32,angle=-candidate.settings.rotation*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle),scale=candidate.settings.scale/100;
  let painted=0,accent=0,sx=0,sy=0;
  for(let row=0;row<grid;row++)for(let col=0;col<grid;col++){
    const dx=(col+.5)*600/grid-300,dy=(row+.5)*600/grid-300;
    const x=300+(dx*cos-dy*sin)/scale,y=300+(dx*sin+dy*cos)/scale;
    const hit=shapes.find(t=>{
      const u=(x-t.left)/t.w,v=(y-t.top)/t.h;
      return u>=0&&u<=1&&v>=0&&v<=1&&(t.right?1-u:u)+(t.bottom?1-v:v)<=1;
    });
    if(hit){painted++;sx+=dx;sy+=dy;if(hit.colour.toUpperCase()!==state.defaultColour.toUpperCase())accent++;}
  }
  const coverage=painted/(grid*grid),accentShare=accent/Math.max(1,painted);
  const displacement=painted?Math.hypot(sx/painted,sy/painted)/300:1;
  const fillShare=shapes.length/(state.rows*state.columns);
  return scoreDesignCandidate({
    palette:clamp01(1-Math.abs(accentShare-.15)/.6),
    balance:clamp01(1-displacement/.35),
    negativeSpace:clamp01(1-Math.abs(coverage-.4)/.4),
    restraint:clamp01(fillShare),
    valid:coverage>=.12&&coverage<=.65&&accent>0&&accentShare<=.45&&fillShare>=.5
  });
}
