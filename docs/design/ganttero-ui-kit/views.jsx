const {Button,IconButton,Input,Select,Checkbox,Switch,Tag,StatusBadge,KeyChip,TaskCard,Dialog,Toast,Tabs}=window.GantteroDesignSystem_0eea57;

function MicroLabel({children,style}){return <div style={{fontFamily:'var(--font-mono)',fontSize:'9.5px',letterSpacing:'.1em',color:'var(--ink-5)',textTransform:'uppercase',...style}}>{children}</div>;}

function KanbanView({tasks,onOpen}){
  const cols=[['backlog','BACKLOG'],['in_progress','EN CURSO'],['blocked','BLOQUEADA'],['done','HECHA']];
  const order={late:0,now:1,normal:2,blocked:0,done:3};
  return <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,alignItems:'start'}}>
    {cols.map(([st,label])=>{
      const list=tasks.filter(t=>t.status===st).sort((a,b)=>order[gtPriority(a)]-order[gtPriority(b)]);
      return <div key={st} style={{border:'1px solid var(--border-1)',minHeight:420,display:'flex',flexDirection:'column'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 12px',borderBottom:'1px solid var(--border-1)'}}>
          <StatusBadge status={st}/><span style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--ink-5)'}}>{String(list.length).padStart(2,'0')}</span>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8,padding:8}}>
          {list.map(t=><TaskCard key={t.id} id={t.id} title={t.title} priority={gtPriority(t)==='done'?'normal':gtPriority(t)} done={t.status==='done'} dates={gtDates(t)} estimate={t.est} timeLogged={t.logged} onClick={()=>onOpen(t)}/>)}
          {!list.length&&<div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--ink-5)',padding:'14px 6px'}}>// vacío</div>}
        </div>
      </div>;})}
  </div>;
}

function GanttView({data,onOpen}){
  const [zoom,setZoom]=React.useState('mes');
  const t0=new Date('2026-07-01').getTime(), t1=new Date('2026-09-10').getTime();
  const pct=d=>((new Date(d).getTime()-t0)/(t1-t0)*100);
  const months=[['JUL 2026','2026-07-01'],['AGO 2026','2026-08-01'],['SEP 2026','2026-09-01']];
  return <div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:14}}>
      <Tabs items={[{id:'año',label:'AÑO',index:'/01'},{id:'6m',label:'6 MESES',index:'/02'},{id:'mes',label:'MES',index:'/03'},{id:'semana',label:'SEMANA',index:'/04'},{id:'día',label:'DÍA',index:'/05'}]} active={zoom} onChange={setZoom}/>
      <span style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--ink-5)'}}>// el gantt manda — el kanban se deriva</span>
    </div>
    <div style={{border:'1px solid var(--border-1)',position:'relative'}}>
      <div style={{display:'flex',borderBottom:'1px solid var(--border-1)'}}>
        <div style={{width:290,flex:'none',padding:'8px 12px',borderRight:'1px solid var(--border-1)'}}><MicroLabel>ÍTEM</MicroLabel></div>
        <div style={{flex:1,position:'relative',display:'flex'}}>
          {months.map(([m,d])=><div key={m} style={{position:'absolute',left:pct(d)+'%',padding:'8px 8px',borderLeft:'1px solid var(--border-1)',height:'100%',boxSizing:'border-box'}}><MicroLabel>{m}</MicroLabel></div>)}
        </div>
      </div>
      <div style={{position:'absolute',top:0,bottom:0,left:`calc(290px + (100% - 290px) * ${pct('2026-07-23')/100})`,width:0,borderLeft:'1px dashed var(--accent)',zIndex:2}}>
        <span style={{position:'absolute',top:2,left:4,fontFamily:'var(--font-mono)',fontSize:9,color:'var(--accent)'}}>HOY</span>
      </div>
      {data.epics.map(e=><React.Fragment key={e.id}>
        <GanttRow label={<span style={{fontFamily:'var(--font-mono)',fontSize:11.5,fontWeight:700,color:'var(--ink-1)'}}><span style={{color:'var(--accent)',marginRight:6}}>▸</span>{e.title}</span>} start={e.start} end={e.end} pct={pct} bar={{background:'var(--accent-dim)',border:'1px solid var(--accent)',height:14}}/>
        {e.tasks.map(t=>{
          const pr=gtPriority(t);
          const c=t.status==='done'?'var(--ink-5)':pr==='late'?'var(--sig-late)':pr==='blocked'?'var(--sig-blocked)':pr==='now'?'var(--accent)':'var(--ink-4)';
          return <GanttRow key={t.id} onClick={()=>onOpen(t)} label={<span style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--ink-3)',paddingLeft:18,display:'flex',gap:8}}><KeyChip id={t.id} muted={t.status==='done'} style={{fontSize:10}}/>{t.title}</span>} start={t.start} end={t.end} pct={pct} bar={{background:c,height:8,opacity:t.status==='done'?.5:1}}/>;
        })}
      </React.Fragment>)}
    </div>
  </div>;
}
function GanttRow({label,start,end,pct,bar,onClick}){
  return <div onClick={onClick} className={onClick?'gt-row':''} style={{display:'flex',borderBottom:'1px solid var(--border-1)',cursor:onClick?'pointer':'default'}}>
    <div style={{width:290,flex:'none',padding:'9px 12px',borderRight:'1px solid var(--border-1)',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{label}</div>
    <div style={{flex:1,position:'relative',minHeight:32}}>
      <div style={{position:'absolute',top:'50%',transform:'translateY(-50%)',left:pct(start)+'%',width:Math.max(pct(end)-pct(start),1)+'%',...bar}}></div>
    </div>
  </div>;
}

Object.assign(window,{MicroLabel,KanbanView,GanttView});
