const {Button,IconButton,Input,Select,Switch,Tag,StatusBadge,KeyChip,Dialog,Toast,TopBar}=window.GantteroDesignSystem_0eea57;

function TaskDetail({task,onClose,onStatus}){
  if(!task) return null;
  return <Dialog open title={`${task.id} · detalle`} onClose={onClose} footer={<><Button variant="ghost" size="sm" onClick={onClose}>CERRAR</Button><Button size="sm" onClick={onClose}>GUARDAR</Button></>}>
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontFamily:'var(--font-mono)',fontSize:14,color:'var(--ink-1)'}}>{task.title}</span>
        <StatusBadge status={task.status}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <Select label="Estado" value={task.status} onChange={v=>onStatus(task,v)} options={[{value:'backlog',label:'BACKLOG'},{value:'in_progress',label:'EN CURSO'},{value:'blocked',label:'BLOQUEADA'},{value:'done',label:'HECHA'}]}/>
        <Input label="Estimación" defaultValue={task.est||''}/>
        <Input label="Inicio" defaultValue={task.start}/>
        <Input label="Fin" defaultValue={task.end}/>
      </div>
      <div>
        <MicroLabel style={{marginBottom:8}}>TIEMPO REGISTRADO (AUTO)</MicroLabel>
        <div style={{fontFamily:'var(--font-mono)',fontSize:11,color:task.logged?'var(--ink-2)':'var(--ink-5)'}}>{task.logged?`⏱ ${task.logged} · abre/cierra con el estado`:'// aún sin tramos — pasa a EN CURSO para abrir uno'}</div>
      </div>
      <div>
        <MicroLabel style={{marginBottom:8}}>GITHUB</MicroLabel>
        {GT_DATA.commits.filter(c=>c.msg.startsWith(task.id)).map(c=><div key={c.sha} style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--ink-3)',padding:'6px 0',borderBottom:'1px solid var(--border-1)',display:'flex',gap:10}}><span style={{color:'var(--accent)'}}>{c.sha}</span><span style={{flex:1}}>{c.msg}</span><span style={{color:'var(--ink-5)'}}>{c.when}</span></div>)}
        {!GT_DATA.commits.some(c=>c.msg.startsWith(task.id))&&<div style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--ink-5)'}}>// cita {task.id} en un commit para enlazarlo</div>}
      </div>
    </div>
  </Dialog>;
}

function VoiceCapture({open,onClose,onSave}){
  const [phase,setPhase]=React.useState('idle'); // idle → rec → review
  React.useEffect(()=>{if(open){setPhase('idle');}},[open]);
  React.useEffect(()=>{let t;if(phase==='rec'){t=setTimeout(()=>setPhase('review'),2200);}return ()=>clearTimeout(t);},[phase]);
  if(!open) return null;
  return <Dialog open title="Captura por voz" onClose={onClose} footer={phase==='review'?<><Button variant="ghost" size="sm" onClick={onClose}>DESCARTAR</Button><Button size="sm" onClick={()=>{onSave({id:'GP-58',title:'Configurar backups del NAS',status:'backlog',start:'2026-07-24',end:'2026-07-26',est:'3h'});onClose();}}>GUARDAR</Button></>:null}>
    {phase!=='review'?
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16,padding:'18px 0'}}>
        <button onClick={()=>setPhase(phase==='rec'?'review':'rec')} style={{width:74,height:74,border:phase==='rec'?'1px solid var(--sig-late)':'1px solid var(--border-2)',background:'var(--bg-1)',cursor:'pointer',fontSize:26,color:phase==='rec'?'var(--sig-late)':'var(--accent)',fontFamily:'var(--font-mono)',animation:phase==='rec'?'blink 1.1s infinite':'none'}}>●</button>
        <span style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--ink-5)'}}>{phase==='rec'?'// grabando… suelta para transcribir':'// pulsa y describe la tarea — 10 segundos bastan'}</span>
        {phase==='rec'&&<span style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--ink-3)'}}>"configurar los backups del NAS para este fin de semana, unas tres horas…"</span>}
      </div>
    :
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <Toast>whisper + gemma → tarea estructurada. revisa y guarda.</Toast>
        <Input label="Título" defaultValue="Configurar backups del NAS"/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
          <Select label="Tipo" options={['TAREA','ÉPICA','SUBTAREA']}/>
          <Input label="Fechas" defaultValue="24 → 26 JUL"/>
          <Input label="Estimación" defaultValue="3h"/>
        </div>
      </div>}
  </Dialog>;
}

function AjustesView(){
  return <div style={{maxWidth:560,display:'flex',flexDirection:'column',gap:22}}>
    <div style={{border:'1px solid var(--border-1)',padding:18,display:'flex',flexDirection:'column',gap:14}}>
      <MicroLabel>VENTANA DEL KANBAN</MicroLabel>
      <Select options={[{value:'7',label:'7 DÍAS'},{value:'14',label:'14 DÍAS'},{value:'21',label:'21 DÍAS'}]} value="14" onChange={()=>{}}/>
      <span style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--ink-5)'}}>// un ítem entra si sus fechas cruzan [hoy, hoy + ventana]</span>
    </div>
    <div style={{border:'1px solid var(--border-1)',padding:18,display:'flex',flexDirection:'column',gap:14}}>
      <MicroLabel>VOZ</MicroLabel>
      <Switch checked label="Retener audios en el NAS"/>
      <span style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--ink-5)'}}>// desactívalo para descartar el audio tras transcribir</span>
    </div>
    <div style={{border:'1px solid var(--border-1)',padding:18,display:'flex',flexDirection:'column',gap:14}}>
      <MicroLabel>GITHUB</MicroLabel>
      <Input label="Personal access token" type="password" defaultValue="ghp_····················" hint="scope mínimo, solo lectura"/>
      <Switch label="Webhook (en vez de polling)"/>
    </div>
  </div>;
}

function ProjectSelector({projects,active,onSelect,onNew,onEdit,onDelete}){
  const [open,setOpen]=React.useState(false);
  const cur=projects.find(p=>p.id===active);
  React.useEffect(()=>{const h=()=>setOpen(false);if(open){document.addEventListener('click',h);return ()=>document.removeEventListener('click',h);}},[open]);
  return <div style={{position:'relative',fontFamily:'var(--font-mono)'}} onClick={e=>e.stopPropagation()}>
    <button onClick={()=>setOpen(o=>!o)} style={{display:'inline-flex',alignItems:'center',gap:10,background:'none',border:'1px solid var(--border-2)',color:'var(--ink-1)',cursor:'pointer',fontFamily:'var(--font-mono)',fontSize:11,fontWeight:700,letterSpacing:'.06em',padding:'8px 12px',transition:'all .15s'}}>
      <span style={{fontSize:'9.5px',fontWeight:400,letterSpacing:'.1em',color:'var(--ink-5)'}}>PROYECTO</span>{cur.name}<span style={{color:'var(--accent)',fontSize:9}}>▾</span>
    </button>
    {open&&<div style={{position:'absolute',top:'calc(100% + 4px)',left:0,minWidth:280,background:'var(--bg-1)',border:'1px solid var(--border-2)',zIndex:150}}>
      {projects.map((p,i)=><div key={p.id} className="gt-projrow" style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderBottom:'1px solid var(--border-1)',cursor:'pointer',background:p.id===active?'var(--bg-2)':'none'}} onClick={()=>{onSelect(p.id);setOpen(false);}}>
        <span style={{color:'var(--accent)',fontSize:10}}>/{String(i+1).padStart(2,'0')}</span>
        <span style={{flex:1,fontSize:11.5,fontWeight:p.id===active?700:400,color:'var(--ink-1)'}}>{p.name}<span style={{display:'block',fontSize:9.5,fontWeight:400,color:'var(--ink-5)',marginTop:2}}>{p.desc}</span></span>
        <button title="Editar" onClick={e=>{e.stopPropagation();setOpen(false);onEdit(p);}} style={{background:'none',border:'none',color:'var(--ink-5)',cursor:'pointer',fontFamily:'var(--font-mono)',fontSize:11,padding:'2px 4px'}} onMouseEnter={e=>e.target.style.color='var(--accent)'} onMouseLeave={e=>e.target.style.color='var(--ink-5)'}>✎</button>
        <button title="Eliminar" onClick={e=>{e.stopPropagation();setOpen(false);onDelete(p);}} style={{background:'none',border:'none',color:'var(--ink-5)',cursor:'pointer',fontFamily:'var(--font-mono)',fontSize:11,padding:'2px 4px'}} onMouseEnter={e=>e.target.style.color='var(--sig-late)'} onMouseLeave={e=>e.target.style.color='var(--ink-5)'}>✕</button>
      </div>)}
      <button onClick={()=>{setOpen(false);onNew();}} style={{display:'block',width:'100%',textAlign:'left',background:'none',border:'none',color:'var(--accent)',cursor:'pointer',fontFamily:'var(--font-mono)',fontSize:11,fontWeight:700,letterSpacing:'.04em',padding:'10px 12px'}}>+ NUEVO PROYECTO</button>
    </div>}
  </div>;
}

function ProjectDialog({project,onClose,onSave}){
  const isNew=!project?.id;
  const [name,setName]=React.useState(project?.name||'');
  const [desc,setDesc]=React.useState(project?.desc||'');
  const [repo,setRepo]=React.useState(project?.repo||'');
  const [win,setWin]=React.useState(String(project?.window||14));
  return <Dialog open title={isNew?'Nuevo proyecto':`Editar · ${project.name}`} onClose={onClose}
    footer={<><Button variant="ghost" size="sm" onClick={onClose}>CANCELAR</Button><Button size="sm" disabled={!name.trim()} onClick={()=>onSave({...project,name:name.trim().toUpperCase(),desc,repo,window:+win})}>{isNew?'CREAR':'GUARDAR'}</Button></>}>
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <Input label="Nombre" value={name} onChange={setName} placeholder="p. ej. HOMELAB"/>
      <Input label="Descripción" value={desc} onChange={setDesc} placeholder="una línea basta"/>
      <div style={{display:'grid',gridTemplateColumns:'1.4fr 1fr',gap:10}}>
        <Input label="Repo GitHub" value={repo} onChange={setRepo} placeholder="owner/repo" hint="opcional — smart commits"/>
        <Select label="Ventana kanban" value={win} onChange={setWin} options={[{value:'7',label:'7 DÍAS'},{value:'14',label:'14 DÍAS'},{value:'21',label:'21 DÍAS'}]}/>
      </div>
    </div>
  </Dialog>;
}

function ProjectDelete({project,onClose,onConfirm}){
  const n=project.epics.reduce((a,e)=>a+e.tasks.length,0);
  return <Dialog open title="Eliminar proyecto" onClose={onClose}
    footer={<><Button variant="ghost" size="sm" onClick={onClose}>CANCELAR</Button><Button variant="danger" size="sm" onClick={onConfirm}>ELIMINAR</Button></>}>
    <div style={{display:'flex',flexDirection:'column',gap:10,fontFamily:'var(--font-mono)'}}>
      <span style={{fontSize:12.5,color:'var(--ink-1)'}}>{project.name} — {project.epics.length} épicas · {n} ítems</span>
      <span style={{fontSize:10,color:'var(--sig-late)'}}>// se borran sus ítems y time_logs. no hay papelera.</span>
    </div>
  </Dialog>;
}

Object.assign(window,{TaskDetail,VoiceCapture,AjustesView,ProjectSelector,ProjectDialog,ProjectDelete});
