(function(){
  'use strict';
  const endpoint='https://titania-attendance.dashstrike.workers.dev/member-discord';
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  window.TitaniaMemberDiscord=async function(client,memberId){
    const wrap=document.getElementById('memberDiscordContent');if(!wrap)return;
    let account=null,busy=false;
    const dialog={background:'var(--bs-secondary-bg)',color:'var(--bs-body-color)',confirmButtonColor:'var(--bs-primary)'};
    async function request(action,extra={}){
      const session=await client.auth.getSession();
      if(session.error||!session.data?.session?.access_token)throw new Error('Sign in to Titania again.');
      const response=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+session.data.session.access_token,'Content-Type':'application/json'},body:JSON.stringify({memberId,action,...extra}),signal:AbortSignal.timeout(15000)});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'Discord request failed.');return result;
    }
    async function load(){
      if(busy)return;busy=true;
      try{account=await request('read');render();}
      catch(error){wrap.innerHTML='<p class="text-muted">'+esc(error.message)+'</p><button type="button" class="btn btn-outline-secondary btn-sm" id="discordRetry">Retry</button>';wrap.querySelector('#discordRetry').onclick=load;}
      finally{busy=false;}
    }
    function render(){
      const linked=account.linked,id=account.userId,profile=account.profile;
      const rows=linked?[
        ['Discord username',profile?.username||'Unavailable'],['Server nickname',profile?.nickname||'Not set'],
        ['Linked date',account.linkedAt?new Date(account.linkedAt).toLocaleString('en-GB',{timeZone:'Asia/Kuala_Lumpur'})+' GMT+8':'Unavailable'],['Link method',account.method]
      ]:[];
      wrap.innerHTML='<div class="d-flex flex-wrap align-items-center gap-3 mb-3">'+(linked&&profile?.avatarUrl?'<img src="'+esc(profile.avatarUrl)+'" alt="Discord avatar" width="64" height="64" class="rounded-circle">':'')+'<span class="badge '+(linked?'bg-success':'bg-secondary')+'">'+(linked?'Linked':'Not linked')+'</span></div>'+
        (linked?'<div class="info-list">'+rows.map(([label,value])=>'<div class="info-row"><div class="info-key">'+esc(label)+'</div><div class="info-value">'+esc(value)+'</div></div>').join('')+'</div>':'<p class="text-muted">No Discord account is linked to this character.</p>')+
        (linked&&!profile?'<p class="text-muted">Discord profile is temporarily unavailable, or the account has left the server. The attendance link is retained.</p>':'')+
        '<div class="d-flex flex-wrap gap-2 mt-3">'+(linked?'<a class="btn btn-outline-primary btn-sm" href="https://discord.com/users/'+esc(id)+'" target="_blank" rel="noopener noreferrer">Open Discord Profile</a><button type="button" class="btn btn-outline-secondary btn-sm" id="discordCopyId">Copy ID</button>':'')+
        (account.canManage?'<button type="button" class="btn btn-outline-primary btn-sm" id="discordLink">'+(linked?'Change link':'Link account')+'</button>'+(linked?'<button type="button" class="btn btn-outline-danger btn-sm" id="discordUnlink">Unlink</button>':''):'')+'<button type="button" class="btn btn-outline-secondary btn-sm" id="discordRefresh">Refresh</button></div>';
      wrap.querySelector('#discordRefresh').onclick=load;
      const copy=wrap.querySelector('#discordCopyId');if(copy)copy.onclick=async()=>{
        try{await navigator.clipboard.writeText(id);copy.textContent='Copied';}
        catch{await Swal.fire({...dialog,title:'Copy Discord user ID',input:'text',inputValue:id,inputAttributes:{readonly:'readonly'},confirmButtonText:'Close'});}
      };
      const link=wrap.querySelector('#discordLink');if(link)link.onclick=()=>change('link');
      const unlink=wrap.querySelector('#discordUnlink');if(unlink)unlink.onclick=()=>change('unlink');
    }
    async function change(action){
      if(busy||!account.canManage)return;
      const expectedUserId=account.userId||null;
      const result=await Swal.fire({...dialog,title:action==='unlink'?'Unlink Discord account?':account.linked?'Change Discord account?':'Link Discord account?',
        text:action==='unlink'?'The account link will be removed. Existing attendance records are retained.':'Enter the Discord user ID. In Discord, enable Developer Mode, right-click the member, then Copy User ID.',
        ...(action==='link'?{input:'text',inputLabel:'Discord user ID',inputValue:account.userId||'',inputAttributes:{inputmode:'numeric',maxlength:'20'},inputValidator:value=>/^\d{17,20}$/.test(value.trim())?undefined:'Enter a valid Discord user ID.'}:{icon:'warning'}),
        showCancelButton:true,confirmButtonText:action==='unlink'?'Unlink':'Confirm link'});
      if(!result.isConfirmed)return;busy=true;
      wrap.querySelectorAll('button').forEach(button=>button.disabled=true);
      try{account=await request(action,{userId:action==='link'?result.value.trim():undefined,expectedUserId});render();}
      catch(error){await Swal.fire({...dialog,icon:'error',title:'Discord link not changed',text:error.message});}
      finally{busy=false;wrap.querySelectorAll('button').forEach(button=>button.disabled=false);}
    }
    wrap.innerHTML='<p class="text-muted">Click Refresh to load Discord account details.</p><button type="button" class="btn btn-outline-secondary btn-sm" id="discordRefresh">Refresh</button>';
    wrap.querySelector('#discordRefresh').onclick=load;
  };
})();
