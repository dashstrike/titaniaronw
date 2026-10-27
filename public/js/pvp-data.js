(function(){
  'use strict';
  const columns=['Guild','Player','Job','Kill','Assist','Player Damage','Building Damage','Heal','Endure','Deaths','Revive','Monster','Flag Repair','Boss Kill','Boss Damage'];
  function parseCsv(text){
    const records=[];let record=[],cell='',quoted=false,closed=false;
    text=text.replace(/^\uFEFF/,'');
    for(let i=0;i<text.length;i++){
      const c=text[i];
      if(quoted){
        if(c==='"'&&text[i+1]==='"'){cell+='"';i++;}
        else if(c==='"'){quoted=false;closed=true;}
        else cell+=c;
      }else if(c==='"'){
        if(cell||closed)throw new Error('Invalid CSV quoting.');
        quoted=true;
      }else if(c===','||c==='\n'||c==='\r'){
        record.push(cell);cell='';closed=false;
        if(c!==','){
          if(c==='\r'&&text[i+1]==='\n')i++;
          if(record.some(value=>value.trim()))records.push(record);
          record=[];
        }
      }else{
        if(closed)throw new Error('Unexpected text after a quoted CSV value.');
        cell+=c;
      }
    }
    if(quoted)throw new Error('Unclosed quote in CSV.');
    record.push(cell);
    if(record.some(value=>value.trim()))records.push(record);
    if(!records.length||records[0].length!==columns.length||records[0].some((value,i)=>value.trim()!==columns[i]))throw new Error('CSV columns do not match the Guild League format.');
    const seen=new Set();
    const players=records.slice(1).map((values,index)=>{
      if(values.length!==columns.length)throw new Error(`Row ${index+2}: expected ${columns.length} columns.`);
      const row={};
      columns.forEach((key,i)=>{
        const value=values[i].trim();
        if(i<3){
          if(!value||value.length>200)throw new Error(`Row ${index+2}: invalid ${key}.`);
          row[key]=value;
        }else{
          const numeric=value.replace(/,/g,'');
          if(!/^\d+$/.test(numeric)||!Number.isSafeInteger(Number(numeric)))throw new Error(`Row ${index+2}: ${key} must be a non-negative whole number.`);
          row[key]=Number(numeric);
        }
      });
      const key=JSON.stringify([row.Guild,row.Player]);
      if(seen.has(key))throw new Error(`Duplicate player in this battlefield: ${row.Player} (${row.Guild}).`);
      seen.add(key);return row;
    });
    if(!players.length||players.length>1000)throw new Error('Import between 1 and 1,000 player rows.');
    return players;
  }
  function glSessions(date){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return [];
    const day=new Date(date+'T12:00:00Z');
    if(Number.isNaN(day.getTime())||day.toISOString().slice(0,10)!==date)return [];
    if(day.getUTCDay()===2)return [{time:'22:30',label:'Tuesday GL 1 — 22:30'},{time:'23:00',label:'Tuesday GL 2 — 23:00'}];
    if(day.getUTCDay()===4)return [{time:'23:00',label:'Thursday GL — 23:00'}];
    return [];
  }
  function sessionLabel(date,time){
    return glSessions(date).find(session=>session.time===time.slice(0,5))?.label||time.slice(0,5);
  }
  if(typeof module!=='undefined'&&module.exports){module.exports={parseCsv,columns,glSessions};return;}
  const root=document.getElementById('pvpData');
  if(!root)return;
  const el=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const theme={background:'var(--bs-secondary-bg)',color:'var(--bs-body-color)',confirmButtonColor:'var(--bs-primary)'};
  let client,user,canManage=false,battles=[],selected=null,table,busy=false,guilds=[],guildIndex=0,iconMap={};
  function jobTemplate(option){
    const row=document.createElement('span');
    row.className='d-inline-flex align-items-center';
    const file=iconMap[option.id];
    if(file){
      const image=document.createElement('img');image.src='./images/job/'+encodeURIComponent(file);image.alt='';
      image.width=24;image.height=24;image.className='me-2 flex-shrink-0';row.appendChild(image);
    }
    row.appendChild(document.createTextNode(option.text));return row;
  }
  const battleDate=el('pvpImportDate');
  const datepicker=window.flatpickr?window.flatpickr(battleDate,{dateFormat:'Y-m-d',altInput:true,altFormat:'F j, Y',disableMobile:true,enable:[date=>[2,4].includes(date.getDay())],onChange:updateSessions}):null;
  if(datepicker){
    datepicker.altInput.id='pvpImportDateDisplay';
    document.querySelector('label[for="pvpImportDate"]').htmlFor='pvpImportDateDisplay';
  }else battleDate.type='date';
  const battleTime=el('pvpImportTime');
  function updateSessions(){
    const previous=battleTime.value,sessions=glSessions(battleDate.value);
    battleTime.innerHTML=`<option value="">${!battleDate.value?'Select battle date first':sessions.length?'Select GL session':'No GL session on this date'}</option>`+sessions.map(session=>`<option value="${session.time}">${esc(session.label)}</option>`).join('');
    if(sessions.some(session=>session.time===previous))battleTime.value=previous;
    else if(sessions.length===1)battleTime.value=sessions[0].time;
  }
  battleDate.addEventListener('change',()=>{
    if(battleDate.value&&!glSessions(battleDate.value).length)battleDate.value='';
    updateSessions();
  });
  let availableDates=new Set();
  const viewDate=el('pvpViewDate');
  const viewDatepicker=window.flatpickr?window.flatpickr(viewDate,{
    dateFormat:'Y-m-d',altInput:true,altFormat:'F j, Y',disableMobile:true,enable:[],
    onChange:()=>updateViewSessions(),
    onDayCreate:(_,__,instance,day)=>{
      if(availableDates.has(instance.formatDate(day.dateObj,'Y-m-d'))){
        day.dataset.pvpBattleDate='true';
        day.setAttribute('aria-label',day.getAttribute('aria-label')+'. Battle data available');
      }
    },
  }):null;
  if(viewDatepicker){
    viewDatepicker.altInput.id='pvpViewDateDisplay';
    document.querySelector('label[for="pvpViewDate"]').htmlFor='pvpViewDateDisplay';
  }else{
    viewDate.type='date';
    viewDate.addEventListener('change',()=>{
      if(!availableDates.has(viewDate.value))viewDate.value=selected?.battle_date||'';
      updateViewSessions();
    });
  }
  function updateViewSessions(preferredTime,preferredField){
    const previous=preferredTime||el('pvpViewSession').value;
    const times=[...new Set(battles.filter(battle=>battle.battle_date===viewDate.value).map(battle=>battle.battle_time.slice(0,5)))].sort().reverse();
    el('pvpViewSession').innerHTML=times.length?times.map(time=>`<option value="${time}">${esc(sessionLabel(viewDate.value,time))}</option>`).join(''):'<option value="">No sessions available</option>';
    el('pvpViewSession').disabled=!times.length;
    el('pvpViewSession').value=times.includes(previous)?previous:times[0]||'';
    updateViewFields(preferredField);
  }
  function updateViewFields(preferredField){
    const previous=preferredField||el('pvpViewField').value;
    const fields=[...new Set(battles.filter(battle=>battle.battle_date===viewDate.value&&battle.battle_time.slice(0,5)===el('pvpViewSession').value).map(battle=>battle.battlefield))].sort();
    el('pvpViewField').innerHTML=fields.length?fields.map(field=>`<option value="${esc(field)}">${field==='main'?'Main':'Sub'} Battlefield</option>`).join(''):'<option value="">No battlefield available</option>';
    el('pvpViewField').disabled=!fields.length;
    el('pvpViewField').value=fields.includes(previous)?previous:fields[0]||'';
    selectBattle();
  }
  function notice(message,error=false){
    el('pvpStatus').hidden=!message;
    el('pvpStatus').className='alert alert-'+(error?'danger':'info');
    el('pvpStatus').textContent=message;
  }
  function options(id,values,label){
    const select=window.jQuery?.(el(id));
    if(select?.hasClass('select2-hidden-accessible'))select.select2('destroy');
    el(id).innerHTML=`<option value="">${label}</option>`+[...new Set(values)].sort((a,b)=>a.localeCompare(b)).map(value=>`<option value="${esc(value)}">${esc(value)}</option>`).join('');
    if(id==='pvpJob'&&window.jQuery?.fn.select2)select.select2({width:'100%',dropdownParent:window.jQuery('#pvpData'),templateResult:jobTemplate,templateSelection:jobTemplate});
  }
  function showTable(){
    if(table){table.destroy();table=null;}
    const rows=(selected?.players||[]).filter(row=>row.Guild===guilds[guildIndex]&&(!el('pvpJob').value||row.Job===el('pvpJob').value));
    el('pvpSummary').textContent=selected?`${selected.battle_date} · ${sessionLabel(selected.battle_date,selected.battle_time)} GMT+8 · ${selected.battlefield==='main'?'Main':'Sub'} Battlefield · ${rows.length} players`:'No battles imported yet.';
    el('pvpTable').querySelectorAll('[role="tabpanel"]').forEach(pane=>pane.replaceChildren());
    const pane=el('pvpGuildPane-'+guildIndex);
    if(!pane){el('pvpTable').textContent='No battle data available.';return;}
    const tableColumns=columns.filter(key=>key!=='Guild');
    pane.innerHTML='<table class="table table-centered table-hover align-middle text-nowrap w-100"><thead><tr>'+tableColumns.map(key=>`<th scope="col">${esc(key)}</th>`).join('')+'</tr></thead></table>';
    table=new DataTable(pane.querySelector('table'),{
      data:rows,columns:tableColumns.map((key,i)=>({data:key,render:key==='Job'?(value,type)=>{
        if(type!=='display')return value;
        const file=iconMap[value];
        return `<span class="d-inline-flex align-items-center">${file?`<img src="./images/job/${esc(encodeURIComponent(file))}" width="24" height="24" class="me-2 flex-shrink-0" alt="">`:''}${esc(value)}</span>`;
      }:i<2?DataTable.render.text():DataTable.render.number(',', '.', 0)})),
      order:[[2,'desc']],pageLength:25,scrollX:true,autoWidth:false,
    });
  }
  function selectBattle(){
    if(table){table.destroy();table=null;}
    selected=battles.find(battle=>battle.battle_date===viewDate.value&&battle.battle_time.slice(0,5)===el('pvpViewSession').value&&battle.battlefield===el('pvpViewField').value)||null;
    guilds=[...new Set((selected?.players||[]).map(row=>row.Guild))].sort((a,b)=>{
      if(a.toLowerCase()==='titania')return -1;
      if(b.toLowerCase()==='titania')return 1;
      return a.localeCompare(b);
    });
    guildIndex=0;
    el('pvpGuildTabs').innerHTML=guilds.map((guild,index)=>`<li class="nav-item" role="presentation"><button class="nav-link w-100 text-${guild.toLowerCase()==='titania'?'primary':'danger'}${index===0?' active':''}" id="pvpGuildTab-${index}" data-bs-toggle="tab" data-bs-target="#pvpGuildPane-${index}" data-guild-index="${index}" type="button" role="tab" aria-controls="pvpGuildPane-${index}" aria-selected="${index===0?'true':'false'}">${esc(guild)}</button></li>`).join('');
    el('pvpTable').innerHTML=guilds.map((guild,index)=>`<div class="tab-pane${index===0?' show active':''}" id="pvpGuildPane-${index}" role="tabpanel" aria-labelledby="pvpGuildTab-${index}" tabindex="0"></div>`).join('');
    options('pvpJob',(selected?.players||[]).filter(row=>row.Guild===guilds[guildIndex]).map(row=>row.Job),'All jobs');
    showTable();
  }
  async function load(preferred){
    const previous=preferred||selected?.id;
    const {data,error}=await client.from('pvp_battles').select('*').eq('category','guild_league').order('battle_date',{ascending:false}).order('battle_time',{ascending:false}).order('battlefield');
    if(error)throw error;
    battles=data||[];
    const target=battles.find(battle=>battle.id===previous)||battles[0];
    availableDates=new Set(battles.map(battle=>battle.battle_date));
    viewDate.disabled=!battles.length;
    if(viewDatepicker){
      viewDatepicker.altInput.disabled=!battles.length;
      viewDatepicker.set('enable',[...availableDates]);
      viewDatepicker.setDate(target?.battle_date||'',false,'Y-m-d');
      if(target)viewDatepicker.jumpToDate(target.battle_date);
    }else viewDate.value=target?.battle_date||'';
    el('pvpResults').hidden=false;
    updateViewSessions(target?.battle_time.slice(0,5),target?.battlefield);notice('');
  }
  el('pvpViewSession').addEventListener('change',()=>updateViewFields());
  el('pvpViewField').addEventListener('change',selectBattle);
  if(window.jQuery)window.jQuery(el('pvpJob')).on('change',showTable);
  else el('pvpJob').addEventListener('change',showTable);
  el('pvpGuildTabs').addEventListener('shown.bs.tab',event=>{
    const index=Number(event.target.dataset.guildIndex);
    if(!Number.isInteger(index)||!guilds[index])return;
    guildIndex=index;
    options('pvpJob',(selected?.players||[]).filter(row=>row.Guild===guilds[guildIndex]).map(row=>row.Job),'All jobs');
    showTable();
  });
  el('pvpRefresh').addEventListener('click',async()=>{
    if(busy)return;
    try{el('pvpRefresh').disabled=true;await load();}catch(error){notice(error.message,true);}finally{el('pvpRefresh').disabled=false;}
  });
  el('pvpFile').addEventListener('change',()=>{
    const match=el('pvpFile').files[0]?.name.match(/^(main|sub)(\d{2})-(\d{2})-(\d{4})\.csv$/i);
    if(match){
      el('pvpImportField').value=match[1].toLowerCase();
      const date=`${match[4]}-${match[3]}-${match[2]}`;
      if(datepicker)datepicker.setDate(date,true,'Y-m-d');
      else{battleDate.value=date;updateSessions();}
    }
  });
  el('pvpImportForm').addEventListener('submit',async event=>{
    event.preventDefault();if(busy||!canManage)return;
    busy=true;el('pvpImportFields').disabled=true;
    try{
      const file=el('pvpFile').files[0];
      if(!file||file.size>5*1024*1024)throw new Error('Choose a CSV file smaller than 5 MB.');
      const players=parseCsv(await file.text());
      const date=el('pvpImportDate').value,time=battleTime.value,field=el('pvpImportField').value;
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('Choose a valid battle date.');
      if(!glSessions(date).some(session=>session.time===time))throw new Error('Choose a valid GL session for the selected date.');
      // Recheck the database immediately before asking about replacement.
      await load();
      const existing=battles.find(battle=>battle.battle_date===date&&battle.battle_time.slice(0,5)===time&&battle.battlefield===field);
      const confirmation=await Swal.fire({...theme,icon:existing?'warning':'question',title:existing?'Replace existing battle?':'Import battle?',text:`${date} · ${time} GMT+8 · ${field==='main'?'Main':'Sub'} Battlefield · ${players.length} players · ${[...new Set(players.map(row=>row.Guild))].join(', ')}.${existing?' This replaces the saved statistics for this date, time and battlefield.':''}`,showCancelButton:true,confirmButtonText:existing?'Replace':'Import'});
      if(!confirmation.isConfirmed)return;
      const payload={category:'guild_league',battle_date:date,battle_time:time,battlefield:field,source_file:file.name,players,imported_by:user.id,imported_at:new Date().toISOString()};
      // Insert does not overwrite a concurrent import. Replacements require the
      // same imported_at value the admin reviewed, preventing a lost update.
      const request=existing?client.from('pvp_battles').update(payload).eq('id',existing.id).eq('imported_at',existing.imported_at):client.from('pvp_battles').insert(payload);
      const {data,error}=await request.select('id').single();
      if(error)throw new Error(error.code==='23505'?'This battle was just imported by someone else. Refresh and try again.':error.code==='PGRST116'?'This battle changed. Refresh and review it before replacing.':error.message);
      await load(data.id);el('pvpFile').value='';
      await Swal.fire({...theme,icon:'success',title:'Battle saved',text:`${players.length} player rows imported.`,timer:2000});
    }catch(error){await Swal.fire({...theme,icon:'error',title:'Import failed',text:error.message});}
    finally{busy=false;el('pvpImportFields').disabled=!canManage;}
  });
  (async()=>{
    try{
      const cfg=window.TITANIA_CONFIG||{};
      if(!window.supabase||!cfg.supabaseUrl||!cfg.supabasePublishableKey)throw new Error('Database connection is unavailable.');
      client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
      const auth=await client.auth.getUser();user=auth.data?.user;
      if(auth.error||!user)throw new Error('Sign in to Titania first to view PVP data.');
      const profile=await client.from('profiles').select('role,approved').eq('id',user.id).single();
      if(profile.error||!profile.data?.approved)throw new Error('Approved Titania access is required.');
      canManage=profile.data.role==='admin';
      iconMap=await fetch('./images/job/job-icons.json').then(response=>response.ok?response.json():{}).catch(()=>({}));
      el('pvpImportPanel').hidden=!canManage;el('pvpImportFields').disabled=!canManage;
      await load();
    }catch(error){notice(error.message,true);}
  })();
})();
