import { useState, useMemo, useCallback, useEffect } from "react";
import {
  supabase,
  fetchRequests, createRequest, updateRequest,
  fetchCRs, createCR, updateCR,
  fetchNotifications, markNotificationsRead,
  fetchInventory,
  fetchVehicles,
  fetchDrivers,
} from "./lib/supabase.js";
import { emailCRSubmitted, emailCRApproved, emailCRRejected, emailCRScheduled, emailRequestApproved } from "./lib/email.js";

/* =========================================================
   AFRICA PRUDENTIAL — FaciliFlow  USER PLATFORM
   app.africaprudential.com
   ========================================================= */

// ── DESIGN TOKENS ──────────────────────────────────────────────
const C = {
  brand:"#C8102E", brandDk:"#A00D24", brandLt:"#FEF2F4",
  white:"#FFFFFF", pageBg:"#F7F8FA", surface:"#EEF0F4",
  ink:"#0F172A", ink2:"#334155", muted:"#64748B", faint:"#94A3B8",
  border:"#E2E8F0", borderDk:"#CBD5E1",
  green:"#059669",  greenBg:"#ECFDF5",
  amber:"#D97706",  amberBg:"#FFFBEB",
  red:"#DC2626",    redBg:"#FEF2F2",
  blue:"#2563EB",   blueBg:"#EFF6FF",
  violet:"#7C3AED", violetBg:"#F5F3FF",
  orange:"#EA580C", orangeBg:"#FFF7ED",
  teal:"#0891B2",   tealBg:"#E0F7FA",
};

// ── STYLE HELPERS ──────────────────────────────────────────────
const btn = (v="primary", extra={}) => ({
  display:"inline-flex", alignItems:"center", gap:6, padding:"7px 16px",
  borderRadius:6, border:"none", cursor:"pointer", fontSize:12, fontWeight:600,
  fontFamily:"inherit", transition:"opacity .15s, box-shadow .15s", whiteSpace:"nowrap",
  ...(v==="primary"  ? {background:C.brand,   color:"#fff", boxShadow:`0 1px 3px ${C.brand}50`} :
      v==="ghost"    ? {background:"transparent", color:C.muted, border:`1px solid ${C.border}`} :
      v==="danger"   ? {background:C.red,     color:"#fff"} :
      v==="success"  ? {background:C.green,   color:"#fff"} :
      v==="violet"   ? {background:C.violet,  color:"#fff"} :
      v==="outline"  ? {background:"#fff",    color:C.brand, border:`1.5px solid ${C.brand}`} :
                       {background:C.surface, color:C.ink2}),
  ...extra,
});

const inp = (err=false) => ({
  width:"100%", padding:"8px 11px", border:`1px solid ${err?C.red:C.border}`,
  borderRadius:6, fontSize:13, color:C.ink, background:"#fff",
  fontFamily:"inherit", outline:"none", boxSizing:"border-box",
  transition:"border-color .15s",
});

const card = (p=16) => ({
  background:"#fff", border:`1px solid ${C.border}`,
  borderRadius:10, padding:p, boxShadow:"0 1px 3px rgba(0,0,0,.05)",
});

const LBL = { fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase",
              letterSpacing:".07em", display:"block", marginBottom:5 };

// ── STATIC LOOKUPS (populated from DB at runtime) ─────────────
// Users map is built dynamically from fetched data
// INV_ITEMS is loaded from inventory table

// ── STATUS META ────────────────────────────────────────────────
const CR_STATUS = {
  draft:                {label:"Draft",              color:C.muted,  bg:"#F8FAFC",   dot:"#CBD5E1"},
  pending_line_manager: {label:"Pending L1",         color:C.amber,  bg:C.amberBg,   dot:C.amber},
  pending_secondary:    {label:"Pending L2",         color:C.orange, bg:C.orangeBg,  dot:C.orange},
  change_review:        {label:"In Review",          color:C.violet, bg:C.violetBg,  dot:C.violet},
  scheduled:            {label:"Scheduled",          color:C.blue,   bg:C.blueBg,    dot:C.blue},
  in_progress:          {label:"In Progress",        color:C.teal,   bg:C.tealBg,    dot:C.teal},
  completed:            {label:"Completed",          color:C.green,  bg:C.greenBg,   dot:C.green},
  post_review:          {label:"Post Review",        color:C.violet, bg:C.violetBg,  dot:C.violet},
  closed:               {label:"Closed",             color:C.muted,  bg:"#F8FAFC",   dot:"#CBD5E1"},
  rejected:             {label:"Rejected",           color:C.red,    bg:C.redBg,     dot:C.red},
};

const REQ_STATUS = {
  draft:            {label:"Draft",            color:C.muted,  bg:"#F8FAFC"},
  pending_approval: {label:"Pending Approval", color:C.amber,  bg:C.amberBg},
  approved:         {label:"Approved",         color:C.green,  bg:C.greenBg},
  in_progress:      {label:"In Progress",      color:C.blue,   bg:C.blueBg},
  completed:        {label:"Completed",        color:C.green,  bg:C.greenBg},
  rejected:         {label:"Rejected",         color:C.red,    bg:C.redBg},
};

// ── HELPERS ────────────────────────────────────────────────────
const fmtDT = d => { try { if(!d) return "—"; const dt=new Date(d); return isNaN(dt)?"—":dt.toLocaleString("en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}); } catch(e){ return "—"; }};
const fmtD  = d => { try { if(!d) return "—"; const dt=new Date(d); return isNaN(dt)?"—":dt.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}); } catch(e){ return "—"; }};
const uid   = p => `${p}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
const crId  = n => `CR-${String(n).padStart(6,"0")}`;
const reqId = (y,n) => `REQ-${y}-${String(n).padStart(3,"0")}`;

// ── DB → UI FIELD NORMALIZERS ──────────────────────────────────
// DB returns snake_case; UI components use camelCase from original seed data.
// These normalizers let both coexist without rewriting every component.
const normCR = cr => cr ? ({
  ...cr,
  changeType:  cr.change_type   ?? cr.changeType,
  riskLevel:   cr.risk_level    ?? cr.riskLevel,
  deployDate:  cr.deploy_date   ?? cr.deployDate,
  deployStart: cr.deploy_start  ?? cr.deployStart,
  deployEnd:   cr.deploy_end    ?? cr.deployEnd,
  isEmergency: cr.is_emergency  ?? cr.isEmergency,
  systemName:  cr.system_name   ?? cr.systemName,
  createdAt:   cr.created_at    ?? cr.createdAt,
  updatedAt:   cr.updated_at    ?? cr.updatedAt,
}) : cr;

const normReq = r => r ? ({
  ...r,
  submittedBy: r.submitted_by  ?? r.submittedBy,
  submittedAt: r.created_at    ?? r.submittedAt,
  approverId:  r.approver_id   ?? r.approverId,
}) : r;

// ── ATOMS ──────────────────────────────────────────────────────
const Av = ({i,s=30,bg=C.brand}) => (
  <div style={{width:s,height:s,borderRadius:"50%",background:bg,color:"#fff",display:"flex",
    alignItems:"center",justifyContent:"center",fontSize:s*.33,fontWeight:700,flexShrink:0}}>{i}</div>
);

const Chip = ({label,color,bg}) => (
  <span style={{display:"inline-flex",alignItems:"center",padding:"2px 9px",borderRadius:20,
    fontSize:11,fontWeight:600,background:bg,color,border:`1px solid ${color}22`,whiteSpace:"nowrap"}}>{label}</span>
);

const CRChip = ({s}) => { const m=CR_STATUS[s]||{label:s,color:C.muted,bg:"#F8FAFC"}; return <Chip label={m.label} color={m.color} bg={m.bg}/>; };
const RQChip = ({s}) => { const m=REQ_STATUS[s]||{label:s,color:C.muted,bg:"#F8FAFC"}; return <Chip label={m.label} color={m.color} bg={m.bg}/>; };

const EnvTag = ({e}) => {
  const m={Production:{c:C.red,bg:C.redBg},Staging:{c:C.amber,bg:C.amberBg},Dev:{c:C.green,bg:C.greenBg}};
  const {c,bg}=m[e]||{c:C.muted,bg:"#F8FAFC"};
  return <span style={{fontSize:11,fontWeight:600,padding:"1px 7px",borderRadius:4,background:bg,color:c}}>{e}</span>;
};

const RiskTag = ({r}) => {
  const m={High:{c:C.red,bg:C.redBg},Medium:{c:C.amber,bg:C.amberBg},Low:{c:C.green,bg:C.greenBg}};
  const {c,bg}=m[r]||{c:C.muted,bg:"#F8FAFC"};
  return <span style={{fontSize:11,fontWeight:600,padding:"1px 7px",borderRadius:4,background:bg,color:c}}>{r}</span>;
};

function Toast({t}){
  if(!t)return null;
  return (
    <div style={{position:"fixed",bottom:24,right:24,zIndex:9999,padding:"11px 18px",
      borderRadius:8,fontSize:13,fontWeight:600,color:"#fff",
      background:t.type==="error"?C.red:C.green,
      boxShadow:"0 4px 20px rgba(0,0,0,.18)",
      animation:"slideUp .2s ease"}}>
      {t.type==="error"?"✕ ":"✓ "}{t.msg}
    </div>
  );
}

function Modal({title,sub,onClose,children,w=640}){
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,.45)",zIndex:800,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(3px)"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{...card(0),width:w,maxWidth:"96vw",maxHeight:"92vh",display:"flex",flexDirection:"column",borderRadius:12}}>
        <div style={{padding:"16px 22px",borderBottom:`1px solid ${C.border}`,display:"flex",
          justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:C.ink}}>{title}</div>
            {sub&&<div style={{fontSize:12,color:C.muted,marginTop:1}}>{sub}</div>}
          </div>
          <button onClick={onClose} style={{...btn("ghost"),padding:"4px 9px",borderRadius:5}}>✕</button>
        </div>
        <div style={{padding:"20px 22px",overflowY:"auto",flex:1}}>{children}</div>
      </div>
    </div>
  );
}

function PageTitle({title,sub,action}){
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22}}>
      <div>
        <h1 style={{margin:0,fontSize:20,fontWeight:800,color:C.ink,letterSpacing:"-.025em"}}>{title}</h1>
        {sub&&<p style={{margin:"3px 0 0",fontSize:13,color:C.muted}}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

function TH({cols}){
  return (
    <thead>
      <tr style={{background:"#FAFAFA"}}>
        {cols.map(c=>(
          <th key={c} style={{padding:"9px 14px",textAlign:"left",fontSize:10,fontWeight:700,
            color:C.muted,textTransform:"uppercase",letterSpacing:".08em",
            borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap"}}>{c}</th>
        ))}
      </tr>
    </thead>
  );
}

function Empty({icon="—",title,sub}){
  return (
    <div style={{textAlign:"center",padding:"44px 24px",color:C.muted}}>
      <div style={{fontSize:36,marginBottom:10}}>{icon}</div>
      <div style={{fontWeight:600,color:C.ink2,fontSize:14}}>{title}</div>
      {sub&&<div style={{fontSize:12,marginTop:4}}>{sub}</div>}
    </div>
  );
}

// ── FILTER BAR ─────────────────────────────────────────────────
function Filters({fields,values,onChange}){
  return (
    <div style={{display:"flex",gap:10,flexWrap:"wrap",padding:"12px 14px",
      background:"#fff",border:`1px solid ${C.border}`,borderRadius:8,marginBottom:16,alignItems:"flex-end"}}>
      {fields.map(f=>(
        <div key={f.k} style={{display:"flex",flexDirection:"column",minWidth:f.w||120}}>
          <label style={LBL}>{f.label}</label>
          {f.type==="select"
            ?<select value={values[f.k]||""} onChange={e=>onChange({...values,[f.k]:e.target.value})}
               style={{...inp(),padding:"6px 9px",fontSize:12}}>
               <option value="">All</option>
               {f.opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
             </select>
            :<input type={f.type||"text"} value={values[f.k]||""} placeholder={f.ph||""}
               onChange={e=>onChange({...values,[f.k]:e.target.value})}
               style={{...inp(),padding:"6px 9px",fontSize:12}}/>}
        </div>
      ))}
      <button onClick={()=>onChange({})} style={{...btn("ghost"),padding:"6px 12px",fontSize:11,alignSelf:"flex-end"}}>Clear</button>
    </div>
  );
}

// ── NAV STRUCTURE ──────────────────────────────────────────────
const NAV_GROUPS = [
  {group:"Main",items:[
    {key:"dashboard",    label:"Dashboard",       icon:"◫",  roles:["employee","manager","resource_team"]},
    {key:"my_requests",  label:"My Requests",      icon:"≡",  roles:["employee","manager"]},
    {key:"approvals",    label:"Approvals",        icon:"✓",  roles:["manager"]},
    {key:"queue",        label:"Processing Queue", icon:"↻",  roles:["resource_team"]},
  ]},
  {group:"Change Management",items:[
    {key:"change_requests",label:"Change Requests",icon:"⟳",  roles:["employee","manager","resource_team"]},
    {key:"change_calendar",label:"Change Calendar",icon:"▦",  roles:["employee","manager","resource_team"]},
    {key:"cr_approvals",   label:"CR Approvals",   icon:"✓",  roles:["manager"]},
    {key:"cr_review",      label:"Review Queue",   icon:"◈",  roles:["resource_team"]},
  ]},
];

// ══════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════
export default function UserApp({ currentUser }){
  const [page,    setPage]   = useState("dashboard");
  const [notifs,  setNotifs] = useState([]);
  const [bellOpen,setBell]   = useState(false);
  const [reqs,    setReqs]   = useState([]);
  const [crs,     setCrs]    = useState([]);
  const [invItems,  setInvItems]  = useState([]);
  const [vehicles,  setVehicles]  = useState([]);
  const [drivers,   setDrivers]   = useState([]);
  const [users,   setUsers]  = useState({});
  const [toast,   setToast]  = useState(null);
  const [loading, setLoading]= useState(true);

  const me = currentUser;
  const uid = currentUser?.id;
  const tenantId = currentUser?.tenant_id;

  // ── INITIAL DATA LOAD ──────────────────────────────────────
  useEffect(()=>{
    if(!tenantId) return;
    const load = async ()=>{
      try {
        const [reqData, crData, notifData, invData, userData, vehData, drvData] = await Promise.all([
          fetchRequests(tenantId),
          fetchCRs(tenantId),
          fetchNotifications(uid),
          fetchInventory(tenantId),
          supabase.from("users").select("*").eq("tenant_id", tenantId),
          fetchVehicles(tenantId),
          fetchDrivers(tenantId),
        ]);
        setReqs((reqData || []).map(normReq));
        setCrs((crData || []).map(normCR));
        setNotifs(notifData || []);
        setInvItems(invData || []);
        setVehicles(vehData || []);
        setDrivers(drvData || []);
        // Build users map keyed by id
        const umap = {};
        (userData.data || []).forEach(u => { umap[u.id] = u; });
        setUsers(umap);
      } catch(e){ console.error("Load error:", e); }
      finally { setLoading(false); }
    };
    load();
  },[tenantId, uid]);

  const unread = notifs.filter(n=>!n.read).length;

  const flash = useCallback((msg,type="success")=>{
    setToast({msg,type});
    setTimeout(()=>setToast(null),3200);
  },[]);

  // ── REQUESTS ──────────────────────────────────────────────
  const submitReq = useCallback(async (data)=>{
    try {
      const now = new Date();
      const iso = now.toISOString();
      const id  = `REQ-${now.getFullYear()}-${String(reqs.length+1).padStart(3,"0")}`;
      const rec = {
        id, tenant_id:tenantId, type:data.type, title:data.title,
        submitted_by:uid, approver_id:null,
        status:"pending_approval",
        details:data.details||{},
        history:[{s:"draft",at:iso,by:uid},{s:"pending_approval",at:iso,by:uid}],
        created_at:iso, updated_at:iso,
      };
      const saved = await createRequest(rec);
      setReqs(p=>[normReq(saved),...p]);
      flash(`${id} submitted`);
    } catch(e){ flash(e.message,"error"); }
  },[reqs.length, uid, tenantId, flash]);

  const transReq = useCallback(async (id,ns,note="")=>{
    try {
      const req = reqs.find(r=>r.id===id);
      const newHistory = [...(req.history||[]),{s:ns,at:new Date().toISOString(),by:uid,note}];
      const saved = await updateRequest(id,{status:ns, history:newHistory});
      setReqs(p=>p.map(r=>r.id===id?normReq(saved):r));
      flash(`Request ${ns.replace(/_/g," ")}`);
    } catch(e){ flash(e.message,"error"); }
  },[reqs, uid, flash]);

  // ── CHANGE REQUESTS ────────────────────────────────────────
  const submitCR = useCallback(async (data)=>{
    try {
      const iso = new Date().toISOString();
      const count = crs.length + 1;
      const id = `CR-${String(count).padStart(6,"0")}`;
      const rec = {
        id, tenant_id:tenantId, title:data.title,
        initiator:uid, status:"pending_line_manager",
        change_type:data.changeType, risk_level:data.riskLevel,
        environment:data.environment, system_name:data.system,
        category:data.category, description:data.desc,
        deploy_date:data.deployDate||null,
        deploy_start:data.deployStart||null,
        deploy_end:data.deployEnd||null,
        rollback:data.rollback, test_evidence:data.testEvidence,
        is_emergency:data.changeType==="Emergency",
        history:[
          {s:"draft",at:iso,by:uid,label:"Draft created"},
          {s:"pending_line_manager",at:iso,by:uid,label:"Submitted"},
        ],
        stages:[
          {n:1,role:"Line Manager",status:"pending",at:null},
          {n:2,role:"Secondary Manager",status:"pending",at:null},
          {n:3,role:"Change Review Board",status:"pending",at:null},
        ],
        attachments:[], comments:[],
        created_at:iso, updated_at:iso,
      };
      const saved = await createCR(rec);
      setCrs(p=>[normCR(saved),...p]);
      flash(`${id} submitted`);
    } catch(e){ flash(e.message,"error"); }
  },[crs.length, uid, tenantId, flash]);

  const transCR = useCallback(async (id,ns,note="",extra={})=>{
    try {
      const cr = crs.find(c=>c.id===id);
      const newHistory = [...(cr.history||[]),{
        s:ns, at:new Date().toISOString(), by:uid,
        label:CR_STATUS[ns]?.label||ns, note,
      }];
      const saved = await updateCR(id,{
        ...extra, status:ns, history:newHistory,
      });
      setCrs(p=>p.map(c=>c.id===id?normCR(saved):c));
      flash(`CR: ${CR_STATUS[ns]?.label||ns}`);
    } catch(e){ flash(e.message,"error"); }
  },[crs, uid, flash]);

  const handleSignOut = async ()=>{
    await supabase.auth.signOut();
  };

  const ctx = {
    me, uid, tenantId,
    reqs, setReqs,
    crs, setCrs,
    notifs, setNotifs,
    invItems,
    users,
    vehicles,
    drivers,
    submitReq, transReq,
    submitCR, transCR,
    flash,
  };

  const visNav = NAV_GROUPS
    .map(g=>({...g,items:g.items.filter(i=>i.roles.includes(me?.role))}))
    .filter(g=>g.items.length);

  if(loading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",
      fontFamily:"system-ui",color:C.muted,fontSize:14,background:C.pageBg}}>
      Loading FaciliFlow…
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:C.pageBg,fontFamily:"'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif",display:"flex",flexDirection:"column"}}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}
        input:focus,select:focus,textarea:focus{outline:none;border-color:${C.brand}!important;box-shadow:0 0 0 2.5px ${C.brand}18!important}
        button:hover{opacity:.88}tr:hover>td{background:#FAFAFA}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:${C.borderDk};border-radius:4px}
        @keyframes slideUp{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}`}
      </style>

      {/* ── TOPBAR ────────────────────────── */}
      <header style={{height:52,background:"#fff",borderBottom:`1px solid ${C.border}`,
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"0 20px",flexShrink:0,position:"sticky",top:0,zIndex:200}}>
        <div style={{display:"flex",gap:14,alignItems:"center"}}>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div style={{width:30,height:30,borderRadius:7,background:C.brand,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:13,fontWeight:900,color:"#fff",letterSpacing:"-.05em"}}>AP</div>
            <div>
              <div style={{fontSize:13,fontWeight:800,color:C.ink,letterSpacing:"-.02em",lineHeight:1.1}}>Africa Prudential</div>
              <div style={{fontSize:9,color:C.muted,fontWeight:600,letterSpacing:".06em",textTransform:"uppercase"}}>Staff Portal</div>
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          {/* Bell */}
          <div style={{position:"relative"}}>
            <button onClick={()=>setBell(p=>!p)} style={{...btn("ghost"),padding:"5px 9px",position:"relative"}}>
              <span style={{fontSize:14}}>🔔</span>
              {unread>0&&<span style={{position:"absolute",top:2,right:2,width:15,height:15,borderRadius:"50%",
                background:C.brand,fontSize:9,fontWeight:800,color:"#fff",
                display:"flex",alignItems:"center",justifyContent:"center"}}>{unread}</span>}
            </button>
            {bellOpen&&(
              <div style={{position:"absolute",right:0,top:40,width:320,background:"#fff",
                border:`1px solid ${C.border}`,borderRadius:10,boxShadow:"0 8px 30px rgba(0,0,0,.12)",
                zIndex:400,overflow:"hidden"}}>
                <div style={{padding:"11px 16px",borderBottom:`1px solid ${C.border}`,
                  display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:13,fontWeight:700,color:C.ink}}>Notifications</span>
                  <button onClick={async()=>{
                    await markNotificationsRead(uid);
                    setNotifs(p=>p.map(n=>({...n,read:true})));
                    setBell(false);
                  }} style={{fontSize:11,color:C.brand,fontWeight:600,background:"none",border:"none",cursor:"pointer"}}>
                    Mark all read
                  </button>
                </div>
                <div style={{maxHeight:280,overflowY:"auto"}}>
                  {notifs.length===0
                    ?<div style={{padding:24,textAlign:"center",color:C.muted,fontSize:13}}>No notifications</div>
                    :notifs.map(n=>(
                      <div key={n.id} style={{padding:"10px 16px",borderBottom:`1px solid #FAFAFA`,
                        background:n.read?"#fff":C.brandLt}}>
                        <div style={{fontSize:12,color:C.ink,fontWeight:n.read?400:600,lineHeight:1.45}}>{n.message}</div>
                        <div style={{fontSize:10,color:C.muted,marginTop:2}}>{fmtDT(n.created_at)}</div>
                      </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div style={{width:1,height:20,background:C.border}}/>
          <Av i={me?.initials||(me?.name?.slice(0,2).toUpperCase())||"??"} s={28}/>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.ink,lineHeight:1.2}}>{me?.name?.split(" ")[0]}</div>
            <div style={{fontSize:10,color:C.muted,textTransform:"capitalize"}}>{me?.role?.replace("_"," ")}</div>
          </div>
          <button onClick={handleSignOut} style={{...btn("ghost"),fontSize:11,padding:"4px 9px"}}>Sign out</button>
        </div>
      </header>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        {/* ── SIDEBAR ──────────────────────── */}
        <aside style={{width:210,background:"#fff",borderRight:`1px solid ${C.border}`,
          display:"flex",flexDirection:"column",flexShrink:0}}>
          <nav style={{flex:1,padding:"10px 0",overflowY:"auto"}}>
            {visNav.map(g=>(
              <div key={g.group} style={{marginBottom:4}}>
                <div style={{padding:"8px 16px 3px",fontSize:9,fontWeight:800,color:C.faint,
                  textTransform:"uppercase",letterSpacing:".1em"}}>{g.group}</div>
                {g.items.map(n=>{
                  const active = page===n.key;
                  const isCR   = n.key.includes("change")||n.key.includes("cr_");
                  const ac     = isCR?C.violet:C.brand;
                  return (
                    <button key={n.key} onClick={()=>{setPage(n.key);setBell(false)}} style={{
                      display:"flex",alignItems:"center",gap:9,width:"100%",padding:"8px 16px",
                      border:"none",borderLeft:`2px solid ${active?ac:"transparent"}`,
                      background:active?ac+"0E":"transparent",color:active?ac:C.ink2,
                      fontSize:12,fontWeight:active?700:500,cursor:"pointer",
                      fontFamily:"inherit",textAlign:"left",transition:"all .1s"}}>
                      <span style={{fontSize:13,opacity:active?1:.5}}>{n.icon}</span>
                      {n.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
          <div style={{padding:"11px 14px",borderTop:`1px solid ${C.border}`,background:C.pageBg}}>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <Av i={me?.initials||(me?.name?.slice(0,2).toUpperCase())||"??"} s={28}/>
              <div style={{minWidth:0}}>
                <div style={{fontSize:11,fontWeight:700,color:C.ink,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{me?.name}</div>
                <div style={{fontSize:10,color:C.muted}}>{me?.dept}</div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── CONTENT ──────────────────────── */}
        <main style={{flex:1,padding:28,overflowY:"auto",maxHeight:"calc(100vh - 52px)"}}
          onClick={()=>bellOpen&&setBell(false)}>
          {page==="dashboard"        && <Dashboard     ctx={ctx} setPage={setPage}/>}
          {page==="my_requests"      && <MyRequests    ctx={ctx}/>}
          {page==="approvals"        && <Approvals     ctx={ctx}/>}
          {page==="queue"            && <Queue         ctx={ctx}/>}
          {page==="change_requests"  && <ChangePage    ctx={ctx}/>}
          {page==="change_calendar"  && <CalendarPage  ctx={ctx}/>}
          {page==="cr_approvals"     && <CRApprovals   ctx={ctx}/>}
          {page==="cr_review"        && <CRReview      ctx={ctx}/>}
        </main>
      </div>

      <Toast t={toast}/>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════
function Dashboard({ctx,setPage}){
  const {me,uid,reqs,crs,users}=ctx;
  const mine     = reqs.filter(r=>r.submitted_by===uid);
  const myCRs    = crs.filter(c=>c.initiator===uid);
  const pending  = crs.filter(c=>["pending_line_manager","pending_secondary"].includes(c.status));
  const scheduled= crs.filter(c=>c.status==="scheduled");

  const StatBox=({v,label,color})=>(
    <div style={{background:"rgba(255,255,255,.18)",borderRadius:8,padding:"10px 16px",minWidth:90}}>
      <div style={{fontSize:24,fontWeight:900,color:"#fff"}}>{v}</div>
      <div style={{fontSize:11,color:"rgba(255,255,255,.75)",marginTop:1}}>{label}</div>
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      {/* Hero */}
      <div style={{background:`linear-gradient(135deg,${C.brand} 0%,${C.brandDk} 100%)`,
        borderRadius:12,padding:"24px 28px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:21,fontWeight:800,color:"#fff",letterSpacing:"-.025em"}}>
              Good morning, {me.name.split(" ")[0]} 👋
            </div>
            <div style={{fontSize:12,color:"rgba(255,255,255,.65)",marginTop:4}}>
              {new Date().toLocaleDateString("en-GB",{weekday:"long",year:"numeric",month:"long",day:"numeric"})} · Africa Prudential Plc
            </div>
          </div>
          {crs.filter(c=>c.is_emergency&&c.status==="in_progress").length>0&&(
            <div style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",
              borderRadius:8,padding:"8px 14px"}}>
              <div style={{color:"#fff",fontWeight:700,fontSize:12}}>⚡ Emergency CR Active</div>
            </div>
          )}
        </div>
        <div style={{display:"flex",gap:12,marginTop:18,flexWrap:"wrap"}}>
          <StatBox v={mine.length}      label="My Requests"/>
          <StatBox v={myCRs.length}     label="My Change Reqs"/>
          <StatBox v={scheduled.length} label="Scheduled Deploys"/>
          {(me.role==="manager")&&<StatBox v={pending.length} label="Awaiting My Approval"/>}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:16}}>
        {/* Recent CRs */}
        <div style={card(0)}>
          <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,
            display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:14,fontWeight:700,color:C.ink}}>Recent Change Requests</span>
            <button onClick={()=>setPage("change_requests")} style={{...btn("ghost"),fontSize:11,padding:"4px 10px"}}>View all →</button>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <TH cols={["CR ID","Title","Type","Environment","Status"]}/>
            <tbody>
              {crs.slice(0,5).map((c,i)=>(
                <tr key={c.id} style={{borderBottom:i<4?`1px solid #FAFAFA`:"none"}}>
                  <td style={{padding:"10px 14px",fontSize:11,fontWeight:700,color:C.ink,whiteSpace:"nowrap"}}>{c.id}</td>
                  <td style={{padding:"10px 14px",fontSize:12,color:C.ink,maxWidth:180}}>
                    <div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {c.is_emergency&&<span style={{color:C.red,marginRight:4}}>⚡</span>}{c.title}
                    </div>
                  </td>
                  <td style={{padding:"10px 14px",fontSize:11,color:C.muted}}>{c.change_type}</td>
                  <td style={{padding:"10px 14px"}}><EnvTag e={c.environment}/></td>
                  <td style={{padding:"10px 14px"}}><CRChip s={c.status}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right panel */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* Quick actions */}
          <div style={{...card(16)}}>
            <div style={{fontSize:13,fontWeight:700,color:C.ink,marginBottom:12}}>Quick Actions</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <button onClick={()=>setPage("change_requests")} style={{...btn("primary"),justifyContent:"flex-start",fontSize:12,width:"100%"}}>⟳ Raise Change Request</button>
              {(me.role==="employee"||me.role==="manager")&&<>
                <button onClick={()=>setPage("my_requests")} style={{...btn("flat"),justifyContent:"flex-start",fontSize:12,width:"100%",border:`1px solid ${C.border}`}}>🚗 Pool Car Request</button>
                <button onClick={()=>setPage("my_requests")} style={{...btn("flat"),justifyContent:"flex-start",fontSize:12,width:"100%",border:`1px solid ${C.border}`}}>✏️ Stationery Request</button>
              </>}
              {me.role==="manager"&&pending.length>0&&(
                <button onClick={()=>setPage("cr_approvals")} style={{...btn("flat"),justifyContent:"flex-start",fontSize:12,width:"100%",background:C.amberBg,color:C.amber,border:`1px solid ${C.amber}30`}}>
                  ⏳ {pending.length} CR approval{pending.length>1?"s":""} pending
                </button>
              )}
            </div>
          </div>
          {/* Upcoming */}
          <div style={{...card(16)}}>
            <div style={{fontSize:13,fontWeight:700,color:C.ink,marginBottom:10}}>📅 Upcoming Deployments</div>
            {scheduled.slice(0,3).map((c,i)=>(
              <div key={c.id} style={{padding:"8px 0",borderBottom:i<2?`1px solid ${C.border}`:"none"}}>
                <div style={{fontSize:12,fontWeight:600,color:C.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.title}</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>{fmtD(c.deploy_date+"T12:00:00")} · {c.deploy_start}–{c.deploy_end}</div>
              </div>
            ))}
            {scheduled.length===0&&<div style={{fontSize:12,color:C.muted}}>No deployments scheduled</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MY REQUESTS
// ══════════════════════════════════════════════════════════════
function MyRequests({ctx}){
  const {uid,reqs,submitReq,transReq,users,invItems,vehicles,drivers}=ctx;
  const [modal,    setModal]   = useState(null);
  const [detail,   setDetail]  = useState(null);
  const [search,   setSearch]  = useState("");
  const [fStatus,  setFStatus] = useState("");
  const [fType,    setFType]   = useState("");
  const [fFrom,    setFFrom]   = useState("");
  const [fTo,      setFTo]     = useState("");

  const mine = reqs.filter(r=>r.submitted_by===uid);

  // summary counts
  const counts = {
    all:      mine.length,
    pending:  mine.filter(r=>r.status==="pending_approval").length,
    approved: mine.filter(r=>r.status==="approved").length,
    done:     mine.filter(r=>["completed","delivered"].includes(r.status)).length,
    rejected: mine.filter(r=>r.status==="rejected").length,
  };

  const shown = useMemo(()=>{
    const q = search.toLowerCase();
    return mine.filter(r=>{
      if(fStatus && r.status!==fStatus) return false;
      if(fType   && r.type!==fType)     return false;
      if(fFrom   && new Date(r.created_at) < new Date(fFrom)) return false;
      if(fTo     && new Date(r.created_at) > new Date(fTo+"T23:59:59")) return false;
      if(q){
        const veh = r.assigned_vehicle ? (vehicles||[]).find(v=>v.id===r.assigned_vehicle) : null;
        const items = (r.details?.items||[]).map(it=>invItems.find(x=>x.id===it.id)?.name||"").join(" ");
        const hay = [r.id, r.title, r.details?.destination||"", r.details?.pickup||"", veh?.plate||"", veh?.model||"", items].join(" ").toLowerCase();
        if(!hay.includes(q)) return false;
      }
      return true;
    });
  },[mine,search,fStatus,fType,fFrom,fTo,vehicles,invItems]);

  const hasFilters = search||fStatus||fType||fFrom||fTo;
  const clearAll   = ()=>{ setSearch(""); setFStatus(""); setFType(""); setFFrom(""); setFTo(""); };

  const STATUS_QUICK = [
    {v:"",              l:"All",      count:counts.all},
    {v:"pending_approval",l:"Pending", count:counts.pending},
    {v:"approved",      l:"Approved", count:counts.approved},
    {v:"completed",     l:"Completed",count:counts.done},
    {v:"rejected",      l:"Rejected", count:counts.rejected},
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <PageTitle title="My Requests" sub="Your pool car and stationery requests"
        action={<div style={{display:"flex",gap:8}}>
          <button onClick={()=>setModal("car")}  style={btn("primary")}>🚗 Pool Car</button>
          <button onClick={()=>setModal("stat")} style={btn("outline")}>✏️ Stationery</button>
        </div>}/>

      {/* ── QUICK STATUS TABS ── */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {STATUS_QUICK.map(s=>{
          const active = fStatus===s.v;
          return (
            <button key={s.v} onClick={()=>setFStatus(s.v)} style={{
              padding:"6px 14px", borderRadius:20,
              border:`1.5px solid ${active?C.brand:C.border}`,
              background:active?C.brandLt:"#fff",
              color:active?C.brand:C.muted,
              fontSize:12, fontWeight:active?700:500,
              cursor:"pointer", fontFamily:"inherit",
              display:"flex", alignItems:"center", gap:6,
            }}>
              {s.l}
              <span style={{
                background:active?C.brand:C.surface,
                color:active?"#fff":C.muted,
                fontSize:10, fontWeight:700,
                padding:"1px 6px", borderRadius:10,
              }}>{s.count}</span>
            </button>
          );
        })}
      </div>

      {/* ── SEARCH + FILTERS ── */}
      <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px"}}>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
          {/* Search */}
          <div style={{flex:2,minWidth:200,position:"relative"}}>
            <label style={LBL}>Search</label>
            <span style={{position:"absolute",left:9,top:28,color:C.muted,fontSize:13}}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Request ID, title, destination, vehicle plate…"
              style={{...inp(),paddingLeft:28}}/>
          </div>
          {/* Type */}
          <div style={{minWidth:130}}>
            <label style={LBL}>Type</label>
            <select value={fType} onChange={e=>setFType(e.target.value)} style={inp()}>
              <option value="">All Types</option>
              <option value="pool_car">🚗 Pool Car</option>
              <option value="stationary">✏️ Stationery</option>
            </select>
          </div>
          {/* Date from */}
          <div style={{minWidth:130}}>
            <label style={LBL}>From Date</label>
            <input type="date" value={fFrom} onChange={e=>setFFrom(e.target.value)} style={inp()}/>
          </div>
          {/* Date to */}
          <div style={{minWidth:130}}>
            <label style={LBL}>To Date</label>
            <input type="date" value={fTo} onChange={e=>setFTo(e.target.value)} style={inp()}/>
          </div>
          {hasFilters&&(
            <div style={{alignSelf:"flex-end"}}>
              <button onClick={clearAll} style={{...btn("ghost"),color:C.red,borderColor:C.red+"30",fontSize:11,padding:"7px 12px"}}>✕ Clear</button>
            </div>
          )}
        </div>
        {hasFilters&&<div style={{fontSize:11,color:C.muted,marginTop:8}}>{shown.length} result{shown.length!==1?"s":""} found</div>}
      </div>

      {/* ── TABLE ── */}
      <div style={card(0)}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <TH cols={["Request ID","Type","Title / Details","Date Requested","Approved On","Resource","Status",""]}/>
          <tbody>
            {shown.length===0
              ?<tr><td colSpan={8}><Empty icon="📭" title={hasFilters?"No requests match your search":"No requests yet"} sub={hasFilters?"Try adjusting your filters":"Use the buttons above to raise a request"}/></td></tr>
              :shown.map((r,i)=>{
                const approvedAt = r.approved_at ? fmtD(r.approved_at) : (r.history||[]).find(h=>h.s==="approved")?.at ? fmtD((r.history||[]).find(h=>h.s==="approved").at) : "—";
                const veh = r.assigned_vehicle ? (vehicles||[]).find(v=>v.id===r.assigned_vehicle) : null;
                const itemsSummary = r.type!=="pool_car" && r.details?.items
                  ? (r.details.items||[]).map(it=>{ const inv=invItems.find(x=>x.id===it.id); return `${inv?.name||it.id} ×${it.qty}`; }).join(", ")
                  : r.details?.destination ? `→ ${r.details.destination}` : "";
                const resource = veh
                  ? `🚗 ${veh.plate}`
                  : r.type!=="pool_car" && (r.details?.items||[]).length>0
                    ? `📦 ${(r.details.items||[]).length} item${(r.details.items||[]).length>1?"s":""}`
                    : "—";
                return (
                <tr key={r.id} style={{borderBottom:i<shown.length-1?`1px solid #F8FAFC`:"none",cursor:"pointer"}}
                  onClick={()=>setDetail(r)}>
                  <td style={{padding:"11px 14px",fontSize:11,fontWeight:700,color:C.ink}}>{r.id}</td>
                  <td style={{padding:"11px 14px"}}>
                    <span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:4,
                      background:r.type==="pool_car"?C.brandLt:C.blueBg,
                      color:r.type==="pool_car"?C.brand:C.blue}}>
                      {r.type==="pool_car"?"🚗 Pool Car":"✏️ Stationery"}
                    </span>
                  </td>
                  <td style={{padding:"11px 14px",maxWidth:220}}>
                    <div style={{fontSize:13,color:C.ink,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.title}</div>
                    {itemsSummary&&<div style={{fontSize:10,color:C.muted,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{itemsSummary}</div>}
                  </td>
                  <td style={{padding:"11px 14px",fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>{fmtD(r.created_at)}</td>
                  <td style={{padding:"11px 14px",fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>{approvedAt}</td>
                  <td style={{padding:"11px 14px",fontSize:11,color:veh?C.green:C.muted,fontWeight:veh?600:400}}>{resource}</td>
                  <td style={{padding:"11px 14px"}}><RQChip s={r.status}/></td>
                  <td style={{padding:"11px 14px",color:C.muted,fontSize:16}}>›</td>
                </tr>
              )})}
          </tbody>
        </table>
        <div style={{padding:"8px 14px",borderTop:`1px solid #F8FAFC`,fontSize:11,color:C.muted}}>
          {shown.length} of {mine.length} requests
        </div>
      </div>

      {modal==="car"  &&<PoolCarForm  onClose={()=>setModal(null)} onSubmit={submitReq}/>}
      {modal==="stat" &&<StatForm     onClose={()=>setModal(null)} onSubmit={submitReq} invItems={invItems}/>}
      {detail&&<ReqDetail req={detail} onClose={()=>setDetail(null)} ctx={ctx}/>}
    </div>
  );
}

function PoolCarForm({onClose,onSubmit}){
  const [title,  setTitle]  = useState("");
  const [pickup, setPickup] = useState("");
  const [dest,   setDest]   = useState("");
  const [date,   setDate]   = useState("");
  const [start,  setStart]  = useState("09:00");
  const [end,    setEnd]    = useState("17:00");
  const [pax,    setPax]    = useState(1);
  const [purpose,setPurpose]= useState("");
  const [errs,   setErrs]   = useState({});

  const go=()=>{
    const er={};
    if(!title)  er.title="Required";
    if(!pickup) er.pickup="Required";
    if(!dest)   er.dest="Required";
    if(!date)   er.date="Required";
    if(!purpose)er.purpose="Required";
    setErrs(er);
    if(Object.keys(er).length) return;
    onSubmit({type:"pool_car",title,details:{pickup,destination:dest,date,start,end,passengers:pax,purpose}});
    onClose();
  };
  return (
    <Modal title="Pool Car Request" onClose={onClose} w={580}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={{gridColumn:"1/-1"}}>
          <label style={LBL}>Title{errs.title&&<span style={{color:C.red,fontWeight:400,textTransform:"none"}}> · {errs.title}</span>}</label>
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Client Visit – Victoria Island" style={inp(!!errs.title)}/>
        </div>
        <div>
          <label style={LBL}>Pickup Location{errs.pickup&&<span style={{color:C.red,fontWeight:400,textTransform:"none"}}> · {errs.pickup}</span>}</label>
          <input value={pickup} onChange={e=>setPickup(e.target.value)} placeholder="AP Head Office" style={inp(!!errs.pickup)}/>
        </div>
        <div>
          <label style={LBL}>Destination{errs.dest&&<span style={{color:C.red,fontWeight:400,textTransform:"none"}}> · {errs.dest}</span>}</label>
          <input value={dest} onChange={e=>setDest(e.target.value)} placeholder="Victoria Island Branch" style={inp(!!errs.dest)}/>
        </div>
        <div>
          <label style={LBL}>Date{errs.date&&<span style={{color:C.red,fontWeight:400,textTransform:"none"}}> · {errs.date}</span>}</label>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp(!!errs.date)}/>
        </div>
        <div style={{display:"flex",gap:8}}>
          <div style={{flex:1}}><label style={LBL}>Start Time</label><input type="time" value={start} onChange={e=>setStart(e.target.value)} style={inp()}/></div>
          <div style={{flex:1}}><label style={LBL}>End Time</label><input type="time" value={end} onChange={e=>setEnd(e.target.value)} style={inp()}/></div>
        </div>
        <div>
          <label style={LBL}>Passengers</label>
          <input type="number" min={1} max={6} value={pax} onChange={e=>setPax(+e.target.value)} style={inp()}/>
        </div>
        <div style={{gridColumn:"1/-1"}}>
          <label style={LBL}>Purpose{errs.purpose&&<span style={{color:C.red,fontWeight:400,textTransform:"none"}}> · {errs.purpose}</span>}</label>
          <textarea value={purpose} onChange={e=>setPurpose(e.target.value)} style={{...inp(),minHeight:68,resize:"vertical"}} placeholder="Business purpose for this trip..."/>
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:18,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
        <button onClick={onClose} style={btn("ghost")}>Cancel</button>
        <button onClick={go} style={btn("primary")}>Submit Request</button>
      </div>
    </Modal>
  );
}

function StatForm({onClose,onSubmit,invItems=[]}){
  const [title,setTitle]=useState("");
  const [items,setItems]=useState([{id:"",qty:1}]);
  const [urg,setUrg]=useState("normal");
  const [notes,setNotes]=useState("");
  const go=()=>{
    if(!title||items.some(i=>!i.id))return;
    onSubmit({type:"stationary",title,details:{items,urgency:urg,notes}});onClose();
  };
  return (
    <Modal title="Stationery Request" onClose={onClose} w={520}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div><label style={LBL}>Title</label><input value={title} onChange={e=>setTitle(e.target.value)} style={inp()} placeholder="e.g. Monthly Office Supplies"/></div>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <label style={{...LBL,marginBottom:0}}>Items</label>
            <button onClick={()=>setItems(p=>[...p,{id:"",qty:1}])} style={{...btn("ghost"),fontSize:11,padding:"3px 8px"}}>+ Add</button>
          </div>
          {items.map((it,i)=>(
            <div key={i} style={{display:"flex",gap:8,marginBottom:6}}>
              <select value={it.id} onChange={e=>setItems(p=>p.map((x,j)=>j===i?{...x,id:e.target.value}:x))} style={{...inp(),flex:2}}>
                <option value="">Select item…</option>
                {invItems.map(inv=><option key={inv.id} value={inv.id}>{inv.name} ({inv.stock} {inv.unit}s)</option>)}
              </select>
              <input type="number" min={1} value={it.qty} onChange={e=>setItems(p=>p.map((x,j)=>j===i?{...x,qty:+e.target.value}:x))} style={{...inp(),width:64}}/>
              {items.length>1&&<button onClick={()=>setItems(p=>p.filter((_,j)=>j!==i))} style={{...btn("ghost"),padding:"6px 9px",color:C.red}}>✕</button>}
            </div>
          ))}
        </div>
        <div><label style={LBL}>Urgency</label>
          <div style={{display:"flex",gap:8}}>
            {["low","normal","high"].map(u=>(
              <button key={u} onClick={()=>setUrg(u)} style={{flex:1,padding:8,fontFamily:"inherit",
                border:`1.5px solid ${urg===u?C.brand:C.border}`,borderRadius:6,
                background:urg===u?C.brandLt:"#fff",color:urg===u?C.brand:C.muted,
                fontSize:12,fontWeight:600,cursor:"pointer",textTransform:"capitalize"}}>{u}</button>
            ))}
          </div>
        </div>
        <div><label style={LBL}>Notes</label><textarea value={notes} onChange={e=>setNotes(e.target.value)} style={{...inp(),minHeight:56,resize:"vertical"}} placeholder="Additional notes…"/></div>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:18,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
        <button onClick={onClose} style={btn("ghost")}>Cancel</button>
        <button onClick={go}      style={{...btn("primary"),background:C.blue}}>Submit</button>
      </div>
    </Modal>
  );
}

function ReqDetail({req,onClose,ctx}){
  const {uid,transReq,me,invItems,users,vehicles=[],drivers=[]}=ctx;
  const [note,setNote]=useState("");
  const [tab,setTab]=useState("details");
  const canApprove  = me.role==="manager"       && req.status==="pending_approval";
  const canProcess  = me.role==="resource_team" && req.status==="approved";
  const canComplete = me.role==="resource_team" && req.status==="in_progress";

  const assignedVeh = req.assigned_vehicle ? (vehicles||[]).find(v=>v.id===req.assigned_vehicle) : null;
  const assignedDrv = req.assigned_driver  ? (drivers||[]).find(d=>d.id===req.assigned_driver)  : null;

  const renderDetails = () => {
    if(req.type==="pool_car"){
      const d = req.details||{};
      return (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[["Pickup",d.pickup],["Destination",d.destination],["Date",d.date],["Time",`${d.start||""} – ${d.end||""}`],["Passengers",d.passengers!=null?String(d.passengers):null],["Purpose",d.purpose]].map(([k,v])=>v!=null&&v!==""?(
            <div key={k} style={{background:C.pageBg,borderRadius:7,padding:"10px 12px",gridColumn:k==="Purpose"?"1/-1":"auto"}}>
              <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",marginBottom:3}}>{k}</div>
              <div style={{fontSize:13,color:C.ink,fontWeight:500}}>{String(v)}</div>
            </div>
          ):null)}
          {assignedVeh&&(
            <div style={{gridColumn:"1/-1",background:"#ECFDF5",border:"1px solid #059669",borderRadius:8,padding:12}}>
              <div style={{fontSize:11,fontWeight:700,color:"#059669",marginBottom:6}}>✅ Vehicle Assigned</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div><div style={{fontSize:10,color:"#059669",fontWeight:700,marginBottom:2}}>VEHICLE</div><div style={{fontSize:13,color:C.ink,fontWeight:600}}>{assignedVeh.plate} — {assignedVeh.model}</div></div>
                {assignedDrv&&<div><div style={{fontSize:10,color:"#059669",fontWeight:700,marginBottom:2}}>DRIVER</div><div style={{fontSize:13,color:C.ink,fontWeight:600}}>{assignedDrv.name} · {assignedDrv.phone}</div></div>}
              </div>
            </div>
          )}
        </div>
      );
    }
    // Stationery
    const d = req.details||{};
    const itemsList = (d.items||[]).map(it=>{ const inv=invItems.find(x=>x.id===it.id); return {name:inv?.name||it.id,qty:it.qty,unit:inv?.unit||"unit"}; });
    return (
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {d.urgency&&<div style={{background:C.pageBg,borderRadius:7,padding:"10px 12px"}}><div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",marginBottom:3}}>Urgency</div><div style={{fontSize:13,color:C.ink,fontWeight:500,textTransform:"capitalize"}}>{d.urgency}</div></div>}
        <div style={{background:C.pageBg,borderRadius:7,padding:"10px 12px"}}>
          <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>Items Requested</div>
          {itemsList.map((it,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:i<itemsList.length-1?`1px solid ${C.border}`:"none"}}>
              <span style={{fontSize:13,color:C.ink}}>{it.name}</span>
              <span style={{fontSize:12,fontWeight:700,color:C.ink}}>{it.qty} {it.unit}s</span>
            </div>
          ))}
        </div>
        {d.notes&&<div style={{background:C.pageBg,borderRadius:7,padding:"10px 12px"}}><div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",marginBottom:3}}>Notes</div><div style={{fontSize:13,color:C.ink}}>{d.notes}</div></div>}
      </div>
    );
  };

  return (
    <Modal title={req.id} sub={req.title} onClose={onClose} w={700}>
      {/* Status bar */}
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:16,padding:"10px 12px",background:C.pageBg,borderRadius:8}}>
        <RQChip s={req.status}/>
        <span style={{fontSize:11,color:C.muted}}>Submitted {fmtD(req.created_at)}</span>
        {req.approved_at&&<span style={{fontSize:11,color:C.muted}}>· Approved {fmtD(req.approved_at)}</span>}
        {req.delivered_at&&<span style={{fontSize:11,color:"#059669",fontWeight:600}}>· Delivered {fmtD(req.delivered_at)}</span>}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:0,borderBottom:`1px solid ${C.border}`,marginBottom:16}}>
        {["details","timeline"].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:"8px 16px",border:"none",borderBottom:`2px solid ${tab===t?C.brand:"transparent"}`,background:"transparent",fontSize:12,fontWeight:tab===t?700:500,color:tab===t?C.brand:C.muted,cursor:"pointer",fontFamily:"inherit",textTransform:"capitalize"}}>{t}</button>
        ))}
      </div>

      {tab==="details" && renderDetails()}

      {tab==="timeline"&&(
        <div style={{position:"relative",paddingLeft:20}}>
          <div style={{position:"absolute",left:7,top:6,bottom:6,width:2,background:C.border}}/>
          {(req.history||[]).map((h,i)=>{
            const m=REQ_STATUS[h.s]||{color:C.muted};
            return (
              <div key={i} style={{position:"relative",marginBottom:14}}>
                <div style={{position:"absolute",left:-17,width:10,height:10,borderRadius:"50%",background:m.color,border:"2px solid #fff",top:2}}/>
                <div style={{fontSize:11,fontWeight:600,color:m.color,textTransform:"capitalize"}}>{h.s.replace(/_/g," ")}</div>
                <div style={{fontSize:10,color:C.muted}}>{fmtDT(h.at)} · {users[h.by]?.name||"System"}</div>
                {h.note&&<div style={{fontSize:11,color:C.ink2,marginTop:2,fontStyle:"italic"}}>"{h.note}"</div>}
              </div>
            );
          })}
        </div>
      )}

      {(canApprove||canProcess||canComplete)&&(
        <div style={{marginTop:14}}>
          <label style={LBL}>Comment (optional)</label>
          <textarea value={note} onChange={e=>setNote(e.target.value)} style={{...inp(),minHeight:52,resize:"vertical"}} placeholder="Add a note…"/>
        </div>
      )}

      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:18,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
        {canApprove&&<><button onClick={()=>{transReq(req.id,"rejected",note);onClose()}} style={btn("ghost")}>Reject</button>
          <button onClick={()=>{transReq(req.id,"approved",note);onClose()}} style={btn("success")}>✓ Approve</button></>}
        {canProcess&&<button onClick={()=>{transReq(req.id,"in_progress");onClose()}} style={btn("primary")}>▶ Process</button>}
        {canComplete&&<button onClick={()=>{transReq(req.id,"completed");onClose()}} style={btn("success")}>✓ Mark Complete</button>}
        <button onClick={onClose} style={btn("ghost")}>Close</button>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════
// APPROVALS (Manager)
// ══════════════════════════════════════════════════════════════
function Approvals({ctx}){
  const {uid,reqs,transReq,users}=ctx;
  const [detail,setDetail]=useState(null);
  const queue = reqs.filter(r=>r.status==="pending_approval"&&r.approver_id===uid);
  const done  = reqs.filter(r=>["approved","rejected"].includes(r.status)&&r.approver_id===uid);
  return (
    <div>
      <PageTitle title="Facility Approvals" sub="Review and action pending requests"/>
      {[{title:`Pending Approval (${queue.length})`,rows:queue,pending:true},
        {title:`Actioned (${done.length})`,rows:done,pending:false}].map(({title,rows,pending})=>(
        <div key={title} style={{...card(0),marginBottom:16}}>
          <div style={{padding:"13px 16px",borderBottom:`1px solid ${C.border}`,fontSize:13,fontWeight:700,color:C.ink}}>{title}</div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <TH cols={["ID","Type","Title","Requested By","Date","Status",""]}/>
            <tbody>
              {rows.length===0?<tr><td colSpan={7}><Empty icon="🎉" title={pending?"All caught up!":"No actioned requests yet"}/></td></tr>
              :rows.map((r,i)=>(
                <tr key={r.id} style={{borderBottom:i<rows.length-1?`1px solid #FAFAFA`:"none"}}>
                  <td style={{padding:"11px 14px",fontSize:11,fontWeight:700}}>{r.id}</td>
                  <td style={{padding:"11px 14px"}}><span style={{fontSize:11,fontWeight:600,padding:"2px 7px",borderRadius:4,background:r.type==="pool_car"?C.brandLt:C.blueBg,color:r.type==="pool_car"?C.brand:C.blue}}>{r.type==="pool_car"?"Pool Car":"Stationery"}</span></td>
                  <td style={{padding:"11px 14px",fontSize:12,color:C.ink}}>{r.title}</td>
                  <td style={{padding:"11px 14px",fontSize:12,color:C.muted}}>{users[r.submitted_by]?.name}</td>
                  <td style={{padding:"11px 14px",fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>{fmtD(r.created_at)}</td>
                  <td style={{padding:"11px 14px"}}><RQChip s={r.status}/></td>
                  <td style={{padding:"11px 14px"}}>
                    {pending
                      ?<div style={{display:"flex",gap:5}}>
                        <button onClick={()=>setDetail(r)} style={{...btn("ghost"),fontSize:11,padding:"4px 9px"}}>View</button>
                        <button onClick={()=>transReq(r.id,"rejected")} style={{...btn("ghost"),fontSize:11,padding:"4px 9px",color:C.red,borderColor:C.red+"30"}}>Reject</button>
                        <button onClick={()=>transReq(r.id,"approved")} style={{...btn("success"),fontSize:11,padding:"4px 9px"}}>Approve</button>
                       </div>
                      :<button onClick={()=>setDetail(r)} style={{...btn("ghost"),fontSize:11,padding:"4px 9px"}}>View</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {detail&&<ReqDetail req={detail} onClose={()=>setDetail(null)} ctx={ctx}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// QUEUE (Resource Team)
// ══════════════════════════════════════════════════════════════
function Queue({ctx}){
  const {reqs,transReq}=ctx;
  const [detail,setDetail]=useState(null);
  const [f,setF]=useState({});
  const queue=reqs.filter(r=>["approved","in_progress"].includes(r.status));
  const shown=queue.filter(r=>{if(f.type&&r.type!==f.type)return false;return true;});
  return (
    <div>
      <PageTitle title="Processing Queue" sub="Fulfil approved facility requests"/>
      <Filters values={f} onChange={setF} fields={[
        {k:"type",label:"Type",type:"select",w:140,opts:[{v:"pool_car",l:"Pool Car"},{v:"stationary",l:"Stationery"}]},
      ]}/>
      <div style={card(0)}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <TH cols={["ID","Type","Title","Requested By","Status","Action"]}/>
          <tbody>
            {shown.length===0?<tr><td colSpan={6}><Empty icon="✅" title="Queue is empty"/></td></tr>
            :shown.map((r,i)=>(
              <tr key={r.id} style={{borderBottom:i<shown.length-1?`1px solid #FAFAFA`:"none"}}>
                <td style={{padding:"11px 14px",fontSize:11,fontWeight:700}}>{r.id}</td>
                <td style={{padding:"11px 14px"}}><span style={{fontSize:11,fontWeight:600,padding:"2px 7px",borderRadius:4,background:r.type==="pool_car"?C.brandLt:C.blueBg,color:r.type==="pool_car"?C.brand:C.blue}}>{r.type==="pool_car"?"Pool Car":"Stationery"}</span></td>
                <td style={{padding:"11px 14px",fontSize:12,color:C.ink}}>{r.title}</td>
                <td style={{padding:"11px 14px",fontSize:12,color:C.muted}}>{users[r.submitted_by]?.name}</td>
                <td style={{padding:"11px 14px"}}><RQChip s={r.status}/></td>
                <td style={{padding:"11px 14px"}}>
                  <div style={{display:"flex",gap:5}}>
                    <button onClick={()=>setDetail(r)} style={{...btn("ghost"),fontSize:11,padding:"4px 9px"}}>View</button>
                    {r.status==="approved"    &&<button onClick={()=>transReq(r.id,"in_progress")} style={{...btn("primary"),fontSize:11,padding:"4px 9px"}}>▶ Process</button>}
                    {r.status==="in_progress" &&<button onClick={()=>transReq(r.id,"completed")}  style={{...btn("success"),fontSize:11,padding:"4px 9px"}}>✓ Complete</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {detail&&<ReqDetail req={detail} onClose={()=>setDetail(null)} ctx={ctx}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// CHANGE REQUESTS PAGE
// ══════════════════════════════════════════════════════════════
function ChangePage({ctx}){
  const {crs,submitCR,users}=ctx;
  const [form,  setForm]  = useState(false);
  const [detail,setDetail]= useState(null);
  const [f,     setF]     = useState({});

  const shown = crs.filter(c=>{
    if(f.status&&c.status!==f.status)return false;
    if(f.changeType&&c.change_type!==f.changeType)return false;
    if(f.environment&&c.environment!==f.environment)return false;
    if(f.initiator&&c.initiator!==f.initiator)return false;
    if(f.from&&c.created_at<f.from)return false;
    if(f.to&&c.created_at>f.to+"T23:59:59")return false;
    if(f.q){const q=f.q.toLowerCase();if(!c.title.toLowerCase().includes(q)&&!c.id.toLowerCase().includes(q))return false;}
    return true;
  });

  return (
    <div>
      <PageTitle title="Change Requests" sub="Manage all IT and infrastructure change requests"
        action={<button onClick={()=>setForm(true)} style={btn("primary")}>+ Raise Change Request</button>}/>
      <Filters values={f} onChange={setF} fields={[
        {k:"q",         label:"Search",      type:"text",   w:180, ph:"CR ID or title…"},
        {k:"status",    label:"Status",      type:"select", w:160, opts:Object.entries(CR_STATUS).map(([v,m])=>({v,l:m.label}))},
        {k:"changeType",label:"Type",        type:"select", w:130, opts:["Standard","Normal","Emergency"].map(v=>({v,l:v}))},
        {k:"environment",label:"Environment",type:"select", w:130, opts:["Dev","Staging","Production"].map(v=>({v,l:v}))},
        {k:"initiator", label:"Requester",   type:"select", w:160, opts:Object.values(USERS).map(u=>({v:u.id,l:u.name}))},
        {k:"from",      label:"From",        type:"date",   w:140},
        {k:"to",        label:"To",          type:"date",   w:140},
      ]}/>
      <div style={card(0)}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <TH cols={["Change ID","Title","Raised","Last Updated","Requested By","Environment","Stage","Status",""]}/>
          <tbody>
            {shown.length===0
              ?<tr><td colSpan={9}><Empty icon="🔍" title="No results" sub="Adjust your filters or raise a new CR"/></td></tr>
              :shown.map((c,i)=>(
              <tr key={c.id} style={{borderBottom:i<shown.length-1?`1px solid #FAFAFA`:"none",cursor:"pointer"}}
                onClick={()=>setDetail(c)}>
                <td style={{padding:"11px 14px",fontSize:11,fontWeight:700,color:C.ink,whiteSpace:"nowrap"}}>{c.id}</td>
                <td style={{padding:"11px 14px",fontSize:12,color:C.ink,maxWidth:200}}>
                  <div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {c.is_emergency&&<span style={{color:C.red,marginRight:4,fontSize:11}}>⚡</span>}{c.title}
                  </div>
                </td>
                <td style={{padding:"11px 14px",fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>{fmtD(c.created_at)}</td>
                <td style={{padding:"11px 14px",fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>{fmtD(c.updated_at)}</td>
                <td style={{padding:"11px 14px",fontSize:11,color:C.muted}}>{users[c.initiator]?.name}</td>
                <td style={{padding:"11px 14px"}}><EnvTag e={c.environment}/></td>
                <td style={{padding:"11px 14px",fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>
                  {(c.stages||[]).filter(s=>s.status==="approved").length}/{(c.stages||[]).length}
                </td>
                <td style={{padding:"11px 14px"}}><CRChip s={c.status}/></td>
                <td style={{padding:"11px 14px",color:C.muted,fontSize:16}}>›</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{padding:"9px 14px",borderTop:`1px solid #FAFAFA`,fontSize:11,color:C.muted}}>
          {shown.length} of {crs.length} records
        </div>
      </div>
      {form&&<CRForm onClose={()=>setForm(false)} onSubmit={submitCR}/>}
      {detail&&<CRDetail cr={detail} onClose={()=>setDetail(null)} ctx={ctx}/>}
    </div>
  );
}

// ── CR Form ────────────────────────────────────────────────────
function CRForm({onClose,onSubmit}){
  const [step,setStep]=useState(1);
  const [d,setD]=useState({title:"",desc:"",system:"",environment:"Staging",deployDate:"",deployStart:"22:00",deployEnd:"02:00",changeType:"Normal",riskLevel:"Medium",category:"Infrastructure",rollback:"",testEvidence:""});
  const [e,setE]=useState({});
  const s=(k,v)=>setD(p=>({...p,[k]:v}));
  const v1=()=>{const er={};if(!d.title)er.title="Required";if(!d.desc)er.desc="Required";if(!d.system)er.system="Required";if(!d.deployDate)er.deployDate="Required";setE(er);return!Object.keys(er).length;};
  const v2=()=>{const er={};if(!d.rollback)er.rollback="Required";if(!d.testEvidence)er.testEvidence="Required";setE(er);return!Object.keys(er).length;};

  const STEPS=["Request Details","Risk & Rollback","Review & Submit"];
  const Sel=({label,k,opts})=>(
    <div><label style={LBL}>{label}</label>
      <select value={d[k]} onChange={ev=>s(k,ev.target.value)} style={inp()}>{opts.map(o=><option key={o} value={o}>{o}</option>)}</select>
    </div>
  );
  const Txt=({label,k,ph,ta,span})=>(
    <div style={span?{gridColumn:"1/-1"}:{}}>
      <label style={LBL}>{label}{e[k]&&<span style={{color:C.red,fontWeight:400,textTransform:"none"}}> · {e[k]}</span>}</label>
      {ta?<textarea value={d[k]} onChange={ev=>s(k,ev.target.value)} style={{...inp(!!e[k]),minHeight:78,resize:"vertical"}} placeholder={ph}/>
         :<input value={d[k]} onChange={ev=>s(k,ev.target.value)} style={inp(!!e[k])} placeholder={ph}/>}
    </div>
  );

  return (
    <Modal title="Raise Change Request" sub={`Step ${step} of 3 — ${STEPS[step-1]}`} onClose={onClose} w={700}>
      {/* Progress */}
      <div style={{display:"flex",gap:0,marginBottom:22}}>
        {STEPS.map((sl,i)=>(
          <div key={i} style={{flex:1,display:"flex",alignItems:"center",flexDirection:"column",gap:5}}>
            <div style={{width:26,height:26,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:11,fontWeight:700,
              background:step>i+1?C.green:step===i+1?C.brand:C.border,
              color:step>=i+1?"#fff":C.muted}}>
              {step>i+1?"✓":i+1}
            </div>
            <div style={{fontSize:10,fontWeight:600,color:step===i+1?C.ink:C.muted,textAlign:"center"}}>{sl}</div>
          </div>
        ))}
      </div>

      {step===1&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <Txt label="Change Title" k="title" ph="e.g. Azure API Gateway v2 Upgrade" span/>
          <div style={{gridColumn:"1/-1"}}>
            <label style={LBL}>Change Type</label>
            <div style={{display:"flex",gap:10}}>
              {[{v:"Standard",icon:"⬡",desc:"Pre-approved, low risk"},{v:"Normal",icon:"◈",desc:"Full approval workflow"},{v:"Emergency",icon:"⚡",desc:"Bypass L2 — senior only"}].map(t=>{
                const a=d.changeType===t.v;
                const tc={Standard:C.blue,Normal:C.violet,Emergency:C.red}[t.v];
                return <button key={t.v} onClick={()=>s("changeType",t.v)} style={{flex:1,padding:"11px 8px",
                  border:`1.5px solid ${a?tc:C.border}`,borderRadius:8,
                  background:a?tc+"0D":"#fff",cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>
                  <div style={{fontSize:18,marginBottom:3}}>{t.icon}</div>
                  <div style={{fontSize:12,fontWeight:700,color:a?tc:C.ink2}}>{t.v}</div>
                  <div style={{fontSize:10,color:C.muted,marginTop:1}}>{t.desc}</div>
                </button>;
              })}
            </div>
          </div>
          <Sel label="Environment" k="environment" opts={["Dev","Staging","Production"]}/>
          <Sel label="Risk Level"  k="riskLevel"   opts={["Low","Medium","High"]}/>
          <Sel label="Category"    k="category"    opts={["Infrastructure","Application","Security","Database","Network","Compliance"]}/>
          <Txt label="System / Service" k="system" ph="e.g. Azure API Gateway"/>
          <Txt label="Description" k="desc" ph="What will be changed and why…" ta span/>
          <Txt label="Deployment Date" k="deployDate" ph="" span={false}/>
          <div style={{display:"flex",gap:8}}>
            <div style={{flex:1}}><label style={LBL}>Start</label><input type="time" value={d.deployStart} onChange={e=>s("deployStart",e.target.value)} style={inp()}/></div>
            <div style={{flex:1}}><label style={LBL}>End</label><input type="time" value={d.deployEnd} onChange={e=>s("deployEnd",e.target.value)} style={inp()}/></div>
          </div>
        </div>
      )}
      {step===2&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Txt label="Rollback Plan" k="rollback" ph="How to revert if something goes wrong. Include estimated time…" ta/>
          <Txt label="Testing Evidence" k="testEvidence" ph="UAT results, staging tests, performance benchmarks…" ta/>
          <div style={{padding:"11px 14px",borderRadius:7,fontSize:12,fontWeight:600,
            background:d.riskLevel==="High"?C.redBg:d.riskLevel==="Medium"?C.amberBg:C.greenBg,
            color:d.riskLevel==="High"?C.red:d.riskLevel==="Medium"?C.amber:C.green}}>
            {d.riskLevel} Risk · {d.changeType==="Emergency"?"Emergency senior approval only":"Line Manager → Secondary Manager → Change Review Board"}
          </div>
          <div style={{border:`2px dashed ${C.border}`,borderRadius:7,padding:18,textAlign:"center",color:C.muted,fontSize:12}}>
            📎 Attach deployment plans, diagrams, and evidence (file storage connects in production)
          </div>
        </div>
      )}
      {step===3&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:C.pageBg,borderRadius:8,padding:16}}>
            <div style={{fontSize:13,fontWeight:700,color:C.ink,marginBottom:12}}>Review Summary</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[["Title",d.title],["System",d.system],["Environment",d.environment],["Type",d.changeType],["Risk",d.riskLevel],["Category",d.category],["Deploy Date",d.deployDate],["Window",`${d.deployStart}–${d.deployEnd}`]].map(([k,v])=>(
                <div key={k} style={{background:"#fff",padding:"8px 11px",borderRadius:6,border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:10,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em"}}>{k}</div>
                  <div style={{fontSize:12,fontWeight:600,color:C.ink,marginTop:2}}>{v||"—"}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{padding:"10px 13px",borderRadius:7,fontSize:12,background:C.violetBg,color:C.violet,fontWeight:600}}>
            Approval route: {d.changeType==="Emergency"?"Emergency → Senior Approval → Scheduled":"Draft → L1 → L2 → Change Review → Scheduled"}
          </div>
        </div>
      )}

      <div style={{display:"flex",justifyContent:"space-between",marginTop:20,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
        <button onClick={step>1?()=>setStep(p=>p-1):onClose} style={btn("ghost")}>{step>1?"← Back":"Cancel"}</button>
        {step<3
          ?<button onClick={()=>{if(step===1&&!v1())return;if(step===2&&!v2())return;setE({});setStep(p=>p+1)}} style={btn("primary")}>Next →</button>
          :<button onClick={()=>{onSubmit(d);onClose()}} style={btn("primary")}>Submit CR ✓</button>}
      </div>
    </Modal>
  );
}

// ── CR Detail Modal ────────────────────────────────────────────
function CRDetail({cr,onClose,ctx}){
  const {me,uid,transCR,flash,users}=ctx;
  const [tab,  setTab]  = useState("details");
  const [note, setNote] = useState("");
  const [impl, setImpl] = useState(cr.implementationNotes||"");
  const [out,  setOut]  = useState(cr.reviewOutcome||"");
  const [les,  setLes]  = useState(cr.lessonsLearned||"");

  const isMgr = ["manager","resource_team"].includes(me.role);
  const canL1  = isMgr && cr.status==="pending_line_manager";
  const canL2  = isMgr && cr.status==="pending_secondary";
  const canRev = me.role==="resource_team" && cr.status==="change_review";
  const canSt  = me.role==="resource_team" && cr.status==="scheduled";
  const canCmp = me.role==="resource_team" && cr.status==="in_progress";
  const canPR  = isMgr && cr.status==="completed";
  const canCls = isMgr && cr.status==="post_review";

  const TABS=["details","approvals","history","attachments","comments"];

  const fileIcon=e=>({pdf:"📄",img:"🖼️",doc:"📝",code:"📋"}[e]||"📎");

  return (
    <Modal title={cr.id} sub={cr.title} onClose={onClose} w={820}>
      {/* Banner */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16,padding:"10px 12px",
        background:cr.isEmergency?C.redBg:C.pageBg,borderRadius:8,
        border:`1px solid ${cr.isEmergency?"#FCA5A5":C.border}`}}>
        {cr.isEmergency&&<span style={{fontSize:11,fontWeight:700,color:C.red,background:"#fff",padding:"2px 7px",borderRadius:4,border:`1px solid ${C.red}30`}}>⚡ EMERGENCY</span>}
        <CRChip s={cr.status}/>
        <span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:4,background:"#fff",border:`1px solid ${C.border}`,color:C.muted}}>{cr.changeType}</span>
        <EnvTag e={cr.environment}/>
        <RiskTag r={cr.riskLevel}/>
        <span style={{fontSize:11,padding:"2px 8px",borderRadius:4,background:"#fff",border:`1px solid ${C.border}`,color:C.muted}}>🖥 {cr.system}</span>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,marginBottom:18}}>
        {TABS.map(t=>{
          const cnt=t==="attachments"?cr.attachments?.length:t==="comments"?cr.comments?.length:null;
          return (
            <button key={t} onClick={()=>setTab(t)} style={{padding:"7px 15px",border:"none",cursor:"pointer",
              fontFamily:"inherit",fontSize:12,fontWeight:tab===t?700:500,
              background:"transparent",color:tab===t?C.brand:C.muted,
              borderBottom:tab===t?`2px solid ${C.brand}`:"2px solid transparent",
              marginBottom:-1,textTransform:"capitalize",display:"flex",gap:4,alignItems:"center"}}>
              {t.replace("_"," ")}
              {cnt>0&&<span style={{background:C.brandLt,color:C.brand,borderRadius:10,padding:"0 5px",fontSize:10}}>{cnt}</span>}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab==="details"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div style={{gridColumn:"1/-1"}}>
            <label style={LBL}>Description</label>
            <div style={{background:C.pageBg,borderRadius:7,padding:"11px 13px",fontSize:13,color:C.ink2,lineHeight:1.6}}>{cr.description}</div>
          </div>
          <div>
            <label style={LBL}>Deployment Window</label>
            <div style={{background:C.pageBg,borderRadius:7,padding:"11px 13px"}}>
              <div style={{fontSize:14,fontWeight:700,color:C.ink}}>{fmtD(cr.deployDate+"T12:00:00")}</div>
              <div style={{fontSize:12,color:C.muted,marginTop:2}}>{cr.deployStart} – {cr.deployEnd}</div>
            </div>
          </div>
          <div>
            <label style={LBL}>Initiated By</label>
            <div style={{background:C.pageBg,borderRadius:7,padding:"11px 13px",display:"flex",gap:9,alignItems:"center"}}>
              <Av i={users[cr.initiator]?.initials||"??"} s={28}/>
              <div><div style={{fontSize:12,fontWeight:600,color:C.ink}}>{users[cr.initiator]?.name}</div><div style={{fontSize:11,color:C.muted}}>{users[cr.initiator]?.dept}</div></div>
            </div>
          </div>
          <div>
            <label style={LBL}>Rollback Plan</label>
            <div style={{background:C.pageBg,borderRadius:7,padding:"11px 13px",fontSize:12,color:C.ink2,lineHeight:1.5}}>{cr.rollback||"—"}</div>
          </div>
          <div>
            <label style={LBL}>Testing Evidence</label>
            <div style={{background:C.pageBg,borderRadius:7,padding:"11px 13px",fontSize:12,color:C.ink2,lineHeight:1.5}}>{cr.testEvidence||"—"}</div>
          </div>
          {canCmp&&(
            <div style={{gridColumn:"1/-1"}}>
              <label style={LBL}>Implementation Notes</label>
              <textarea value={impl} onChange={e=>setImpl(e.target.value)} style={{...inp(),minHeight:80,resize:"vertical"}} placeholder="Log deployment steps, observations, issues…"/>
            </div>
          )}
        </div>
      )}

      {tab==="approvals"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {(cr.stages||[]).map((st,i)=>(
            <div key={i} style={{display:"flex",gap:12,alignItems:"center",padding:"13px 14px",
              background:C.pageBg,borderRadius:8,
              border:`1px solid ${st.status==="approved"?C.green+"40":st.status==="rejected"?C.red+"40":C.border}`}}>
              <div style={{width:28,height:28,borderRadius:"50%",flexShrink:0,
                background:st.status==="approved"?C.greenBg:st.status==="rejected"?C.redBg:"#fff",
                border:`2px solid ${st.status==="approved"?C.green:st.status==="rejected"?C.red:C.borderDk}`,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>
                {st.status==="approved"?"✓":st.status==="rejected"?"✕":st.n}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:C.ink}}>Stage {st.n}: {st.role}</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>{users[st.by]?.name}</div>
                {st.at&&<div style={{fontSize:10,color:C.muted}}>{fmtDT(st.at)}</div>}
              </div>
              <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,
                background:st.status==="approved"?C.greenBg:st.status==="rejected"?C.redBg:"#fff",
                color:st.status==="approved"?C.green:st.status==="rejected"?C.red:C.muted,
                border:`1px solid ${st.status==="approved"?C.green+"30":st.status==="rejected"?C.red+"30":C.border}`}}>
                {st.status==="approved"?"Approved":st.status==="rejected"?"Rejected":"Pending"}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab==="history"&&(
        <div style={{position:"relative",paddingLeft:22}}>
          <div style={{position:"absolute",left:8,top:6,bottom:6,width:2,background:C.border}}/>
          {cr.history.map((h,i)=>{
            const m=CR_STATUS[h.s]||{color:C.muted,dot:"#CBD5E1"};
            return (
              <div key={i} style={{position:"relative",marginBottom:16}}>
                <div style={{position:"absolute",left:-18,width:10,height:10,borderRadius:"50%",
                  background:m.dot,border:"2px solid #fff",top:3}}/>
                <div style={{fontSize:12,fontWeight:700,color:m.color}}>{h.label||h.s}</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>{fmtDT(h.at)} · {users[h.by]?.name||h.by}</div>
                {h.note&&<div style={{marginTop:4,padding:"6px 10px",background:C.pageBg,borderRadius:5,fontSize:11,color:C.ink2,fontStyle:"italic"}}>"{h.note}"</div>}
              </div>
            );
          })}
        </div>
      )}

      {tab==="attachments"&&(
        <div>
          {(!cr.attachments||cr.attachments.length===0)
            ?<Empty icon="📎" title="No attachments" sub="Attachments added during submission appear here"/>
            :<div style={{display:"flex",flexDirection:"column",gap:8}}>
              {cr.attachments.map((a,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 13px",
                  background:C.pageBg,borderRadius:8,border:`1px solid ${C.border}`}}>
                  <span style={{fontSize:22}}>{fileIcon(a.ext)}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:C.ink}}>{a.name}</div>
                    <div style={{fontSize:11,color:C.muted,marginTop:1}}>{a.size}</div>
                  </div>
                  <button onClick={()=>flash("Download started","success")} style={{...btn("ghost"),fontSize:11,padding:"5px 10px"}}>⬇ Download</button>
                </div>
              ))}
            </div>}
          {isMgr&&(
            <div style={{marginTop:14,padding:"11px 14px",borderRadius:8,background:C.blueBg,
              border:`1px solid ${C.blue}30`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:12,color:C.blue,fontWeight:600}}>📧 Send reminder to all approvers and requester</span>
              <button onClick={()=>flash("Reminder emails sent to all stakeholders")} style={{...btn("primary"),background:C.blue,fontSize:11,padding:"5px 12px"}}>Send Reminder</button>
            </div>
          )}
        </div>
      )}

      {tab==="comments"&&(
        <div>
          {(cr.comments||[]).length===0?<Empty icon="💬" title="No comments yet"/>
          :(cr.comments||[]).map((c,i)=>(
            <div key={i} style={{marginBottom:10,padding:"11px 13px",background:C.pageBg,borderRadius:8}}>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
                <Av i={users[c.by]?.initials||"??"} s={24}/>
                <span style={{fontSize:12,fontWeight:600,color:C.ink}}>{users[c.by]?.name}</span>
                <span style={{fontSize:10,color:C.muted}}>{fmtDT(c.at)}</span>
              </div>
              <div style={{fontSize:12,color:C.ink2,lineHeight:1.5}}>{c.text}</div>
            </div>
          ))}
        </div>
      )}

      {/* Approval comment */}
      {(canL1||canL2||canRev)&&(
        <div style={{marginTop:16}}>
          <label style={LBL}>Approval Comment (optional)</label>
          <textarea value={note} onChange={e=>setNote(e.target.value)} style={{...inp(),minHeight:56,resize:"vertical"}} placeholder="Add a note to this decision…"/>
        </div>
      )}
      {canPR&&(
        <div style={{marginTop:16,display:"flex",flexDirection:"column",gap:10}}>
          <div><label style={LBL}>Review Outcome</label>
            <div style={{display:"flex",gap:10}}>
              {["successful","failed"].map(o=>(
                <button key={o} onClick={()=>setOut(o)} style={{flex:1,padding:10,fontFamily:"inherit",
                  border:`1.5px solid ${out===o?(o==="successful"?C.green:C.red):C.border}`,borderRadius:7,
                  background:out===o?(o==="successful"?C.greenBg:C.redBg):"#fff",
                  cursor:"pointer",fontSize:12,fontWeight:600,
                  color:out===o?(o==="successful"?C.green:C.red):C.muted}}>
                  {o==="successful"?"✓ Successful":"✕ Failed"}
                </button>
              ))}
            </div>
          </div>
          <div><label style={LBL}>Lessons Learned</label>
            <textarea value={les} onChange={e=>setLes(e.target.value)} style={{...inp(),minHeight:60,resize:"vertical"}} placeholder="What could be improved next time?"/>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:18,paddingTop:16,borderTop:`1px solid ${C.border}`,flexWrap:"wrap"}}>
        {canL1&&<><button onClick={()=>{transCR(cr.id,"rejected",note);onClose()}} style={btn("ghost")}>Reject</button><button onClick={()=>{transCR(cr.id,cr.isEmergency?"scheduled":"pending_secondary",note||"L1 approved");onClose()}} style={btn("success")}>✓ {cr.isEmergency?"Emergency Approve":"L1 Approve"}</button></>}
        {canL2&&<><button onClick={()=>{transCR(cr.id,"rejected",note);onClose()}} style={btn("ghost")}>Reject</button><button onClick={()=>{transCR(cr.id,"change_review",note||"L2 approved");onClose()}} style={btn("success")}>✓ L2 Approve</button></>}
        {canRev&&<><button onClick={()=>{transCR(cr.id,"pending_line_manager",note||"Sent back");onClose()}} style={btn("ghost")}>↩ Send Back</button><button onClick={()=>{transCR(cr.id,"scheduled",note||"Approved for scheduling");onClose()}} style={btn("violet")}>📅 Schedule</button></>}
        {canSt &&<button onClick={()=>{transCR(cr.id,"in_progress","Deployment started");onClose()}} style={btn("primary")}>▶ Start</button>}
        {canCmp&&<button onClick={()=>{transCR(cr.id,"completed","Completed",{implementationNotes:impl,completedAt:new Date().toISOString()});onClose()}} style={btn("success")}>✓ Complete</button>}
        {canPR&&out&&<button onClick={()=>{transCR(cr.id,"post_review","Post-review submitted",{reviewOutcome:out,lessonsLearned:les});onClose()}} style={btn("violet")}>Submit Review</button>}
        {canCls&&<button onClick={()=>{transCR(cr.id,"closed",note||"Closed");onClose()}} style={btn("success")}>🔒 Close CR</button>}
        <button onClick={onClose} style={btn("ghost")}>Close</button>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════
// CALENDAR
// ══════════════════════════════════════════════════════════════
function CalendarPage({ctx}){
  const {crs}=ctx;
  const [detail,setDetail]=useState(null);
  const [risk,setRisk]=useState("all");
  const relevant=crs.filter(c=>["scheduled","in_progress","completed"].includes(c.status)&&(risk==="all"||c.risk_level===risk));
  const byDate=useMemo(()=>{
    const m={};relevant.forEach(c=>{if(!m[c.deploy_date])m[c.deploy_date]=[];m[c.deploy_date].push(c);});
    return Object.entries(m).sort(([a],[b])=>a.localeCompare(b));
  },[relevant]);
  const rc=r=>r==="High"?C.red:r==="Medium"?C.amber:C.green;
  return (
    <div>
      <PageTitle title="Change Calendar" sub="Scheduled deployments and maintenance windows"/>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {["all","High","Medium","Low"].map(r=>(
          <button key={r} onClick={()=>setRisk(r)} style={{padding:"5px 13px",borderRadius:20,cursor:"pointer",fontFamily:"inherit",
            border:`1.5px solid ${risk===r?(r==="all"?C.brand:rc(r)):C.border}`,
            background:risk===r?(r==="all"?C.brandLt:rc(r)+"14"):"transparent",
            color:risk===r?(r==="all"?C.brand:rc(r)):C.muted,
            fontSize:11,fontWeight:600}}>
            {r==="all"?"All Risk":r}
          </button>
        ))}
      </div>
      {byDate.length===0?<div style={{...card(40),textAlign:"center",color:C.muted}}>No scheduled changes found</div>
      :byDate.map(([date,items])=>(
        <div key={date} style={{marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,fontSize:12,fontWeight:700,color:C.muted}}>
            <div style={{flex:1,height:1,background:C.border}}/>
            📅 {fmtD(date+"T12:00:00")}
            <div style={{flex:1,height:1,background:C.border}}/>
          </div>
          {items.map(c=>(
            <div key={c.id} onClick={()=>setDetail(c)} style={{...card(14),marginBottom:8,cursor:"pointer",borderLeft:`3px solid ${c.is_emergency?C.red:rc(c.risk_level)}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {c.is_emergency&&<span style={{color:C.red,marginRight:4}}>⚡</span>}{c.title}
                  </div>
                  <div style={{display:"flex",gap:10,marginTop:4,fontSize:11,color:C.muted,flexWrap:"wrap"}}>
                    <span>{c.id}</span><span>·</span><span>{c.system_name}</span><span>·</span><span>{c.deploy_start}–{c.deploy_end}</span>
                  </div>
                </div>
                <div style={{display:"flex",gap:8,flexShrink:0,marginLeft:12}}>
                  <CRChip s={c.status}/>
                  <EnvTag e={c.environment}/>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
      {detail&&<CRDetail cr={detail} onClose={()=>setDetail(null)} ctx={ctx}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// CR APPROVALS (Manager)
// ══════════════════════════════════════════════════════════════
function CRApprovals({ctx}){
  const {crs,transCR,users}=ctx;
  const [detail,setDetail]=useState(null);
  const l1   = crs.filter(c=>c.status==="pending_line_manager");
  const l2   = crs.filter(c=>c.status==="pending_secondary");
  const emrg = crs.filter(c=>c.is_emergency&&c.status==="pending_line_manager");

  return (
    <div>
      <PageTitle title="CR Approvals" sub="Line manager and secondary approval queues"/>
      {emrg.length>0&&(
        <div style={{...card(0),border:`1.5px solid ${C.red}`,marginBottom:16}}>
          <div style={{padding:"11px 16px",background:C.redBg,borderBottom:`1px solid ${C.red}30`,fontSize:13,fontWeight:700,color:C.red}}>⚡ Emergency Changes — Immediate Action Required</div>
          {emrg.map((c,i)=>(
            <div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:i<emrg.length-1?`1px solid #FAFAFA`:"none"}}>
              <div><div style={{fontSize:13,fontWeight:700,color:C.ink}}>{c.title}</div><div style={{fontSize:11,color:C.muted}}>{c.id} · {users[c.initiator]?.name}</div></div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>setDetail(c)} style={{...btn("ghost"),fontSize:11,padding:"4px 9px"}}>Details</button>
                <button onClick={()=>transCR(c.id,"scheduled","Emergency approved")} style={{...btn("danger"),fontSize:11,padding:"4px 9px"}}>⚡ Approve</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {[{title:"L1 — Line Manager Queue",queue:l1,onApprove:id=>transCR(id,"pending_secondary","L1 approved"),onReject:id=>transCR(id,"rejected","Rejected at L1")},
        {title:"L2 — Secondary Manager Queue",queue:l2,onApprove:id=>transCR(id,"change_review","L2 approved"),onReject:id=>transCR(id,"rejected","Rejected at L2")}
      ].map(({title,queue,onApprove,onReject})=>(
        <div key={title} style={{...card(0),marginBottom:16}}>
          <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,fontSize:13,fontWeight:700,color:C.ink}}>{title} ({queue.length})</div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <TH cols={["CR ID","Title","Type","Risk","Environment","Requested By",""]}/>
            <tbody>
              {queue.length===0?<tr><td colSpan={7}><Empty icon="🎉" title="Queue is empty"/></td></tr>
              :queue.map((c,i)=>(
                <tr key={c.id} style={{borderBottom:i<queue.length-1?`1px solid #FAFAFA`:"none"}}>
                  <td style={{padding:"11px 14px",fontSize:11,fontWeight:700}}>{c.id}</td>
                  <td style={{padding:"11px 14px",fontSize:12,maxWidth:200,color:C.ink}}><div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.title}</div></td>
                  <td style={{padding:"11px 14px",fontSize:11,color:C.muted}}>{c.change_type}</td>
                  <td style={{padding:"11px 14px"}}><RiskTag r={c.risk_level}/></td>
                  <td style={{padding:"11px 14px"}}><EnvTag e={c.environment}/></td>
                  <td style={{padding:"11px 14px",fontSize:11,color:C.muted}}>{users[c.initiator]?.name}</td>
                  <td style={{padding:"11px 14px"}}>
                    <div style={{display:"flex",gap:5}}>
                      <button onClick={()=>setDetail(c)}       style={{...btn("ghost"),fontSize:11,padding:"4px 8px"}}>View</button>
                      <button onClick={()=>onReject(c.id)}     style={{...btn("ghost"),fontSize:11,padding:"4px 8px",color:C.red,borderColor:C.red+"30"}}>Reject</button>
                      <button onClick={()=>onApprove(c.id)}    style={{...btn("success"),fontSize:11,padding:"4px 8px"}}>Approve</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {detail&&<CRDetail cr={detail} onClose={()=>setDetail(null)} ctx={ctx}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// CR REVIEW (Resource Team)
// ══════════════════════════════════════════════════════════════
function CRReview({ctx}){
  const {crs,transCR,users}=ctx;
  const [detail,setDetail]=useState(null);
  const sections=[
    {title:"Change Review Queue",s:"change_review",
      action:c=><><button onClick={()=>transCR(c.id,"pending_line_manager","Sent back")} style={{...btn("ghost"),fontSize:11,padding:"4px 8px"}}>↩ Back</button><button onClick={()=>transCR(c.id,"scheduled","Approved for scheduling")} style={{...btn("violet"),fontSize:11,padding:"4px 8px"}}>📅 Schedule</button></>},
    {title:"Scheduled",s:"scheduled",
      action:c=><button onClick={()=>transCR(c.id,"in_progress","Deployment started")} style={{...btn("primary"),fontSize:11,padding:"4px 8px"}}>▶ Start</button>},
    {title:"In Progress",s:"in_progress",
      action:c=><button onClick={()=>transCR(c.id,"completed","Implementation completed")} style={{...btn("success"),fontSize:11,padding:"4px 8px"}}>✓ Complete</button>},
    {title:"Post Review Due",s:"post_review",
      action:c=><button onClick={()=>setDetail(c)} style={{...btn("ghost"),fontSize:11,padding:"4px 8px",color:C.violet,borderColor:C.violet+"40"}}>Review →</button>},
  ];
  return (
    <div>
      <PageTitle title="Change Review Board" sub="Technical scheduling and implementation management"/>
      {sections.map(({title,s,action})=>{
        const q=crs.filter(c=>c.status===s);
        return (
          <div key={s} style={{...card(0),marginBottom:14}}>
            <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,fontSize:13,fontWeight:700,color:C.ink}}>{title} ({q.length})</div>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <TH cols={["CR ID","Title","Deploy Date","Env","Risk",""]}/>
              <tbody>
                {q.length===0?<tr><td colSpan={6}><Empty icon="✅" title="Nothing here"/></td></tr>
                :q.map((c,i)=>(
                  <tr key={c.id} style={{borderBottom:i<q.length-1?`1px solid #FAFAFA`:"none"}}>
                    <td style={{padding:"11px 14px",fontSize:11,fontWeight:700}}>{c.id}</td>
                    <td style={{padding:"11px 14px",fontSize:12,color:C.ink,maxWidth:200}}><div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.title}</div></td>
                    <td style={{padding:"11px 14px",fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>{fmtD(c.deploy_date+"T12:00:00")}</td>
                    <td style={{padding:"11px 14px"}}><EnvTag e={c.environment}/></td>
                    <td style={{padding:"11px 14px"}}><RiskTag r={c.risk_level}/></td>
                    <td style={{padding:"11px 14px"}}>
                      <div style={{display:"flex",gap:5}}>
                        <button onClick={()=>setDetail(c)} style={{...btn("ghost"),fontSize:11,padding:"4px 8px"}}>View</button>
                        {action(c)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
      {detail&&<CRDetail cr={detail} onClose={()=>setDetail(null)} ctx={ctx}/>}
    </div>
  );
}