(function(){
  'use strict';

  const definitions=Array.isArray(window.TITANIA_MAP_DEFINITIONS)?window.TITANIA_MAP_DEFINITIONS:[];
  const canvas=document.getElementById('mapCanvas');
  if(!canvas||!definitions.length)return;

  const ctx=canvas.getContext('2d');
  const empty=document.getElementById('mapEmpty');
  const status=document.getElementById('mapSaveStatus');
  const saveButton=document.getElementById('mapSave');
  const duplicateButton=document.getElementById('mapDuplicate');
  const deleteButton=document.getElementById('mapDelete');
  const sizeInput=document.getElementById('mapSize');
  const rotationInput=document.getElementById('mapRotation');
  const sizeValue=document.getElementById('mapSizeValue');
  const rotationValue=document.getElementById('mapRotationValue');
  const backgroundInput=document.getElementById('mapBackgroundInput');
  const iconInput=document.getElementById('mapIconInput');
  const labelInput=document.getElementById('mapLabelInput');
  const addLabelButton=document.getElementById('mapAddLabel');
  const imageCache=new Map();
  const states=new Map(definitions.map(map=>[map.key,{background:typeof map.background==='string'?map.background:'',items:[],revision:0,dirty:false}]));
  let activeKey=definitions[0].key;
  let selectedId='';
  let drag=null;
  let client=null;
  let user=null;
  let canEdit=false;

  const active=()=>states.get(activeKey);
  const selected=()=>active().items.find(item=>item.id===selectedId)||null;
  const id=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
  const toast=(title,message,error)=>window.TitaniaToast?window.TitaniaToast(title,message,Boolean(error)):console[error?'error':'log'](title,message);

  function loadImage(src){
    if(!src)return Promise.resolve(null);
    if(imageCache.has(src))return imageCache.get(src);
    const promise=new Promise(resolve=>{
      const image=new Image();
      image.onload=()=>resolve(image);
      image.onerror=()=>resolve(null);
      image.src=src;
    });
    imageCache.set(src,promise);
    promise.then(render);
    return promise;
  }

  function drawItem(item,image,withSelection){
    ctx.save();
    ctx.translate(item.x,item.y);
    ctx.rotate((item.rotation||0)*Math.PI/180);
    if(item.type==='text'){
      ctx.font=`700 ${item.size}px Play, sans-serif`;
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      ctx.lineWidth=Math.max(3,item.size*.1);
      ctx.strokeStyle='rgba(0,0,0,.85)';
      ctx.fillStyle=item.color||'#ffffff';
      ctx.strokeText(item.text,0,0);
      ctx.fillText(item.text,0,0);
    }else if(image){
      const ratio=image.naturalWidth/image.naturalHeight||1;
      const width=item.size;
      const height=item.size/ratio;
      ctx.drawImage(image,-width/2,-height/2,width,height);
    }
    if(withSelection&&item.id===selectedId){
      const bounds=itemBounds(item,image);
      ctx.strokeStyle='#7c5cff';
      ctx.lineWidth=4;
      ctx.setLineDash([10,7]);
      ctx.strokeRect(-bounds.width/2,-bounds.height/2,bounds.width,bounds.height);
    }
    ctx.restore();
  }

  function itemBounds(item,image){
    if(item.type==='text'){
      ctx.save();
      ctx.font=`700 ${item.size}px Play, sans-serif`;
      const width=Math.max(item.size,ctx.measureText(item.text).width+20);
      ctx.restore();
      return {width,height:item.size*1.35};
    }
    const ratio=image&&image.naturalHeight?image.naturalWidth/image.naturalHeight:1;
    return {width:item.size,height:item.size/ratio};
  }

  async function render(withSelection=true){
    const state=active();
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#111820';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    const background=await loadImage(state.background);
    if(background)ctx.drawImage(background,0,0,canvas.width,canvas.height);
    empty.hidden=Boolean(state.background);
    const images=await Promise.all(state.items.map(item=>item.type==='image'?loadImage(item.src):Promise.resolve(null)));
    state.items.forEach((item,index)=>drawItem(item,images[index],withSelection));
    canvas.classList.toggle('has-selection',Boolean(selected()));
  }

  function setStatus(message){status.textContent=message;}
  function markDirty(){
    active().dirty=true;
    saveButton.disabled=!canEdit;
    setStatus('Unsaved changes');
  }

  function syncSelection(){
    const item=selected();
    duplicateButton.disabled=!canEdit||!item;
    deleteButton.disabled=!canEdit||!item;
    sizeInput.disabled=!canEdit||!item;
    rotationInput.disabled=!canEdit||!item;
    if(item){
      sizeInput.value=Math.round(item.size);
      rotationInput.value=Math.round(item.rotation||0);
      sizeValue.textContent=`${Math.round(item.size)} px`;
      rotationValue.textContent=`${Math.round(item.rotation||0)}°`;
    }else{
      sizeValue.textContent='—';
      rotationValue.textContent='—';
    }
    render();
  }

  function setEditable(editable){
    canEdit=editable;
    [backgroundInput,iconInput,labelInput,addLabelButton].forEach(control=>control.disabled=!editable);
    saveButton.disabled=!editable||!active().dirty;
    syncSelection();
  }

  function switchMap(key){
    if(!states.has(key))return;
    activeKey=key;
    selectedId='';
    document.querySelectorAll('[data-map-key]').forEach(button=>button.classList.toggle('active',button.dataset.mapKey===key));
    setStatus(active().dirty?'Unsaved changes':'Saved');
    saveButton.disabled=!canEdit||!active().dirty;
    syncSelection();
  }

  function point(event){
    const rect=canvas.getBoundingClientRect();
    return {x:(event.clientX-rect.left)*canvas.width/rect.width,y:(event.clientY-rect.top)*canvas.height/rect.height};
  }

  async function hitTest(position){
    const items=active().items;
    for(let index=items.length-1;index>=0;index--){
      const item=items[index];
      const image=item.type==='image'?await loadImage(item.src):null;
      const angle=-(item.rotation||0)*Math.PI/180;
      const dx=position.x-item.x,dy=position.y-item.y;
      const localX=dx*Math.cos(angle)-dy*Math.sin(angle);
      const localY=dx*Math.sin(angle)+dy*Math.cos(angle);
      const bounds=itemBounds(item,image);
      if(Math.abs(localX)<=bounds.width/2&&Math.abs(localY)<=bounds.height/2)return item;
    }
    return null;
  }

  canvas.addEventListener('pointerdown',async event=>{
    if(!canEdit)return;
    const position=point(event);
    const item=await hitTest(position);
    selectedId=item?item.id:'';
    drag=item?{pointerId:event.pointerId,dx:position.x-item.x,dy:position.y-item.y}:null;
    if(item)canvas.setPointerCapture(event.pointerId);
    syncSelection();
  });
  canvas.addEventListener('pointermove',event=>{
    if(!drag||drag.pointerId!==event.pointerId)return;
    const item=selected();
    if(!item)return;
    const position=point(event);
    item.x=Math.max(0,Math.min(canvas.width,position.x-drag.dx));
    item.y=Math.max(0,Math.min(canvas.height,position.y-drag.dy));
    markDirty();
    render();
  });
  const finishDrag=event=>{if(drag&&drag.pointerId===event.pointerId)drag=null;};
  canvas.addEventListener('pointerup',finishDrag);
  canvas.addEventListener('pointercancel',finishDrag);

  function fileToDataUrl(file,maxDimension){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=()=>reject(new Error('Could not read image.'));
      reader.onload=()=>{
        const image=new Image();
        image.onerror=()=>reject(new Error('Invalid image file.'));
        image.onload=()=>{
          const scale=Math.min(1,maxDimension/Math.max(image.naturalWidth,image.naturalHeight));
          const output=document.createElement('canvas');
          output.width=Math.round(image.naturalWidth*scale);
          output.height=Math.round(image.naturalHeight*scale);
          output.getContext('2d').drawImage(image,0,0,output.width,output.height);
          resolve(output.toDataURL('image/webp',.9));
        };
        image.src=reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  backgroundInput.addEventListener('change',async()=>{
    const file=backgroundInput.files[0];
    backgroundInput.value='';
    if(!file)return;
    if(file.size>6*1024*1024){toast('Map too large','Use an image smaller than 6 MB.',true);return;}
    try{active().background=await fileToDataUrl(file,1024);markDirty();render();}
    catch(error){toast('Map upload failed',error.message,true);}
  });

  async function addIconFile(file,position){
    if(!file.type.startsWith('image/'))return;
    if(file.size>2*1024*1024){toast('Icon skipped',`${file.name} is larger than 2 MB.`,true);return;}
    try{
      const src=await fileToDataUrl(file,384);
      const offset=(active().items.length%6)*18;
      const item={id:id(),type:'image',src,x:position?position.x:512+offset,y:position?position.y:512+offset,size:110,rotation:0};
      active().items.push(item);selectedId=item.id;markDirty();
    }catch(error){toast('Icon upload failed',error.message,true);}
  }

  iconInput.addEventListener('change',async()=>{
    const files=Array.from(iconInput.files);
    iconInput.value='';
    for(const file of files)await addIconFile(file);
    syncSelection();
  });
  canvas.addEventListener('dragover',event=>{if(canEdit&&Array.from(event.dataTransfer.types).includes('Files'))event.preventDefault();});
  canvas.addEventListener('drop',async event=>{
    if(!canEdit)return;
    event.preventDefault();
    const position=point(event);
    for(const file of Array.from(event.dataTransfer.files))await addIconFile(file,position);
    syncSelection();
  });

  function addLabel(){
    const text=labelInput.value.trim();
    if(!text||!canEdit)return;
    const item={id:id(),type:'text',text,x:512,y:512,size:54,rotation:0,color:'#ffffff'};
    active().items.push(item);selectedId=item.id;labelInput.value='';markDirty();syncSelection();
  }
  addLabelButton.addEventListener('click',addLabel);
  labelInput.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();addLabel();}});

  function removeSelected(){
    if(!selectedId||!canEdit)return;
    active().items=active().items.filter(item=>item.id!==selectedId);selectedId='';markDirty();syncSelection();
  }
  deleteButton.addEventListener('click',removeSelected);
  duplicateButton.addEventListener('click',()=>{
    const item=selected();if(!item||!canEdit)return;
    const copy={...item,id:id(),x:Math.min(1000,item.x+30),y:Math.min(1000,item.y+30)};
    active().items.push(copy);selectedId=copy.id;markDirty();syncSelection();
  });
  sizeInput.addEventListener('input',()=>{const item=selected();if(item){item.size=Number(sizeInput.value);sizeValue.textContent=`${Math.round(item.size)} px`;markDirty();render();}});
  rotationInput.addEventListener('input',()=>{const item=selected();if(item){item.rotation=Number(rotationInput.value);rotationValue.textContent=`${Math.round(item.rotation)}°`;markDirty();render();}});

  document.addEventListener('keydown',event=>{
    if(!canEdit||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName))return;
    if((event.key==='Delete'||event.key==='Backspace')&&selected()){event.preventDefault();removeSelected();return;}
    const item=selected();if(!item||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;
    event.preventDefault();const amount=event.shiftKey?10:1;
    if(event.key==='ArrowUp')item.y-=amount;if(event.key==='ArrowDown')item.y+=amount;
    if(event.key==='ArrowLeft')item.x-=amount;if(event.key==='ArrowRight')item.x+=amount;
    markDirty();render();
  });

  document.querySelectorAll('[data-map-key]').forEach(button=>button.addEventListener('click',()=>switchMap(button.dataset.mapKey)));

  saveButton.addEventListener('click',async()=>{
    if(!client||!user||!canEdit)return;
    saveButton.disabled=true;setStatus('Saving...');
    const state=active();
    const layout={version:1,background:state.background,items:state.items};
    const {data,error}=await client.from('interactive_maps').update({layout,revision:state.revision+1,updated_at:new Date().toISOString(),updated_by:user.id}).eq('map_key',activeKey).select('revision').single();
    if(error){saveButton.disabled=false;setStatus('Save failed');toast('Map save failed',error.message,true);return;}
    state.revision=Number(data.revision)||state.revision+1;state.dirty=false;setStatus('Saved');toast('Map saved','The current layout is now available to the guild.');
  });

  document.getElementById('mapExport').addEventListener('click',async()=>{
    await render(false);
    canvas.toBlob(blob=>{
      if(!blob)return;
      const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`${activeKey}.png`;link.click();URL.revokeObjectURL(link.href);render();
    },'image/png');
  });

  window.addEventListener('beforeunload',event=>{if(Array.from(states.values()).some(state=>state.dirty)){event.preventDefault();event.returnValue='';}});

  async function boot(){
    const config=window.TITANIA_CONFIG||{};
    if(!window.supabase||!config.supabaseUrl||!config.supabasePublishableKey){setStatus('Supabase configuration missing');return;}
    client=window.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    const auth=await client.auth.getUser();
    if(auth.error||!auth.data.user){setStatus('Sign in required');return;}
    user=auth.data.user;
    const [{data:profile,error:profileError},{data:rows,error:mapsError}]=await Promise.all([
      client.from('profiles').select('role,approved').eq('id',user.id).single(),
      client.from('interactive_maps').select('map_key,layout,revision').in('map_key',definitions.map(map=>map.key))
    ]);
    if(profileError||!profile||!profile.approved){setStatus('Approved Titania access required');return;}
    if(mapsError){setStatus('Could not load maps');toast('Map load failed',mapsError.message,true);return;}
    (rows||[]).forEach(row=>{
      if(!states.has(row.map_key))return;
      const layout=row.layout&&typeof row.layout==='object'?row.layout:{};
      states.set(row.map_key,{background:typeof layout.background==='string'&&layout.background?layout.background:states.get(row.map_key).background,items:Array.isArray(layout.items)?layout.items:[],revision:Number(row.revision)||0,dirty:false});
    });
    setEditable(['party_organizer','admin'].includes(profile.role));
    setStatus(canEdit?'Saved':'View only');
    render();
  }

  render();
  boot();
})();
