import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  supabase,
  fetchRequests, createRequest, updateRequest,
  fetchCRs, createCR, updateCR,
  fetchNotifications, markNotificationsRead,
  fetchInventory,
  fetchVehicles,
  fetchDrivers,
  fetchUserChangeRoles,
  fetchUsersWithChangeRole,
  fetchApprovalLevels,
  fetchTenantConfig,
  updateCRStage,
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
  const [vehicles,    setVehicles]    = useState([]);
  const [drivers,     setDrivers]     = useState([]);
  const [myChangeRoles, setMyChangeRoles] = useState([]);
  const [approvalLevels,setApprovalLevels]= useState([]);
  const [tenantConfig,  setTenantConfig]  = useState(null);
  const [crUsers,       setCRUsers]       = useState({});
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
        const [reqData, crData, notifData, invData, userData] = await Promise.all([
          fetchRequests(tenantId),
          fetchCRs(tenantId),
          fetchNotifications(uid),
          fetchInventory(tenantId),
          supabase.from("users").select("*").eq("tenant_id", tenantId),
        ]);
        setReqs((reqData || []).map(normReq));
        setCrs((crData || []).map(normCR));
        setNotifs(notifData || []);
        setInvItems(invData || []);
        // Build users map keyed by id
        const umap = {};
        (userData.data || []).forEach(u => { umap[u.id] = u; });
        setUsers(umap);

        // Fetch vehicles and drivers separately — non-fatal if RLS blocks
        try {
          const [vd, dd] = await Promise.all([fetchVehicles(tenantId), fetchDrivers(tenantId)]);
          setVehicles(Array.isArray(vd) ? vd : []);
          setDrivers(Array.isArray(dd) ? dd : []);
        } catch(ve){ console.warn("Vehicles/drivers fetch skipped:", ve.message); }

        // Fetch change management config — non-fatal
        try {
          const [myRoles, levels, config] = await Promise.all([
            fetchUserChangeRoles(uid),
            fetchApprovalLevels(tenantId),
            fetchTenantConfig(tenantId),
          ]);
          setMyChangeRoles(myRoles||[]);
          setApprovalLevels(levels||[]);
          setTenantConfig(config);
          // Load users with change roles for CR workflows
          const roleKeys = ['change_manager','change_reviewer','change_approver_l1','change_approver_l2','change_implementer'];
          const roleUsers = {};
          await Promise.all(roleKeys.map(async rk => {
            const us = await fetchUsersWithChangeRole(rk, tenantId);
            roleUsers[rk] = us||[];
          }));
          setCRUsers(roleUsers);
        } catch(ce){ console.warn("Change roles fetch skipped:", ce.message); }
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
      const iso   = new Date().toISOString();
      const count = crs.length + 1;
      const id    = `CR-${String(count).padStart(6,"0")}`;

      // Get change manager — always fetch fresh from DB to avoid stale state
      let managerId = tenantConfig?.change_manager_id || null;
      if(!managerId){
        try {
          const {data:freshConfig} = await supabase.from("change_tenant_config").select("change_manager_id").eq("tenant_id",tenantId).single();
          managerId = freshConfig?.change_manager_id || null;
        } catch(ce){ console.warn("Could not fetch tenant config:", ce.message); }
      }

      // Build approval stages from configured levels that apply to this change type
      const applicableLevels = (approvalLevels||[]).filter(l=>
        (l.change_types||[]).includes(data.changeType)
      );
      const levelStages = applicableLevels.map(l=>({
        level: l.level_order,
        name:  l.name,
        role_key: l.role_key,
        status:"pending",
        approver_id:null,
        approved_at:null,
        note:"",
      }));

      const rec = {
        id,
        tenant_id:        tenantId,
        title:            data.title,
        initiator:        uid,
        status:           "pending_manager",
        current_stage:    "pending_manager",
        current_level:    0,
        change_manager_id: managerId,
        reviewer_ids:     data.reviewerIds||[],
        change_type:      data.changeType,
        risk_level:       data.riskLevel,
        environment:      data.environment,
        system_name:      data.system,
        category:         data.category,
        description:      data.desc,
        deploy_date:      data.deployDate||null,
        deploy_start:     data.deployStart||null,
        deploy_end:       data.deployEnd||null,
        rollback:         data.rollback,
        test_evidence:    data.testEvidence,
        is_emergency:     data.changeType==="Emergency",
        version:          1,
        level_approvals:  levelStages,
        reviewer_comments:[],
        history:[
          {s:"draft",            at:iso, by:uid, label:"Draft created"},
          {s:"pending_manager",  at:iso, by:uid, label:"Submitted to Change Manager"},
        ],
        attachments:[...(data.attachments||[]).map(f=>({name:f.name,size:f.size}))],
        comments:[],
        created_at:iso, updated_at:iso,
      };

      const saved = await createCR(rec);
      setCrs(p=>[normCR(saved),...p]);

      if(!managerId){
        flash(`${id} submitted — ⚠ No Change Manager configured. Go to Admin → CR Policy to set one.`, "error");
        return;
      }
      flash(`${id} submitted — notifying Change Manager...`);

      // Notify change manager — always fetch fresh from DB
      if(managerId){
        try {
          const {data:mgrRow} = await supabase.from("users").select("email,name").eq("id",managerId).single();
          const mgrEmail = mgrRow?.email;
          const mgrName  = mgrRow?.name||"Change Manager";
          if(mgrEmail){
            const emailResult = await supabase.functions.invoke("send-email",{body:{
              template:"cr_stage_notification",
              to: mgrEmail,
              data:{
                cr_id:   id,
                title:   data.title,
                stage:   "Change Manager Review",
                subject: `${id} - ${data.title} - Change Manager Review`,
                action:  `Hi ${mgrName}, a new change request has been submitted and requires your review and approval.`,
                app_url: "https://facilflowuser.vercel.app",
              }
            }});
            if(emailResult.error) flash(`CR submitted but email failed: ${emailResult.error.message}`, "error");
          } else {
            flash("CR submitted — no email sent (change manager has no email address)", "error");
          }
        } catch(ne){ flash(`CR submitted but email error: ${ne.message}`, "error"); }
      } else {
        flash("CR submitted — no Change Manager configured. Set one in admin CR Policy.", "error");
      }

    } catch(e){ flash(e.message,"error"); }
  },[crs.length, uid, tenantId, flash, tenantConfig, approvalLevels, users]);

  // ── ADVANCE CR STAGE ─────────────────────────────────────
  const advanceCR = useCallback(async (id, action, note="", extra={})=>{
    try {
      const cr = crs.find(c=>c.id===id);
      if(!cr) return;
      const iso = new Date().toISOString();
      const levels = cr.level_approvals||[];
      let nextStatus = cr.status;
      let nextLevel  = cr.current_level||0;
      let nextStage  = cr.current_stage;
      let newHistory = [...(cr.history||[])];
      let updates    = {};

      if(action === "reject"){
        nextStatus = "rejected";
        nextStage  = "rejected";
        newHistory.push({s:"rejected", at:iso, by:uid, label:"Rejected", note});
      }
      else if(action === "approve_manager"){
        // Manager approved — move to first approval level or implementation if no levels
        if(levels.length > 0){
          nextStatus = "pending_approval";
          nextStage  = `pending_level_1`;
          nextLevel  = 1;
          newHistory.push({s:"pending_approval", at:iso, by:uid, label:"Manager Approved", note});
        } else {
          nextStatus = "pending_implementation";
          nextStage  = "pending_implementation";
          newHistory.push({s:"pending_implementation", at:iso, by:uid, label:"Manager Approved — No approval levels configured", note});
        }
      }
      else if(action === "approve_level"){
        // Approve current level — move to next or implementation
        const currentLevelIdx = (cr.current_level||1) - 1;
        const updatedLevels = levels.map((l,i)=>
          i===currentLevelIdx ? {...l, status:"approved", approver_id:uid, approved_at:iso, note} : l
        );
        updates.level_approvals = updatedLevels;
        newHistory.push({s:`level_${cr.current_level}_approved`, at:iso, by:uid, label:`Level ${cr.current_level} Approved`, note});

        const nextLevelObj = levels[currentLevelIdx+1];
        if(nextLevelObj){
          nextStatus = "pending_approval";
          nextStage  = `pending_level_${nextLevelObj.level}`;
          nextLevel  = nextLevelObj.level;
        } else {
          nextStatus = "pending_implementation";
          nextStage  = "pending_implementation";
          newHistory.push({s:"pending_implementation", at:iso, by:uid, label:"All approvals complete"});
        }
      }
      else if(action === "start_implementation"){
        nextStatus = "in_progress";
        nextStage  = "in_progress";
        newHistory.push({s:"in_progress", at:iso, by:uid, label:"Implementation started"});
        updates.implementation_started_at = iso;
      }
      else if(action === "complete_implementation"){
        nextStatus = extra.outcome==="failed" ? "failed" : "completed";
        nextStage  = nextStatus;
        newHistory.push({s:nextStatus, at:iso, by:uid, label:`Implementation ${extra.outcome||"completed"}`, note});
        updates.implementation_completed_at = iso;
        updates.implementation_notes   = extra.implementationNotes||"";
        updates.implementation_outcome = extra.outcome||"successful";
      }
      else if(action === "close"){
        nextStatus = "closed";
        nextStage  = "closed";
        newHistory.push({s:"closed", at:iso, by:uid, label:"Change closed"});
      }
      else if(action === "reviewer_comment"){
        const newComments = [...(cr.reviewer_comments||[]), {by:uid, at:iso, comment:note, concur:extra.concur}];
        updates.reviewer_comments = newComments;
        newHistory.push({s:"reviewer_comment", at:iso, by:uid, label:`Reviewer comment`, note});
      }

      const saved = await updateCR(id,{
        ...updates,
        status:        nextStatus,
        current_stage: nextStage,
        current_level: nextLevel,
        history:       newHistory,
      });
      setCrs(p=>p.map(c=>c.id===id?normCR(saved):c));
      flash(`CR updated: ${nextStatus.replace(/_/g," ")}`);

      // Send stage notification emails — level-based, backward notification
      try {
        const emailRecipients = [];
        const appUrl = "https://facilflowuser.vercel.app";

        // Helper: fetch user email from DB directly
        const getEmail = async (userId) => {
          if(!userId) return null;
          if(users[userId]?.email) return users[userId].email;
          const {data:u} = await supabase.from("users").select("email,name").eq("id",userId).single();
          return u?.email||null;
        };

        // Helper: fetch all users with a role key
        const getRoleEmails = async (roleKey) => {
          const cached = (crUsers||{})[roleKey]||[];
          if(cached.length>0) return cached.map(u=>u.email).filter(Boolean);
          const {data:ucr} = await supabase.from("user_change_roles")
            .select("user_id, users(email)")
            .eq("role_key",roleKey).eq("tenant_id",tenantId);
          return (ucr||[]).map(r=>r.users?.email).filter(Boolean);
        };

        // Always notify technician (backward visibility)
        const techEmail = await getEmail(saved.initiator);
        if(techEmail) emailRecipients.push(techEmail);

        let stageLabel = "";

        if(action==="approve_manager"){
          // Manager approved → send to L1 approvers (or implementers if no levels)
          const levels = saved.level_approvals||[];
          if(levels.length>0){
            stageLabel = levels[0].name||"Level 1 Approval";
            const approverEmails = await getRoleEmails(levels[0].role_key);
            approverEmails.forEach(e=>emailRecipients.push(e));
          } else {
            stageLabel = "Implementation";
            const implEmails = await getRoleEmails("change_implementer");
            implEmails.forEach(e=>emailRecipients.push(e));
          }
          // Also notify technician that manager approved
          const mgrEmail = await getEmail(saved.change_manager_id);
          if(mgrEmail) emailRecipients.push(mgrEmail);
        }
        else if(action==="approve_level"){
          const levels = saved.level_approvals||[];
          const nextLevel = levels.find(l=>l.level===saved.current_level);
          if(nextLevel){
            stageLabel = nextLevel.name||`Level ${saved.current_level} Approval`;
            const approverEmails = await getRoleEmails(nextLevel.role_key);
            approverEmails.forEach(e=>emailRecipients.push(e));
          } else {
            stageLabel = "Implementation";
            const implEmails = await getRoleEmails("change_implementer");
            implEmails.forEach(e=>emailRecipients.push(e));
          }
          // Backward: notify manager + previous level approvers
          const mgrEmail = await getEmail(saved.change_manager_id);
          if(mgrEmail) emailRecipients.push(mgrEmail);
        }
        else if(action==="reject"){
          stageLabel = "Rejected";
          const mgrEmail = await getEmail(saved.change_manager_id);
          if(mgrEmail) emailRecipients.push(mgrEmail);
        }
        else if(action==="start_implementation"){
          stageLabel = "Implementation Started";
          const mgrEmail = await getEmail(saved.change_manager_id);
          if(mgrEmail) emailRecipients.push(mgrEmail);
        }
        else if(action==="complete_implementation"){
          stageLabel = saved.implementation_outcome==="failed"?"Implementation Failed":"Implementation Completed";
          const mgrEmail = await getEmail(saved.change_manager_id);
          if(mgrEmail) emailRecipients.push(mgrEmail);
        }

        // Deduplicate and send
        const uniqueEmails=[...new Set(emailRecipients)].filter(Boolean);
        if(uniqueEmails.length>0 && stageLabel){
          const emailRes = await supabase.functions.invoke("send-email",{body:{
            template:"cr_stage_notification",
            to: uniqueEmails,
            data:{
              cr_id:   saved.id,
              title:   saved.title,
              stage:   stageLabel,
              subject: `${saved.id} - ${saved.title} - ${stageLabel}`,
              action:  action==="reject"
                ? "This change request has been rejected. Please review and raise a new CR if needed."
                : `Action required: The change request has progressed to ${stageLabel}.`,
              note:    note||"",
              app_url: appUrl,
            }
          }});
          if(emailRes?.error) flash(`CR updated but email failed: ${emailRes.error.message}`, "error");
        }
      } catch(ne){ flash(`CR updated but notification error: ${ne.message}`, "error"); }

    } catch(e){ flash(e.message,"error"); }
  },[crs, uid, flash, users, crUsers]);

  const transCR = useCallback(async (id,ns,note="",extra={})=>{
    // Legacy wrapper — use advanceCR for new workflow
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
    myChangeRoles,
    approvalLevels,
    tenantConfig,
    crUsers,
    submitReq, transReq,
    submitCR, transCR, advanceCR,
    flash,
  };

  const hasChangeRole = (myChangeRoles||[]).length > 0;
  const visNav = NAV_GROUPS
    .map(g=>({...g,items:g.items.filter(i=>{
      if(!i.roles.includes(me?.role)) return false;
      if(i.key==='change_requests' && !hasChangeRole) return false;
      return true;
    })}))
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
  const {uid,reqs,submitReq,transReq,users,invItems}=ctx;
  const vehicles = Array.isArray(ctx.vehicles) ? ctx.vehicles : (ctx.vehicles?.data || []);
  const drivers  = Array.isArray(ctx.drivers)  ? ctx.drivers  : (ctx.drivers?.data  || []);
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
  const {uid,transReq,me,invItems,users}=ctx;
  // vehicles and drivers may be array or object — normalize safely
  const vehList = Array.isArray(ctx.vehicles) ? ctx.vehicles : (ctx.vehicles?.data || []);
  const drvList = Array.isArray(ctx.drivers)  ? ctx.drivers  : (ctx.drivers?.data  || []);
  const [note,setNote]=useState("");
  const [tab,setTab]=useState("details");
  const canApprove  = me.role==="manager"       && req.status==="pending_approval";
  const canProcess  = me.role==="resource_team" && req.status==="approved";
  const canComplete = me.role==="resource_team" && req.status==="in_progress";

  const assignedVeh = req.assigned_vehicle ? vehList.find(v=>v.id===req.assigned_vehicle) : null;
  const assignedDrv = req.assigned_driver  ? drvList.find(d=>d.id===req.assigned_driver)  : null;

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
  const {crs,submitCR,advanceCR,users,myChangeRoles,uid}=ctx;
  const [form,    setForm]    = useState(false);
  const [detail,  setDetail]  = useState(null);
  const [search,  setSearch]  = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fType,   setFType]   = useState("");
  const [fEnv,    setFEnv]    = useState("");
  const [fRisk,   setFRisk]   = useState("");
  const [fUser,   setFUser]   = useState("");
  const [fFrom,   setFFrom]   = useState("");
  const [fTo,     setFTo]     = useState("");
  const [fOutcome,setFOutcome]= useState("");
  const [page,    setPage]    = useState(1);
  const [activeCard, setActiveCard] = useState("");
  const PAGE_SIZE = 15;

  const isTech   = (myChangeRoles||[]).includes("change_technician");
  const isMgr    = (myChangeRoles||[]).includes("change_manager");
  const isApprL1 = (myChangeRoles||[]).includes("change_approver_l1");
  const isApprL2 = (myChangeRoles||[]).includes("change_approver_l2");
  const isImpl   = (myChangeRoles||[]).includes("change_implementer");
  const isRevwr  = (myChangeRoles||[]).includes("change_reviewer");

  // Scope: technicians see only their own + involved; others see all
  const scopedCRs = useMemo(()=>{
    if(isMgr||isApprL1||isApprL2||isImpl) return crs||[];
    return (crs||[]).filter(c=>
      c.initiator===uid ||
      (c.reviewer_ids||[]).includes(uid) ||
      c.change_manager_id===uid
    );
  },[crs,uid,isMgr,isApprL1,isApprL2,isImpl]);

  // ── METRICS (on scoped, unfiltered dataset) ─────────────
  const total       = scopedCRs.length;
  const pending     = scopedCRs.filter(c=>["pending_manager","pending_approval"].includes(c.status)).length;
  const inImpl      = scopedCRs.filter(c=>["pending_implementation","in_progress"].includes(c.status)).length;
  const completed   = scopedCRs.filter(c=>["completed","closed"].includes(c.status)).length;

  // Avg TAT: days from created_at to last approval or completion
  const tatDays = useMemo(()=>{
    const done = scopedCRs.filter(c=>c.status==="completed"&&c.created_at&&c.implementation_completed_at);
    if(!done.length) return null;
    const avg = done.reduce((sum,c)=>{
      const diff = new Date(c.implementation_completed_at)-new Date(c.created_at);
      return sum + diff/(1000*60*60*24);
    },0)/done.length;
    return avg.toFixed(1);
  },[scopedCRs]);

  // ── FILTER LOGIC ─────────────────────────────────────────
  const filtered = useMemo(()=>{
    const q = search.toLowerCase();
    return scopedCRs.filter(c=>{
      const raiser = users[c.initiator];
      const ct = c.change_type||c.changeType||"";
      const rl = c.risk_level||c.riskLevel||"";
      const st = c.status||"";
      const outcome = c.implementation_outcome||"";

      if(fStatus){
        const statusGroups = {
          pending_manager: ["pending_manager"],
          pending_approval:["pending_approval"],
          implementation:  ["pending_implementation","in_progress"],
          completed:       ["completed","closed"],
          rejected:        ["rejected"],
        };
        const group = statusGroups[fStatus]||[fStatus];
        if(!group.includes(st)) return false;
      }
      if(activeCard==="pending"  && !["pending_manager","pending_approval"].includes(st)) return false;
      if(activeCard==="impl"     && !["pending_implementation","in_progress"].includes(st)) return false;
      if(activeCard==="done"     && !["completed","closed"].includes(st)) return false;
      if(activeCard==="rejected" && st!=="rejected") return false;

      if(fType    && ct!==fType)   return false;
      if(fEnv     && c.environment!==fEnv) return false;
      if(fRisk    && rl!==fRisk)   return false;
      if(fUser    && c.initiator!==fUser) return false;
      if(fOutcome && outcome!==fOutcome) return false;
      if(fFrom && new Date(c.created_at)<new Date(fFrom)) return false;
      if(fTo   && new Date(c.created_at)>new Date(fTo+"T23:59:59")) return false;
      if(q){
        const hay=[c.id,c.title||"",c.description||"",raiser?.name||"",c.system_name||""].join(" ").toLowerCase();
        if(!hay.includes(q)) return false;
      }
      return true;
    });
  },[scopedCRs,search,fStatus,fType,fEnv,fRisk,fUser,fOutcome,fFrom,fTo,activeCard,users]);

  const totalPages = Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const paged = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const resetPage = fn => (...args) => { fn(...args); setPage(1); };
  const hasFilters = search||fStatus||fType||fEnv||fRisk||fUser||fOutcome||fFrom||fTo||activeCard;

  const clearAll = ()=>{
    setSearch(""); setFStatus(""); setFType(""); setFEnv(""); setFRisk("");
    setFUser(""); setFOutcome(""); setFFrom(""); setFTo(""); setActiveCard(""); setPage(1);
  };

  const stageLabel = c=>{
    if(c.status==="pending_manager")        return {label:"Awaiting Manager",    color:C.amber};
    if(c.status==="pending_approval")       return {label:`Level ${c.current_level||1} Approval`, color:C.violet};
    if(c.status==="pending_implementation") return {label:"Ready to Implement",  color:C.blue};
    if(c.status==="in_progress")            return {label:"Implementing",         color:C.teal};
    if(c.status==="completed")              return {label:"Completed",            color:C.green};
    if(c.status==="closed")                 return {label:"Closed",               color:C.muted};
    if(c.status==="rejected")               return {label:"Rejected",             color:C.red};
    return {label:c.status.replace(/_/g," "), color:C.muted};
  };

  const uniqueUsers = Object.values(users||{}).filter(Boolean);

  // CSV export
  const exportCSV = ()=>{
    const headers = ["CR ID","Title","Type","Environment","Risk","Raised By","Date Raised","Last Updated","Status","Outcome"];
    const rows = filtered.map(c=>{
      const raiser = users[c.initiator];
      return [c.id, c.title||"", c.change_type||c.changeType||"", c.environment||"",
        c.risk_level||c.riskLevel||"", raiser?.name||"",
        c.created_at?new Date(c.created_at).toLocaleDateString("en-GB"):"",
        c.updated_at?new Date(c.updated_at).toLocaleDateString("en-GB"):"",
        c.status.replace(/_/g," "), c.implementation_outcome||""];
    });
    const csv=[headers,...rows].map(r=>r.map(v=>`"${v}"`).join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url; a.download=`change-requests-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <PageTitle title="Change Requests" sub="Enterprise change management and governance"
        action={isTech&&<button onClick={()=>setForm(true)} style={btn("primary")}>+ Raise Change Request</button>}/>

      {/* ── 5 METRIC CARDS ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12}}>
        {[
          {key:"",         label:"Total Changes",       value:total,    sub:"All in scope",              color:C.blue},
          {key:"pending",  label:"Pending Approvals",   value:pending,  sub:"Awaiting sign-off",         color:C.amber},
          {key:"tat",      label:"Avg TAT (days)",      value:tatDays??"-", sub:"Submission to close",   color:C.violet},
          {key:"impl",     label:"In Implementation",   value:inImpl,   sub:"Being executed",            color:C.teal},
          {key:"done",     label:"Completed",           value:completed,sub:"Successfully closed",       color:C.green},
        ].map(({key,label,value,sub,color})=>{
          const active = activeCard===key && key!=="tat";
          return (
            <div key={label} onClick={()=>{ if(key==="tat") return; resetPage(setActiveCard)(active?"":key); }}
              style={{background:"#fff",border:`1.5px solid ${active?color:C.border}`,borderRadius:10,padding:"14px 16px",
                cursor:key==="tat"?"default":"pointer",
                boxShadow:active?`0 0 0 3px ${color}18`:"none",transition:"all .15s"}}>
              <div style={{fontSize:26,fontWeight:800,color:active?color:C.ink,letterSpacing:"-.03em",lineHeight:1}}>{value}</div>
              <div style={{fontSize:12,fontWeight:700,color:active?color:C.ink,marginTop:6}}>{label}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:2}}>{sub}</div>
            </div>
          );
        })}
      </div>

      {/* ── FILTER PANEL ── */}
      <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 16px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <span style={{fontSize:12,fontWeight:700,color:C.ink}}>Filters</span>
          {hasFilters&&<button onClick={clearAll} style={{...btn("ghost"),fontSize:11,padding:"3px 10px",color:C.red}}>✕ Clear all</button>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
          <div>
            <label style={LBL}>Status / Stage</label>
            <select value={fStatus} onChange={e=>resetPage(setFStatus)(e.target.value)} style={inp()}>
              <option value="">All Statuses</option>
              <option value="pending_manager">Pending Manager</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="implementation">Implementation</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label style={LBL}>Change Type</label>
            <select value={fType} onChange={e=>resetPage(setFType)(e.target.value)} style={inp()}>
              <option value="">All Types</option>
              {["Standard","Normal","Major","Emergency"].map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>Environment</label>
            <select value={fEnv} onChange={e=>resetPage(setFEnv)(e.target.value)} style={inp()}>
              <option value="">All Environments</option>
              {["Dev","Staging","Production"].map(e=><option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>Risk Level</label>
            <select value={fRisk} onChange={e=>resetPage(setFRisk)(e.target.value)} style={inp()}>
              <option value="">All Risk Levels</option>
              {["Low","Medium","High"].map(r=><option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>Requester</label>
            <select value={fUser} onChange={e=>resetPage(setFUser)(e.target.value)} style={inp()}>
              <option value="">All Requesters</option>
              {uniqueUsers.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>Outcome</label>
            <select value={fOutcome} onChange={e=>resetPage(setFOutcome)(e.target.value)} style={inp()}>
              <option value="">Any Outcome</option>
              <option value="successful">Successful</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div>
            <label style={LBL}>Date From</label>
            <input type="date" value={fFrom} onChange={e=>resetPage(setFFrom)(e.target.value)} style={inp()}/>
          </div>
          <div>
            <label style={LBL}>Date To</label>
            <input type="date" value={fTo} onChange={e=>resetPage(setFTo)(e.target.value)} style={inp()}/>
          </div>
        </div>
      </div>

      {/* ── SEARCH + EXPORT ── */}
      <div style={{display:"flex",gap:10,alignItems:"center"}}>
        <div style={{flex:1,position:"relative"}}>
          <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:C.muted,fontSize:14}}>🔍</span>
          <input value={search} onChange={e=>resetPage(setSearch)(e.target.value)}
            placeholder="Search by CR code, title, requester, system, description keywords…"
            style={{...inp(),paddingLeft:32,width:"100%"}}/>
        </div>
        <div style={{fontSize:12,color:C.muted,whiteSpace:"nowrap"}}>{filtered.length} result{filtered.length!==1?"s":""}</div>
        <button onClick={exportCSV} style={{...btn("ghost"),fontSize:12,padding:"7px 14px",whiteSpace:"nowrap"}}>⬇ Export CSV</button>
      </div>

      {/* ── TABLE ── */}
      <div style={card(0)}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <TH cols={["CR ID","Title","Type","Environment","Risk","Raised By","Date Raised","Last Updated","Stage","Approval Level","Action"]}/>
          <tbody>
            {paged.length===0&&(
              <tr><td colSpan={11} style={{padding:"48px",textAlign:"center",color:C.muted,fontSize:13}}>
                {hasFilters?"No change requests match your filters.":isTech?"No change requests yet — click '+ Raise Change Request' to create one.":"Nothing to show."}
              </td></tr>
            )}
            {paged.map((c,i)=>{
              const raiser = users[c.initiator];
              const sl     = stageLabel(c);
              const ct     = c.change_type||c.changeType||"—";
              const rl     = c.risk_level||c.riskLevel||"—";
              const levelLabel = c.status==="pending_approval"
                ? `L${c.current_level||1}`
                : c.status==="pending_manager"?"Manager"
                : c.status==="pending_implementation"||c.status==="in_progress"?"Impl":"—";
              return (
                <tr key={c.id} onClick={()=>setDetail(c)}
                  style={{borderBottom:i<paged.length-1?`1px solid #F1F5F9`:"none",cursor:"pointer"}}>
                  <td style={{padding:"11px 14px",fontSize:11,fontWeight:700,color:C.ink,whiteSpace:"nowrap"}}>
                    {c.is_emergency&&<span style={{color:C.red,marginRight:4}}>⚡</span>}
                    {c.id}
                    {c.version>1&&<span style={{fontSize:9,color:C.muted,marginLeft:4,fontWeight:400}}>v{c.version}</span>}
                  </td>
                  <td style={{padding:"11px 14px",maxWidth:200}}>
                    <div style={{fontSize:13,color:C.ink,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.title}</div>
                    {c.system_name&&<div style={{fontSize:10,color:C.muted,marginTop:2}}>{c.system_name}</div>}
                  </td>
                  <td style={{padding:"11px 14px",fontSize:11,color:C.muted}}>{ct}</td>
                  <td style={{padding:"11px 14px"}}><EnvTag e={c.environment}/></td>
                  <td style={{padding:"11px 14px"}}><RiskTag r={rl}/></td>
                  <td style={{padding:"11px 14px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      <Av i={raiser?.initials||"?"} s={24}/>
                      <span style={{fontSize:12,color:C.ink}}>{raiser?.name||"—"}</span>
                    </div>
                  </td>
                  <td style={{padding:"11px 14px",fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>{fmtD(c.created_at)}</td>
                  <td style={{padding:"11px 14px",fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>{fmtD(c.updated_at)}</td>
                  <td style={{padding:"11px 14px",whiteSpace:"nowrap"}}>
                    <span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,background:sl.color+"18",color:sl.color}}>{sl.label}</span>
                  </td>
                  <td style={{padding:"11px 14px",fontSize:11,color:C.muted,textAlign:"center"}}>
                    <span style={{fontWeight:600,color:levelLabel==="—"?C.muted:C.violet}}>{levelLabel}</span>
                  </td>
                  <td style={{padding:"11px 14px"}}>
                    <button onClick={e=>{e.stopPropagation();setDetail(c);}}
                      style={{...btn(["pending_manager","pending_approval","pending_implementation"].includes(c.status)?"primary":"ghost"),fontSize:11,padding:"4px 12px"}}>
                      {["pending_manager","pending_approval","pending_implementation"].includes(c.status)?"Action →":"View →"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ── PAGINATION ── */}
        <div style={{padding:"12px 16px",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
          <div style={{fontSize:11,color:C.muted}}>
            {filtered.length===0?"0 results":`${(page-1)*PAGE_SIZE+1}–${Math.min(page*PAGE_SIZE,filtered.length)} of ${filtered.length}`}
          </div>
          <div style={{display:"flex",gap:4}}>
            <button onClick={()=>setPage(1)} disabled={page===1} style={{...btn("ghost"),padding:"4px 8px",fontSize:12,opacity:page===1?.4:1}}>«</button>
            <button onClick={()=>setPage(p=>p-1)} disabled={page===1} style={{...btn("ghost"),padding:"4px 8px",fontSize:12,opacity:page===1?.4:1}}>‹</button>
            {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
              const pg=Math.max(1,Math.min(page-2,totalPages-4))+i;
              if(pg<1||pg>totalPages) return null;
              return <button key={pg} onClick={()=>setPage(pg)} style={{...btn(pg===page?"primary":"ghost"),padding:"4px 10px",fontSize:12,minWidth:32}}>{pg}</button>;
            })}
            <button onClick={()=>setPage(p=>p+1)} disabled={page===totalPages} style={{...btn("ghost"),padding:"4px 8px",fontSize:12,opacity:page===totalPages?.4:1}}>›</button>
            <button onClick={()=>setPage(totalPages)} disabled={page===totalPages} style={{...btn("ghost"),padding:"4px 8px",fontSize:12,opacity:page===totalPages?.4:1}}>»</button>
          </div>
        </div>
      </div>

      {form&&<CRForm onClose={()=>setForm(false)} onSubmit={submitCR} ctx={ctx}/>}
      {detail&&<CRDetail cr={detail} onClose={()=>setDetail(null)} ctx={ctx} onAction={advanceCR}/>}
    </div>
  );
}

// ── CR Form — with reviewer selection ──────────────────────────

function CRForm({onClose,onSubmit,ctx}){
  const {crUsers,myChangeRoles} = ctx||{};
  const reviewers = (crUsers||{})["change_reviewer"]||[];

  const [step,        setStep]       = useState(1);
  const [title,       setTitle]      = useState("");
  const [desc,        setDesc]       = useState("");
  const [system,      setSystem]     = useState("");
  const [environment, setEnv]        = useState("Staging");
  const [deployDate,  setDeployDate] = useState("");
  const [deployStart, setDStart]     = useState("22:00");
  const [deployEnd,   setDEnd]       = useState("02:00");
  const [changeType,  setCType]      = useState("Normal");
  const [riskLevel,   setRisk]       = useState("Medium");
  const [category,    setCat]        = useState("Infrastructure");
  const [rollback,    setRollback]   = useState("");
  const [testEvidence,setTest]       = useState("");
  const [attachments, setAttach]     = useState([]);
  const [reviewerIds, setReviewers]  = useState([]);
  const [errs,        setErrs]       = useState({});

  const validate1 = () => {
    const er = {};
    if(!title)      er.title      = "Required";
    if(!desc)       er.desc       = "Required";
    if(!system)     er.system     = "Required";
    if(!deployDate) er.deployDate = "Required";
    setErrs(er); return Object.keys(er).length===0;
  };
  const validate2 = () => {
    const er = {};
    if(!rollback)     er.rollback     = "Required";
    if(!testEvidence) er.testEvidence = "Required";
    setErrs(er); return Object.keys(er).length===0;
  };

  const toggleReviewer = (id) => setReviewers(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);

  const handleFiles = (e) => {
    const files = Array.from(e.target.files||[]);
    setAttach(p=>[...p,...files.map(f=>({name:f.name,size:f.size,type:f.type}))]);
  };

  const handleSubmit = () => {
    onSubmit({title,desc,system,environment,deployDate,deployStart,deployEnd,
      changeType,riskLevel,category,rollback,testEvidence,attachments,reviewerIds});
    onClose();
  };

  const STEPS = ["Request Details","Risk & Rollback","Review & Submit"];
  const approvalRoute = changeType==="Emergency"
    ? "Emergency → Change Manager → Level 1 → Implementer"
    : "Draft → Change Manager → Level 1 → Level 2 → Implementer";

  return (
    <Modal title="Raise Change Request" sub={`Step ${step} of 3 — ${STEPS[step-1]}`} onClose={onClose} w={720}>
      {/* Progress */}
      <div style={{display:"flex",gap:0,marginBottom:22}}>
        {STEPS.map((sl,i)=>(
          <div key={i} style={{flex:1,display:"flex",alignItems:"center",flexDirection:"column",gap:5}}>
            <div style={{width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
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
          <div style={{gridColumn:"1/-1"}}>
            <label style={LBL}>Change Title{errs.title&&<span style={{color:C.red,fontWeight:400,textTransform:"none"}}> · {errs.title}</span>}</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Azure API Gateway v2 Upgrade" style={inp(!!errs.title)}/>
          </div>
          <div style={{gridColumn:"1/-1"}}>
            <label style={LBL}>Change Type</label>
            <div style={{display:"flex",gap:10}}>
              {[{v:"Standard",icon:"⬡",desc:"Pre-approved, low risk"},{v:"Normal",icon:"◈",desc:"Full approval workflow"},{v:"Major",icon:"◉",desc:"Full chain + L2 approval"},{v:"Emergency",icon:"⚡",desc:"Bypass L2 — senior only"}].map(t=>{
                const active=changeType===t.v;
                const tc={Standard:C.blue,Normal:C.violet,Major:C.orange,Emergency:C.red}[t.v];
                return <button key={t.v} onClick={()=>setCType(t.v)} style={{flex:1,padding:"10px 8px",border:`1.5px solid ${active?tc:C.border}`,borderRadius:8,background:active?tc+"0D":"#fff",cursor:"pointer",fontFamily:"inherit"}}>
                  <div style={{fontSize:16,marginBottom:2}}>{t.icon}</div>
                  <div style={{fontSize:11,fontWeight:700,color:active?tc:C.ink2}}>{t.v}</div>
                  <div style={{fontSize:9,color:C.muted,marginTop:1}}>{t.desc}</div>
                </button>;
              })}
            </div>
          </div>
          <div>
            <label style={LBL}>Environment</label>
            <select value={environment} onChange={e=>setEnv(e.target.value)} style={inp()}>
              {["Dev","Staging","Production"].map(o=><option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>Risk Level</label>
            <select value={riskLevel} onChange={e=>setRisk(e.target.value)} style={inp()}>
              {["Low","Medium","High"].map(o=><option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>Category</label>
            <select value={category} onChange={e=>setCat(e.target.value)} style={inp()}>
              {["Infrastructure","Application","Security","Database","Network","Compliance"].map(o=><option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>System / Service{errs.system&&<span style={{color:C.red,fontWeight:400,textTransform:"none"}}> · {errs.system}</span>}</label>
            <input value={system} onChange={e=>setSystem(e.target.value)} placeholder="e.g. Azure API Gateway" style={inp(!!errs.system)}/>
          </div>
          <div style={{gridColumn:"1/-1"}}>
            <label style={LBL}>Description{errs.desc&&<span style={{color:C.red,fontWeight:400,textTransform:"none"}}> · {errs.desc}</span>}</label>
            <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="What will be changed and why…" style={{...inp(!!errs.desc),minHeight:80,resize:"vertical"}}/>
          </div>
          <div>
            <label style={LBL}>Deployment Date{errs.deployDate&&<span style={{color:C.red,fontWeight:400,textTransform:"none"}}> · {errs.deployDate}</span>}</label>
            <input type="date" value={deployDate} onChange={e=>setDeployDate(e.target.value)} style={inp(!!errs.deployDate)}/>
          </div>
          <div style={{display:"flex",gap:8}}>
            <div style={{flex:1}}><label style={LBL}>Start Time</label><input type="time" value={deployStart} onChange={e=>setDStart(e.target.value)} style={inp()}/></div>
            <div style={{flex:1}}><label style={LBL}>End Time</label><input type="time" value={deployEnd} onChange={e=>setDEnd(e.target.value)} style={inp()}/></div>
          </div>

          {/* Reviewers — optional */}
          {reviewers.length>0&&(
            <div style={{gridColumn:"1/-1"}}>
              <label style={LBL}>Change Reviewers (optional) — advisory only</label>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:4}}>
                {reviewers.map(r=>{
                  const sel = reviewerIds.includes(r.id);
                  return (
                    <button key={r.id} onClick={()=>toggleReviewer(r.id)} style={{
                      display:"flex",alignItems:"center",gap:7,padding:"6px 12px",
                      border:`1.5px solid ${sel?C.green:C.border}`,borderRadius:8,
                      background:sel?C.greenBg:"#fff",cursor:"pointer",fontFamily:"inherit"}}>
                      <Av i={r.initials||"?"} s={22} bg={sel?C.green:C.muted}/>
                      <div style={{textAlign:"left"}}>
                        <div style={{fontSize:12,fontWeight:600,color:sel?C.green:C.ink}}>{r.name}</div>
                        <div style={{fontSize:10,color:C.muted}}>{r.dept}</div>
                      </div>
                      {sel&&<span style={{fontSize:11,color:C.green,marginLeft:2}}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {step===2&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{padding:"11px 14px",borderRadius:7,fontSize:12,fontWeight:600,
            background:riskLevel==="High"?C.redBg:riskLevel==="Medium"?C.amberBg:C.greenBg,
            color:riskLevel==="High"?C.red:riskLevel==="Medium"?C.amber:C.green}}>
            {riskLevel} Risk — Route: {approvalRoute}
          </div>
          <div>
            <label style={LBL}>Rollback Plan{errs.rollback&&<span style={{color:C.red,fontWeight:400,textTransform:"none"}}> · {errs.rollback}</span>}</label>
            <textarea value={rollback} onChange={e=>setRollback(e.target.value)} placeholder="Step-by-step instructions to revert if something goes wrong…" style={{...inp(!!errs.rollback),minHeight:90,resize:"vertical"}}/>
          </div>
          <div>
            <label style={LBL}>Testing Evidence{errs.testEvidence&&<span style={{color:C.red,fontWeight:400,textTransform:"none"}}> · {errs.testEvidence}</span>}</label>
            <textarea value={testEvidence} onChange={e=>setTest(e.target.value)} placeholder="UAT results, staging tests, performance benchmarks…" style={{...inp(!!errs.testEvidence),minHeight:90,resize:"vertical"}}/>
          </div>
          <div>
            <label style={LBL}>Attachments (optional)</label>
            <label style={{display:"flex",alignItems:"center",gap:10,padding:"14px 16px",border:`2px dashed ${C.border}`,borderRadius:8,cursor:"pointer",background:"#FAFAFA",color:C.muted,fontSize:12}}>
              <span style={{fontSize:20}}>📎</span>
              <div><div style={{fontWeight:600,color:C.ink}}>Click to attach files</div><div style={{fontSize:11,marginTop:2}}>Plans, diagrams, test evidence, screenshots</div></div>
              <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt" onChange={handleFiles} style={{display:"none"}}/>
            </label>
            {attachments.length>0&&<div style={{marginTop:8,display:"flex",flexDirection:"column",gap:5}}>
              {attachments.map((f,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 12px",background:"#F8FAFC",borderRadius:6,border:`1px solid ${C.border}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}><span>📄</span><div><div style={{fontSize:12,fontWeight:600,color:C.ink}}>{f.name}</div><div style={{fontSize:10,color:C.muted}}>{(f.size/1024).toFixed(1)} KB</div></div></div>
                  <button onClick={()=>setAttach(p=>p.filter((_,j)=>j!==i))} style={{...btn("ghost"),padding:"3px 7px",fontSize:11,color:C.red}}>✕</button>
                </div>
              ))}
            </div>}
          </div>
        </div>
      )}

      {step===3&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:C.pageBg,borderRadius:8,padding:16}}>
            <div style={{fontSize:13,fontWeight:700,color:C.ink,marginBottom:12}}>Review Summary</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[["Title",title],["System",system],["Environment",environment],["Type",changeType],["Risk",riskLevel],["Category",category],["Deploy Date",deployDate],["Time Window",`${deployStart} – ${deployEnd}`]].map(([k,v])=>(
                <div key={k} style={{background:"#fff",padding:"8px 11px",borderRadius:6,border:`1px solid ${C.border}`,gridColumn:k==="Title"?"1/-1":"auto"}}>
                  <div style={{fontSize:10,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em"}}>{k}</div>
                  <div style={{fontSize:12,fontWeight:600,color:C.ink,marginTop:2}}>{v||"—"}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:8,padding:"12px 14px"}}>
            <div style={{fontSize:10,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>Description</div>
            <div style={{fontSize:13,color:C.ink,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{desc||"—"}</div>
          </div>
          <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:8,padding:"12px 14px"}}>
            <div style={{fontSize:10,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>Rollback Plan</div>
            <div style={{fontSize:13,color:C.ink,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{rollback||"—"}</div>
          </div>
          <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:8,padding:"12px 14px"}}>
            <div style={{fontSize:10,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>Testing Evidence</div>
            <div style={{fontSize:13,color:C.ink,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{testEvidence||"—"}</div>
          </div>
          {attachments.length>0&&<div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:8,padding:"12px 14px"}}>
            <div style={{fontSize:10,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>Attachments ({attachments.length})</div>
            {attachments.map((f,i)=><div key={i} style={{fontSize:12,color:C.ink,padding:"2px 0"}}>{f.name} <span style={{color:C.muted}}>({(f.size/1024).toFixed(1)} KB)</span></div>)}
          </div>}
          {reviewerIds.length>0&&<div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:8,padding:"12px 14px"}}>
            <div style={{fontSize:10,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>Reviewers Selected</div>
            {reviewerIds.map(id=>{const r=reviewers.find(x=>x.id===id);return r?<div key={id} style={{fontSize:12,color:C.ink,padding:"2px 0"}}>{r.name}</div>:null;})}
          </div>}
          <div style={{padding:"12px 14px",borderRadius:8,fontSize:12,background:C.violetBg,border:`1px solid ${C.violet}22`,color:C.violet,fontWeight:600,lineHeight:1.7}}>
            <div style={{marginBottom:4}}>📋 Approval Route</div>
            <div style={{fontWeight:500}}>{approvalRoute}</div>
          </div>
        </div>
      )}

      <div style={{display:"flex",justifyContent:"space-between",marginTop:20,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
        <button onClick={step>1?()=>setStep(p=>p-1):onClose} style={btn("ghost")}>{step>1?"← Back":"Cancel"}</button>
        {step<3
          ?<button onClick={()=>{if(step===1&&!validate1())return;if(step===2&&!validate2())return;setErrs({});setStep(p=>p+1)}} style={btn("primary")}>Next →</button>
          :<button onClick={handleSubmit} style={btn("primary")}>Submit CR ✓</button>}
      </div>
    </Modal>
  );
}

// ── CR Detail Modal — with Stage Tracker ──────────────────────
function CRDetail({cr,onClose,ctx,onAction}){
  const {me,uid,users,crUsers,approvalLevels} = ctx;
  const [tab,       setTab]     = useState("details");
  const [note,      setNote]    = useState("");
  const [implNotes, setImplNotes]= useState(cr.implementation_notes||"");
  const [outcome,   setOutcome] = useState(cr.implementation_outcome||"successful");
  const [comment,   setComment] = useState("");
  const [saving,    setSaving]  = useState(false);

  const myRoles   = ctx.myChangeRoles||[];
  // Change manager can approve any pending_manager CR — not just ones they were assigned to at creation
  const isMgr     = myRoles.includes("change_manager");
  const isApprL1  = myRoles.includes("change_approver_l1");
  const isApprL2  = myRoles.includes("change_approver_l2");
  const isImpl    = myRoles.includes("change_implementer");
  const isRevwr   = myRoles.includes("change_reviewer") && (cr.reviewer_ids||[]).includes(uid);
  const isTech    = cr.initiator===uid;

  const canMgrApprove  = isMgr  && cr.status==="pending_manager";
  const canL1Approve   = isApprL1 && cr.current_stage==="pending_level_1";
  const canL2Approve   = isApprL2 && cr.current_stage==="pending_level_2";
  const canStartImpl   = isImpl && cr.status==="pending_implementation";
  const canCompleteImpl= isImpl && cr.status==="in_progress";
  const canReview      = isRevwr && cr.status==="pending_manager";

  const mgr   = users[cr.change_manager_id];
  const tech  = users[cr.initiator];

  const doAction = async (action, extra={}) => {
    setSaving(true);
    try { await onAction(cr.id, action, note, extra); onClose(); }
    catch(e){ setSaving(false); }
  };

  // ── STAGE TRACKER ──────────────────────────────────────
  const levels = cr.level_approvals||[];
  const stages = [
    {key:"submitted",       label:"Submitted",       done: true,                                                    at:cr.created_at},
    {key:"pending_manager", label:"Change Manager",  done: cr.status!=="pending_manager"&&cr.status!=="rejected",  at:cr.history?.find(h=>h.s==="pending_approval")?.at, who:mgr?.name},
    ...(levels.map(l=>({
      key:`level_${l.level}`,
      label: l.name,
      done: l.status==="approved",
      active: cr.current_stage===`pending_level_${l.level}`,
      at: l.approved_at,
      who: users[l.approver_id]?.name,
    }))),
    {key:"implementation",  label:"Implementation",  done: ["completed","closed"].includes(cr.status), active: cr.status==="pending_implementation"||cr.status==="in_progress", at:cr.implementation_completed_at},
    {key:"closed",          label:"Closed",          done: cr.status==="closed",                                    at:cr.history?.find(h=>h.s==="closed")?.at},
  ];
  const isRejected = cr.status==="rejected";

  return (
    <Modal title={`${cr.id}${cr.version>1?` v${cr.version}`:""}`} sub={cr.title} onClose={onClose} w={860}>
      {/* Header badges */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16,padding:"10px 12px",background:C.pageBg,borderRadius:8}}>
        {cr.is_emergency&&<span style={{fontSize:11,fontWeight:700,color:C.red,background:"#fff",padding:"2px 8px",borderRadius:4,border:`1px solid ${C.red}30`}}>⚡ EMERGENCY</span>}
        <CRChip s={cr.status}/>
        <EnvTag e={cr.environment}/>
        <RiskTag r={cr.risk_level||cr.riskLevel}/>
        <span style={{fontSize:11,padding:"2px 8px",borderRadius:4,background:"#fff",border:`1px solid ${C.border}`,color:C.muted,fontWeight:600}}>{cr.change_type||cr.changeType}</span>
        {cr.system_name&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:4,background:"#fff",border:`1px solid ${C.border}`,color:C.muted}}>🖥 {cr.system_name}</span>}
      </div>

      {/* ── STAGE TRACKER ── */}
      <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,padding:"16px 20px",marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".07em",marginBottom:14}}>Change Progress</div>
        {isRejected?(
          <div style={{padding:"10px 14px",background:C.redBg,borderRadius:8,fontSize:13,color:C.red,fontWeight:600}}>
            ❌ This change request was rejected. A new CR must be raised to proceed.
          </div>
        ):(
          <div style={{display:"flex",alignItems:"flex-start",overflowX:"auto",paddingBottom:4}}>
            {stages.map((s,i)=>{
              const isActive = s.active || (i===0 && cr.status==="pending_manager" && !s.done);
              const color = s.done?C.green:isActive?C.brand:C.muted;
              return (
                <React.Fragment key={s.key}>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,minWidth:90,flexShrink:0}}>
                    <div style={{width:32,height:32,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
                      background:s.done?C.green:isActive?C.brand:C.border,
                      color:s.done||isActive?"#fff":C.muted,
                      fontSize:14,fontWeight:700,
                      boxShadow:isActive?`0 0 0 3px ${C.brand}30`:s.done?`0 0 0 3px ${C.green}20`:"none"}}>
                      {s.done?"✓":isActive?"●":"○"}
                    </div>
                    <div style={{fontSize:10,fontWeight:700,color,textAlign:"center",lineHeight:1.3}}>{s.label}</div>
                    {s.who&&<div style={{fontSize:9,color:C.muted,textAlign:"center"}}>{s.who}</div>}
                    {s.at&&s.done&&<div style={{fontSize:9,color:C.muted}}>{fmtD(s.at)}</div>}
                    {isActive&&<div style={{fontSize:9,color:C.brand,fontWeight:600}}>← Current</div>}
                  </div>
                  {i<stages.length-1&&(
                    <div style={{flex:1,height:2,background:s.done?C.green:C.border,marginTop:15,minWidth:20,flexShrink:1}}/>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,marginBottom:16}}>
        {["details","approvals","history","comments"].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:"7px 15px",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:tab===t?700:500,background:"transparent",color:tab===t?C.brand:C.muted,borderBottom:tab===t?`2px solid ${C.brand}`:"2px solid transparent",marginBottom:-1,textTransform:"capitalize"}}>{t}</button>
        ))}
      </div>

      {/* Details tab */}
      {tab==="details"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["Change Type",cr.change_type||cr.changeType],["Risk Level",cr.risk_level||cr.riskLevel],["Environment",cr.environment],["Category",cr.category],["System",cr.system_name||cr.systemName],["Deploy Date",cr.deploy_date||cr.deployDate],["Deploy Window",`${cr.deploy_start||cr.deployStart||""} – ${cr.deploy_end||cr.deployEnd||""}`],["Raised By",tech?.name||"—"],["Change Manager",mgr?.name||"Not assigned"]].map(([k,v])=>v?(
              <div key={k} style={{background:C.pageBg,borderRadius:7,padding:"10px 12px"}}>
                <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",marginBottom:3}}>{k}</div>
                <div style={{fontSize:13,color:C.ink,fontWeight:500}}>{String(v)}</div>
              </div>
            ):null)}
          </div>
          {cr.description&&<div style={{background:C.pageBg,borderRadius:7,padding:"12px 14px"}}><div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>Description</div><div style={{fontSize:13,color:C.ink,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{cr.description}</div></div>}
          {cr.rollback&&<div style={{background:C.pageBg,borderRadius:7,padding:"12px 14px"}}><div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>Rollback Plan</div><div style={{fontSize:13,color:C.ink,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{cr.rollback}</div></div>}
          {cr.test_evidence&&<div style={{background:C.pageBg,borderRadius:7,padding:"12px 14px"}}><div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>Testing Evidence</div><div style={{fontSize:13,color:C.ink,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{cr.test_evidence}</div></div>}
          {/* Implementation feedback if completed */}
          {cr.implementation_notes&&<div style={{background:C.greenBg,border:`1px solid ${C.green}30`,borderRadius:7,padding:"12px 14px"}}>
            <div style={{fontSize:10,fontWeight:700,color:C.green,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>Implementation Notes</div>
            <div style={{fontSize:13,color:C.ink,lineHeight:1.7}}>{cr.implementation_notes}</div>
            {cr.implementation_outcome&&<div style={{marginTop:8,fontSize:12,fontWeight:700,color:cr.implementation_outcome==="failed"?C.red:C.green}}>Outcome: {cr.implementation_outcome}</div>}
          </div>}
        </div>
      )}

      {/* Approvals tab */}
      {tab==="approvals"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{background:C.pageBg,borderRadius:8,padding:14}}>
            <div style={{fontSize:12,fontWeight:700,color:C.ink,marginBottom:10}}>Change Manager</div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <Av i={mgr?.initials||"?"} s={32}/>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:C.ink}}>{mgr?.name||"Not assigned"}</div>
                <div style={{fontSize:11,color:C.muted}}>{mgr?.email}</div>
              </div>
              <div style={{marginLeft:"auto"}}>
                {cr.status==="pending_manager"
                  ?<span style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,background:C.amberBg,color:C.amber}}>Pending</span>
                  :cr.status==="rejected"
                    ?<span style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,background:C.redBg,color:C.red}}>Rejected</span>
                    :<span style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,background:C.greenBg,color:C.green}}>Approved ✓</span>}
              </div>
            </div>
          </div>
          {levels.map((l,i)=>(
            <div key={i} style={{background:C.pageBg,borderRadius:8,padding:14}}>
              <div style={{fontSize:12,fontWeight:700,color:C.ink,marginBottom:10}}>{l.name}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:12,color:C.muted}}>{l.role_key?.replace(/_/g," ")}</div>
                <span style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,
                  background:l.status==="approved"?C.greenBg:cr.current_stage===`pending_level_${l.level}`?C.amberBg:"#F8FAFC",
                  color:l.status==="approved"?C.green:cr.current_stage===`pending_level_${l.level}`?C.amber:C.muted}}>
                  {l.status==="approved"?`Approved ✓ — ${fmtD(l.approved_at)}`:cr.current_stage===`pending_level_${l.level}`?"Pending":"Awaiting"}
                </span>
              </div>
              {l.note&&<div style={{fontSize:12,color:C.muted,marginTop:8,fontStyle:"italic"}}>"{l.note}"</div>}
            </div>
          ))}
        </div>
      )}

      {/* History tab */}
      {tab==="history"&&(
        <div style={{position:"relative",paddingLeft:20}}>
          <div style={{position:"absolute",left:7,top:6,bottom:6,width:2,background:C.border}}/>
          {(cr.history||[]).map((h,i)=>{
            const m=CR_STATUS[h.s]||{color:C.muted};
            return (
              <div key={i} style={{position:"relative",marginBottom:14}}>
                <div style={{position:"absolute",left:-17,width:10,height:10,borderRadius:"50%",background:m.color||C.brand,border:"2px solid #fff",top:2}}/>
                <div style={{fontSize:11,fontWeight:600,color:m.color||C.ink,textTransform:"capitalize"}}>{(h.label||h.s).replace(/_/g," ")}</div>
                <div style={{fontSize:10,color:C.muted}}>{fmtDT(h.at)} · {users[h.by]?.name||"System"}</div>
                {h.note&&<div style={{fontSize:11,color:C.ink2,marginTop:2,fontStyle:"italic"}}>"{h.note}"</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Comments tab (reviewers) */}
      {tab==="comments"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {(cr.reviewer_comments||[]).length===0&&<div style={{color:C.muted,fontSize:13,padding:"20px 0",textAlign:"center"}}>No reviewer comments yet.</div>}
          {(cr.reviewer_comments||[]).map((c,i)=>(
            <div key={i} style={{background:C.pageBg,borderRadius:8,padding:"12px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:12,fontWeight:700,color:C.ink}}>{users[c.by]?.name||"Reviewer"}</span>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  {c.concur!==undefined&&<span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20,background:c.concur?C.greenBg:C.amberBg,color:c.concur?C.green:C.amber}}>{c.concur?"Concurred":"Noted"}</span>}
                  <span style={{fontSize:10,color:C.muted}}>{fmtDT(c.at)}</span>
                </div>
              </div>
              <div style={{fontSize:13,color:C.ink,lineHeight:1.6}}>{c.comment}</div>
            </div>
          ))}
          {/* Reviewer can add comment */}
          {canReview&&(
            <div style={{marginTop:8,border:`1px solid ${C.border}`,borderRadius:8,padding:14}}>
              <label style={LBL}>Add Review Comment</label>
              <textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder="Your review comments or concurrence…" style={{...inp(),minHeight:70,resize:"vertical"}}/>
              <div style={{display:"flex",gap:8,marginTop:10}}>
                <button onClick={()=>doAction("reviewer_comment",{concur:false})} style={btn("ghost")}>Note Only</button>
                <button onClick={()=>doAction("reviewer_comment",{concur:true})} style={{...btn("primary"),background:C.green}}>✓ Concur</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action note field */}
      {(canMgrApprove||canL1Approve||canL2Approve||canStartImpl||canCompleteImpl)&&tab!=="comments"&&(
        <div style={{marginTop:14}}>
          <label style={LBL}>Note (optional)</label>
          <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a note for your decision…" style={{...inp(),minHeight:52,resize:"vertical"}}/>
        </div>
      )}

      {/* Implementation feedback */}
      {canCompleteImpl&&(
        <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:10}}>
          <div>
            <label style={LBL}>Implementation Notes</label>
            <textarea value={implNotes} onChange={e=>setImplNotes(e.target.value)} placeholder="Document what was done, any issues encountered…" style={{...inp(),minHeight:80,resize:"vertical"}}/>
          </div>
          <div>
            <label style={LBL}>Outcome</label>
            <div style={{display:"flex",gap:10}}>
              {["successful","failed"].map(o=>(
                <button key={o} onClick={()=>setOutcome(o)} style={{flex:1,padding:"10px",border:`1.5px solid ${outcome===o?(o==="successful"?C.green:C.red):C.border}`,borderRadius:8,background:outcome===o?(o==="successful"?C.greenBg:C.redBg):"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700,color:outcome===o?(o==="successful"?C.green:C.red):C.muted,textTransform:"capitalize"}}>
                  {o==="successful"?"✅ Successful":"❌ Failed"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:18,paddingTop:14,borderTop:`1px solid ${C.border}`}}>
        <button onClick={onClose} style={btn("ghost")}>Close</button>
        {canMgrApprove&&<>
          <button onClick={()=>doAction("reject")} disabled={saving} style={btn("danger")}>Reject</button>
          <button onClick={()=>doAction("approve_manager")} disabled={saving} style={btn("primary")}>✓ Approve & Forward →</button>
        </>}
        {canL1Approve&&<>
          <button onClick={()=>doAction("reject")} disabled={saving} style={btn("danger")}>Reject</button>
          <button onClick={()=>doAction("approve_level")} disabled={saving} style={btn("primary")}>✓ Approve Level 1 →</button>
        </>}
        {canL2Approve&&<>
          <button onClick={()=>doAction("reject")} disabled={saving} style={btn("danger")}>Reject</button>
          <button onClick={()=>doAction("approve_level")} disabled={saving} style={btn("primary")}>✓ Approve Level 2 →</button>
        </>}
        {canStartImpl&&<button onClick={()=>doAction("start_implementation")} disabled={saving} style={{...btn("primary"),background:C.blue}}>🔧 Start Implementation</button>}
        {canCompleteImpl&&<button onClick={()=>doAction("complete_implementation",{implementationNotes:implNotes,outcome})} disabled={saving} style={{...btn("primary"),background:outcome==="failed"?C.red:C.green}}>
          {outcome==="failed"?"❌ Mark Failed":"✅ Mark Complete"}
        </button>}
      </div>
    </Modal>
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