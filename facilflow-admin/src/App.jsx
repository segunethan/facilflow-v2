import { supabase } from "./lib/supabase.js";
import { fetchUsers, updateUser, deleteUser, fetchVehicles, createVehicle, updateVehicle, fetchDrivers, createDriver, updateDriver, fetchInventory, createInventoryItem, updateInventoryItem, fetchRequests, updateRequest, fetchCRs, updateCR, fetchAuditLog, addAuditEntry } from "./lib/supabase.js";
import { useState, useMemo, useCallback, useEffect } from "react";

/* =========================================================
   AFRICA PRUDENTIAL — FaciliFlow  ADMIN PLATFORM
   admin.africaprudential.com
   ========================================================= */

// ── DESIGN TOKENS ──────────────────────────────────────────────
const C = {
  brand:"#C8102E", brandDk:"#A00D24", brandLt:"#FEF2F4",
  white:"#FFFFFF", pageBg:"#F7F8FA", surface:"#EEF0F4",
  sidebar:"#0F172A", sidebarHov:"#1E293B", sidebarAct:"#C8102E",
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

const btn = (v="primary", extra={}) => ({
  display:"inline-flex", alignItems:"center", gap:6, padding:"7px 16px",
  borderRadius:6, border:"none", cursor:"pointer", fontSize:12, fontWeight:600,
  fontFamily:"inherit", transition:"opacity .15s", whiteSpace:"nowrap",
  ...(v==="primary" ? {background:C.brand,   color:"#fff"} :
      v==="ghost"   ? {background:"transparent", color:C.muted, border:`1px solid ${C.border}`} :
      v==="danger"  ? {background:C.red,     color:"#fff"} :
      v==="success" ? {background:C.green,   color:"#fff"} :
      v==="violet"  ? {background:C.violet,  color:"#fff"} :
      v==="amber"   ? {background:C.amber,   color:"#fff"} :
      v==="outline" ? {background:"#fff",    color:C.brand, border:`1.5px solid ${C.brand}`} :
                      {background:C.surface, color:C.ink2}),
  ...extra,
});

const inp = (err=false) => ({
  width:"100%", padding:"8px 11px", border:`1px solid ${err?C.red:C.border}`,
  borderRadius:6, fontSize:13, color:C.ink, background:"#fff",
  fontFamily:"inherit", outline:"none", boxSizing:"border-box",
});

const card = (p=16) => ({
  background:"#fff", border:`1px solid ${C.border}`,
  borderRadius:10, padding:p, boxShadow:"0 1px 3px rgba(0,0,0,.05)",
});

const LBL = { fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase",
  letterSpacing:".07em", display:"block", marginBottom:5 };

// ── SEED DATA ──────────────────────────────────────────────────
const TENANTS = [
  {id:"T001", name:"Africa Prudential Plc",  domain:"africaprudential.com",  plan:"Enterprise", users:28, status:"active"},
  {id:"T002", name:"Lagos State Pension",    domain:"lspc.gov.ng",           plan:"Business",   users:12, status:"active"},
];

let USERS_SEED = [
  {id:"U001",tenantId:"T001",name:"Adaeze Okonkwo",   initials:"AO",email:"adaeze@africaprudential.com",  role:"employee",      dept:"Finance",    status:"active",   createdAt:"2023-06-01T09:00:00"},
  {id:"U002",tenantId:"T001",name:"Chukwuemeka Eze",  initials:"CE",email:"chukwu@africaprudential.com",  role:"manager",       dept:"Finance",    status:"active",   createdAt:"2023-06-01T09:00:00"},
  {id:"U003",tenantId:"T001",name:"Ngozi Adeyemi",    initials:"NA",email:"ngozi@africaprudential.com",   role:"resource_team", dept:"Facilities", status:"active",   createdAt:"2023-06-05T10:00:00"},
  {id:"U004",tenantId:"T001",name:"Oluwaseun Balogun",initials:"OB",email:"seun@africaprudential.com",    role:"admin",         dept:"IT",         status:"active",   createdAt:"2023-06-01T08:00:00"},
  {id:"U005",tenantId:"T001",name:"Amaka Ihejirika",  initials:"AI",email:"amaka@africaprudential.com",   role:"employee",      dept:"HR",         status:"active",   createdAt:"2023-07-10T09:00:00"},
  {id:"U006",tenantId:"T001",name:"Tunde Fashola",    initials:"TF",email:"tunde@africaprudential.com",   role:"manager",       dept:"IT",         status:"suspended",createdAt:"2023-07-15T09:00:00"},
];

let VEHICLES_SEED = [
  {id:"CAR001",tenantId:"T001",plate:"AAA-001BE",model:"Toyota Camry",    year:2022,color:"Silver", status:"available",       driverId:"DRV001",lastUpdated:"2024-01-15T09:00:00"},
  {id:"CAR002",tenantId:"T001",plate:"BBB-234FG",model:"Toyota Corolla",  year:2021,color:"White",  status:"in_use",          driverId:"DRV002",lastUpdated:"2024-01-16T08:30:00"},
  {id:"CAR003",tenantId:"T001",plate:"CCC-567HJ",model:"Toyota Hilux",   year:2020,color:"Blue",   status:"under_maintenance",driverId:null,    lastUpdated:"2024-01-10T14:00:00"},
  {id:"CAR004",tenantId:"T001",plate:"DDD-890KL",model:"Hyundai Elantra", year:2023,color:"Black",  status:"available",       driverId:"DRV003",lastUpdated:"2024-01-15T11:00:00"},
  {id:"CAR005",tenantId:"T001",plate:"EEE-123MN",model:"Toyota Prado",   year:2022,color:"White",  status:"reserved",        driverId:null,    lastUpdated:"2024-01-17T09:00:00"},
];

let DRIVERS_SEED = [
  {id:"DRV001",tenantId:"T001",name:"Babatunde Olatunji",license:"LGA-2019-4567",phone:"+234 803 123 4567",status:"available",   vehicleId:"CAR001",lastUpdated:"2024-01-15T09:00:00"},
  {id:"DRV002",tenantId:"T001",name:"Emeka Chukwu",       license:"LGA-2018-8901",phone:"+234 806 987 6543",status:"unavailable", vehicleId:"CAR002",lastUpdated:"2024-01-16T08:00:00"},
  {id:"DRV003",tenantId:"T001",name:"Sunday Adeyinka",    license:"LGA-2020-2345",phone:"+234 815 456 7890",status:"available",   vehicleId:"CAR004",lastUpdated:"2024-01-14T16:00:00"},
  {id:"DRV004",tenantId:"T001",name:"Rotimi Adeleke",     license:"LGA-2021-6789",phone:"+234 802 345 6789",status:"suspended",   vehicleId:null,    lastUpdated:"2023-12-01T09:00:00"},
];

let INVENTORY_SEED = [
  {id:"INV001",tenantId:"T001",name:"A4 Paper (Ream)",      code:"STA-001",stock:45,unit:"ream", desc:"80gsm A4 paper reams for office printing",       category:"Paper",    lastUpdated:"2024-01-10T08:00:00"},
  {id:"INV002",tenantId:"T001",name:"Ballpoint Pens (Box)", code:"STA-002",stock:8, unit:"box",  desc:"Blue and black ballpoint pens, 50 per box",       category:"Writing",  lastUpdated:"2024-01-09T10:00:00"},
  {id:"INV003",tenantId:"T001",name:"Stapler",              code:"EQP-001",stock:12,unit:"unit", desc:"Heavy duty desktop staplers",                     category:"Equipment",lastUpdated:"2024-01-08T09:00:00"},
  {id:"INV004",tenantId:"T001",name:"Sticky Notes (Pack)",  code:"STA-003",stock:3, unit:"pack", desc:"76x76mm sticky note pads, assorted colours",      category:"Paper",    lastUpdated:"2024-01-11T14:00:00"},
  {id:"INV005",tenantId:"T001",name:"Highlighters (Set)",   code:"STA-004",stock:15,unit:"set",  desc:"5-colour highlighter sets",                       category:"Writing",  lastUpdated:"2024-01-07T11:00:00"},
  {id:"INV006",tenantId:"T001",name:"Printer Cartridge",    code:"EQP-002",stock:4, unit:"unit", desc:"HP LaserJet compatible black toner cartridges",   category:"Equipment",lastUpdated:"2024-01-12T10:00:00"},
  {id:"INV007",tenantId:"T001",name:"Whiteboard Markers",   code:"STA-005",stock:22,unit:"set",  desc:"Dry-erase markers, 4 colours per set",            category:"Writing",  lastUpdated:"2024-01-06T09:00:00"},
];

const AUDIT_SEED = [
  {id:"AL001",at:"2024-01-17T09:30:00",by:"U004",action:"USER_INVITED",   target:"newuser@africaprudential.com",detail:"Invitation sent to new employee"},
  {id:"AL002",at:"2024-01-16T14:05:00",by:"U004",action:"EMERGENCY_CR",   target:"CR-000003",detail:"Emergency SSL renewal CR raised"},
  {id:"AL003",at:"2024-01-16T10:00:00",by:"U004",action:"VEHICLE_STATUS", target:"CAR002",   detail:"Vehicle status changed to In Use"},
  {id:"AL004",at:"2024-01-15T09:00:00",by:"U004",action:"USER_SUSPENDED", target:"U006",     detail:"User Tunde Fashola suspended"},
  {id:"AL005",at:"2024-01-14T14:30:00",by:"U004",action:"STOCK_ADJUSTED", target:"INV001",   detail:"A4 Paper stock adjusted: 30 → 45"},
  {id:"AL006",at:"2024-01-13T11:00:00",by:"U004",action:"DRIVER_ADDED",   target:"DRV004",   detail:"Driver Rotimi Adeleke registered"},
  {id:"AL007",at:"2024-01-12T09:00:00",by:"U004",action:"POLICY_UPDATED", target:"CR_POLICY",detail:"CR approval policy updated for Normal changes"},
  {id:"AL008",at:"2024-01-10T10:00:00",by:"U004",action:"CREATE_CR",      target:"CR-000001",detail:"Azure API Gateway CR created"},
];

const CR_SEED = [
  {id:"CR-000001",title:"Azure API Gateway v2 Deployment",      initiator:"U001",createdAt:"2024-01-10T10:00:00",updatedAt:"2024-01-13T14:00:00",status:"scheduled",   changeType:"Normal",   riskLevel:"High",   environment:"Production",system:"Azure API Gateway"},
  {id:"CR-000002",title:"Database Index Optimisation",           initiator:"U001",createdAt:"2024-01-08T08:00:00",updatedAt:"2024-01-13T10:00:00",status:"closed",      changeType:"Standard", riskLevel:"Low",    environment:"Production",system:"Core Banking DB"},
  {id:"CR-000003",title:"EMERGENCY: SSL Certificate Renewal",   initiator:"U001",createdAt:"2024-01-16T14:00:00",updatedAt:"2024-01-16T15:00:00",status:"in_progress", changeType:"Emergency",riskLevel:"High",   environment:"Production",system:"Payment Gateway",isEmergency:true},
  {id:"CR-000004",title:"MFA Rollout – Staff Portal",            initiator:"U001",createdAt:"2024-01-14T11:00:00",updatedAt:"2024-01-15T09:00:00",status:"change_review",changeType:"Normal",  riskLevel:"Medium", environment:"Production",system:"Staff Portal"},
  {id:"CR-000005",title:"Network Switch Firmware Upgrade",       initiator:"U005",createdAt:"2024-01-17T09:00:00",updatedAt:"2024-01-17T09:30:00",status:"pending_line_manager",changeType:"Normal",riskLevel:"Medium",environment:"Production",system:"Network Infra"},
];

// ── STATUS / META ──────────────────────────────────────────────
const CR_STATUS = {
  draft:{label:"Draft",color:C.muted,bg:"#F8FAFC"},
  pending_line_manager:{label:"Pending L1",color:C.amber,bg:C.amberBg},
  pending_secondary:{label:"Pending L2",color:C.orange,bg:C.orangeBg},
  change_review:{label:"In Review",color:C.violet,bg:C.violetBg},
  scheduled:{label:"Scheduled",color:C.blue,bg:C.blueBg},
  in_progress:{label:"In Progress",color:C.teal,bg:C.tealBg},
  completed:{label:"Completed",color:C.green,bg:C.greenBg},
  post_review:{label:"Post Review",color:C.violet,bg:C.violetBg},
  closed:{label:"Closed",color:C.muted,bg:"#F8FAFC"},
  rejected:{label:"Rejected",color:C.red,bg:C.redBg},
};

const VEHICLE_STATUSES = [
  {v:"available",        l:"Available",        color:C.green, bg:C.greenBg},
  {v:"in_use",           l:"In Use",           color:C.blue,  bg:C.blueBg},
  {v:"under_maintenance",l:"Under Maintenance",color:C.amber, bg:C.amberBg},
  {v:"reserved",         l:"Reserved",         color:C.violet,bg:C.violetBg},
  {v:"out_of_service",   l:"Out of Service",   color:C.red,   bg:C.redBg},
];

const DRIVER_STATUSES = [
  {v:"available",  l:"Available",   color:C.green, bg:C.greenBg},
  {v:"unavailable",l:"Not Available",color:C.amber, bg:C.amberBg},
  {v:"suspended",  l:"Suspended",   color:C.red,   bg:C.redBg},
  {v:"resigned",   l:"Resigned",    color:C.muted, bg:"#F8FAFC"},
];

const USER_ROLES = ["employee","manager","resource_team","admin"];

// ── HELPERS ────────────────────────────────────────────────────
const fmtDT = d => new Date(d).toLocaleString("en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
const fmtD  = d => new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
const genId = p => `${p}${Date.now()}${Math.random().toString(36).slice(2,5)}`;
const now   = () => new Date().toISOString();
const vsm   = v => VEHICLE_STATUSES.find(s=>s.v===v)||{l:v,color:C.muted,bg:"#F8FAFC"};
const dsm   = v => DRIVER_STATUSES.find(s=>s.v===v)||{l:v,color:C.muted,bg:"#F8FAFC"};

// DB → UI field normalizers (DB is snake_case, UI expects camelCase from original seed)
const normCR  = cr => cr ? ({...cr, changeType:cr.change_type??cr.changeType, riskLevel:cr.risk_level??cr.riskLevel, deployDate:cr.deploy_date??cr.deployDate, deployStart:cr.deploy_start??cr.deployStart, deployEnd:cr.deploy_end??cr.deployEnd, isEmergency:cr.is_emergency??cr.isEmergency, systemName:cr.system_name??cr.systemName }) : cr;
const normVeh = v  => v  ? ({...v,  driverId:v.driver_id??v.driverId }) : v;
const normDrv = d  => d  ? ({...d,  vehicleId:d.vehicle_id??d.vehicleId }) : d;
const normInv = i  => i  ? ({...i,  desc:i.description??i.desc, lastUpdated:i.updated_at??i.lastUpdated }) : i;
const normAudit = a => a ? ({...a,  at:a.created_at??a.at, by:a.performed_by??a.by }) : a;

// ── ATOMS ──────────────────────────────────────────────────────
const Av = ({i,s=30,bg=C.brand}) => (
  <div style={{width:s,height:s,borderRadius:"50%",background:bg,color:"#fff",display:"flex",
    alignItems:"center",justifyContent:"center",fontSize:s*.33,fontWeight:700,flexShrink:0}}>{i}</div>
);

const Chip = ({label,color,bg}) => (
  <span style={{display:"inline-flex",padding:"2px 9px",borderRadius:20,fontSize:11,fontWeight:600,
    background:bg,color,border:`1px solid ${color}22`,whiteSpace:"nowrap"}}>{label}</span>
);

const CRChip  = ({s}) => { const m=CR_STATUS[s]||{label:s,color:C.muted,bg:"#F8FAFC"}; return <Chip label={m.label} color={m.color} bg={m.bg}/>; };
const VChip   = ({s}) => { const m=vsm(s); return <Chip label={m.l} color={m.color} bg={m.bg}/>; };
const DChip   = ({s}) => { const m=dsm(s); return <Chip label={m.l} color={m.color} bg={m.bg}/>; };
const UChip   = ({s}) => s==="active"?<Chip label="Active"    color={C.green} bg={C.greenBg}/>:<Chip label="Suspended" color={C.red} bg={C.redBg}/>;
const EnvTag  = ({e}) => { const m={Production:{c:C.red,bg:C.redBg},Staging:{c:C.amber,bg:C.amberBg},Dev:{c:C.green,bg:C.greenBg}}; const {c,bg}=m[e]||{c:C.muted,bg:"#F8FAFC"}; return <span style={{fontSize:11,fontWeight:600,padding:"1px 7px",borderRadius:4,background:bg,color:c}}>{e}</span>; };
const RiskTag = ({r}) => { const m={High:{c:C.red,bg:C.redBg},Medium:{c:C.amber,bg:C.amberBg},Low:{c:C.green,bg:C.greenBg}}; const {c,bg}=m[r]||{c:C.muted,bg:"#F8FAFC"}; return <span style={{fontSize:11,fontWeight:600,padding:"1px 7px",borderRadius:4,background:bg,color:c}}>{r}</span>; };

function Toast({t}){
  if(!t)return null;
  return <div style={{position:"fixed",bottom:24,right:24,zIndex:9999,padding:"11px 18px",borderRadius:8,fontSize:13,fontWeight:600,color:"#fff",background:t.type==="error"?C.red:C.green,boxShadow:"0 4px 20px rgba(0,0,0,.18)",animation:"slideUp .2s ease"}}>{t.type==="error"?"✕ ":"✓ "}{t.msg}</div>;
}

function Modal({title,sub,onClose,children,w=640}){
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,.5)",zIndex:800,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(3px)"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{...card(0),width:w,maxWidth:"96vw",maxHeight:"92vh",display:"flex",flexDirection:"column",borderRadius:12}}>
        <div style={{padding:"16px 22px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div><div style={{fontSize:15,fontWeight:700,color:C.ink}}>{title}</div>{sub&&<div style={{fontSize:12,color:C.muted,marginTop:1}}>{sub}</div>}</div>
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
      <div><h1 style={{margin:0,fontSize:20,fontWeight:800,color:C.ink,letterSpacing:"-.025em"}}>{title}</h1>{sub&&<p style={{margin:"3px 0 0",fontSize:13,color:C.muted}}>{sub}</p>}</div>
      {action}
    </div>
  );
}

function TH({cols}){
  return <thead><tr style={{background:"#FAFAFA"}}>{cols.map(c=><th key={c} style={{padding:"9px 14px",textAlign:"left",fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".08em",borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap"}}>{c}</th>)}</tr></thead>;
}

function Empty({icon="—",title,sub}){
  return <div style={{textAlign:"center",padding:"40px 24px",color:C.muted}}><div style={{fontSize:34,marginBottom:10}}>{icon}</div><div style={{fontWeight:600,color:C.ink2,fontSize:14}}>{title}</div>{sub&&<div style={{fontSize:12,marginTop:4}}>{sub}</div>}</div>;
}

function Filters({fields,values,onChange}){
  return (
    <div style={{display:"flex",gap:10,flexWrap:"wrap",padding:"12px 14px",background:"#fff",border:`1px solid ${C.border}`,borderRadius:8,marginBottom:16,alignItems:"flex-end"}}>
      {fields.map(f=>(
        <div key={f.k} style={{display:"flex",flexDirection:"column",minWidth:f.w||120}}>
          <label style={LBL}>{f.label}</label>
          {f.type==="select"
            ?<select value={values[f.k]||""} onChange={e=>onChange({...values,[f.k]:e.target.value})} style={{...inp(),padding:"6px 9px",fontSize:12}}>
               <option value="">All</option>
               {f.opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
             </select>
            :<input type={f.type||"text"} value={values[f.k]||""} placeholder={f.ph||""} onChange={e=>onChange({...values,[f.k]:e.target.value})} style={{...inp(),padding:"6px 9px",fontSize:12}}/>}
        </div>
      ))}
      <button onClick={()=>onChange({})} style={{...btn("ghost"),padding:"6px 12px",fontSize:11,alignSelf:"flex-end"}}>Clear</button>
    </div>
  );
}

function StatCard({label,value,sub,color=C.brand,icon}){
  return (
    <div style={{...card(16),flex:1,minWidth:140}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".07em"}}>{label}</div>
          <div style={{fontSize:26,fontWeight:900,color:C.ink,marginTop:4,letterSpacing:"-.03em"}}>{value}</div>
          {sub&&<div style={{fontSize:11,color:C.muted,marginTop:2}}>{sub}</div>}
        </div>
        {icon&&<div style={{width:40,height:40,borderRadius:10,background:color+"14",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{icon}</div>}
      </div>
    </div>
  );
}

// ── NAV ────────────────────────────────────────────────────────
const NAV = [
  {group:"Overview",items:[
    {k:"dashboard",  l:"Dashboard",        icon:"◫"},
  ]},
  {group:"People & Access",items:[
    {k:"users",      l:"User Management",  icon:"👤"},
  ]},
  {group:"Facilities",items:[
    {k:"requests",   l:"Facility Requests",icon:"📋"},
    {k:"fleet",      l:"Fleet Management", icon:"🚗"},
    {k:"drivers",    l:"Driver Roster",    icon:"🪪"},
    {k:"inventory",  l:"Inventory",        icon:"📦"},
  ]},
  {group:"Change Management",items:[
    {k:"change_requests",l:"Change Requests",icon:"⟳"},
    {k:"cr_policy",      l:"CR Policy",      icon:"⚙"},
  ]},
  {group:"System",items:[
    {k:"notifications",l:"Notifications",  icon:"🔔"},
    {k:"audit",        l:"Audit Log",       icon:"📋"},
  ]},
];

// ══════════════════════════════════════════════════════════════
// ROOT — Supabase wired
// ══════════════════════════════════════════════════════════════
export default function AdminApp({ currentUser }){
  const [page,      setPage]     = useState("dashboard");
  const [users,     setUsers]    = useState([]);
  const [vehicles,  setVehicles] = useState([]);
  const [drivers,   setDrivers]  = useState([]);
  const [inventory, setInv]      = useState([]);
  const [requests,  setRequests] = useState([]);
  const [crs,       setCrs]      = useState([]);
  const [audit,     setAudit]    = useState([]);
  const [toast,     setToast]    = useState(null);
  const [loading,   setLoading]  = useState(true);

  const me  = currentUser;
  const tid = me?.tenant_id;
  const uid = me?.id;

  // ── LOAD ALL DATA ─────────────────────────────────────────
  useEffect(()=>{
    if(!tid) return;
    Promise.all([
      fetchUsers(tid),
      fetchVehicles(tid),
      fetchDrivers(tid),
      fetchInventory(tid),
      fetchRequests(tid),
      fetchCRs(tid),
      fetchAuditLog(tid),
    ]).then(([u,v,d,inv,reqs,cr,al])=>{
      setUsers(u||[]);
      setVehicles((v||[]).map(normVeh));
      setDrivers((d||[]).map(normDrv));
      setInv((inv||[]).map(normInv));
      setRequests(reqs||[]);
      setCrs((cr||[]).map(normCR));
      setAudit((al||[]).map(normAudit));
    }).catch(console.error)
    .finally(()=>setLoading(false));
  },[tid]);

  const flash = useCallback((msg,type="success")=>{
    setToast({msg,type});
    setTimeout(()=>setToast(null),3200);
  },[]);

  // ── ADD AUDIT ENTRY ───────────────────────────────────────
  const addAuditFn = useCallback(async(action,target,detail)=>{
    const entry = {
      tenant_id:tid, performed_by:uid,
      action, target, detail,
    };
    try {
      await addAuditEntry(entry);
      setAudit(p=>[{...entry, id:genId("AL"), created_at:new Date().toISOString()},...p]);
    } catch(e){ console.error("Audit error:",e); }
  },[tid,uid]);

  if(loading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",
      fontFamily:"system-ui",color:C.muted,fontSize:14,background:C.pageBg}}>
      Loading Admin Console…
    </div>
  );

  const ctx={
    me, tid, uid,
    users, setUsers,
    vehicles, setVehicles,
    drivers, setDrivers,
    inventory, setInv,
    requests, setRequests,
    crs, setCrs,
    audit, addAudit:addAuditFn,
    flash,
    adminUser: me,
  };

  return (
    <div style={{minHeight:"100vh",background:C.pageBg,fontFamily:"'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif",display:"flex",flexDirection:"column"}}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}
        input:focus,select:focus,textarea:focus{outline:none;border-color:${C.brand}!important;box-shadow:0 0 0 2.5px ${C.brand}18!important}
        button:hover{opacity:.88} tr:hover>td{background:#FAFAFA}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:${C.borderDk};border-radius:4px}
        @keyframes slideUp{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}`}
      </style>

      {/* ── TOPBAR ── */}
      <header style={{height:52,background:C.sidebar,borderBottom:"1px solid #1E293B",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px",flexShrink:0,position:"sticky",top:0,zIndex:200}}>
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <div style={{width:30,height:30,borderRadius:7,background:C.brand,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:"#fff",letterSpacing:"-.05em"}}>AP</div>
          <div>
            <div style={{fontSize:13,fontWeight:800,color:"#fff",letterSpacing:"-.02em",lineHeight:1.1}}>Africa Prudential</div>
            <div style={{fontSize:9,color:"#64748B",fontWeight:600,letterSpacing:".06em",textTransform:"uppercase"}}>Admin Console</div>
          </div>
          <div style={{marginLeft:8,padding:"2px 10px",borderRadius:20,background:C.brand,fontSize:10,fontWeight:700,color:"#fff",letterSpacing:".04em"}}>ADMIN</div>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <div style={{fontSize:11,color:"#94A3B8",fontWeight:500}}>Tenant: Africa Prudential Plc</div>
          <div style={{width:1,height:18,background:"#334155"}}/>
          <Av i={me?.initials||"AD"} s={28}/>
          <div><div style={{fontSize:12,fontWeight:700,color:"#F1F5F9"}}>{me?.name?.split(" ")[0]}</div><div style={{fontSize:10,color:"#64748B",textTransform:"capitalize"}}>Admin</div></div>
          <button onClick={()=>supabase.auth.signOut()} style={{...btn("ghost"),fontSize:11,padding:"4px 9px",marginLeft:4,color:"#94A3B8",borderColor:"#334155"}}>Sign out</button>
        </div>
      </header>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        {/* ── SIDEBAR ── */}
        <aside style={{width:210,background:C.sidebar,display:"flex",flexDirection:"column",flexShrink:0}}>
          <nav style={{flex:1,padding:"10px 0",overflowY:"auto"}}>
            {NAV.map(g=>(
              <div key={g.group} style={{marginBottom:4}}>
                <div style={{padding:"8px 16px 3px",fontSize:9,fontWeight:700,color:"#475569",textTransform:"uppercase",letterSpacing:".1em"}}>{g.group}</div>
                {g.items.map(n=>{
                  const active=page===n.k;
                  return (
                    <button key={n.k} onClick={()=>setPage(n.k)} style={{
                      display:"flex",alignItems:"center",gap:9,width:"100%",padding:"8px 16px",
                      border:"none",borderLeft:`2px solid ${active?C.brand:"transparent"}`,
                      background:active?"rgba(200,16,46,.12)":"transparent",
                      color:active?"#fff":"#94A3B8",
                      fontSize:12,fontWeight:active?700:500,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
                      <span style={{fontSize:13}}>{n.icon}</span>{n.l}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
          <div style={{padding:"11px 14px",borderTop:"1px solid #1E293B"}}>
            <div style={{fontSize:11,color:"#475569",fontWeight:500}}>v2.0 · Admin Platform</div>
          </div>
        </aside>

        {/* ── CONTENT ── */}
        <main style={{flex:1,padding:28,overflowY:"auto",maxHeight:"calc(100vh - 52px)"}}>
          {page==="dashboard"      && <AdminDash     ctx={ctx} setPage={setPage}/>}
          {page==="users"          && <UserMgmt      ctx={ctx}/>}
          {page==="requests"       && <RequestsMgmt  ctx={ctx}/>}
          {page==="fleet"          && <FleetMgmt     ctx={ctx}/>}
          {page==="drivers"        && <DriverRoster  ctx={ctx}/>}
          {page==="inventory"      && <InventoryMgmt ctx={ctx}/>}
          {page==="change_requests"&& <CRAdmin       ctx={ctx}/>}
          {page==="cr_policy"      && <CRPolicy      ctx={ctx}/>}
          {page==="notifications"  && <NotifPolicy   ctx={ctx}/>}
          {page==="audit"          && <AuditLog      ctx={ctx}/>}
        </main>
      </div>
      <Toast t={toast}/>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ══════════════════════════════════════════════════════════════
function AdminDash({ctx,setPage}){
  const {users,vehicles,drivers,inventory,crs,requests}=ctx;
  const activeUsers   = users.filter(u=>u.status==="active").length;
  const availVeh      = vehicles.filter(v=>v.status==="available").length;
  const lowStock      = inventory.filter(i=>i.stock<5).length;
  const pendingCRs    = crs.filter(c=>["pending_line_manager","pending_secondary","change_review"].includes(c.status)).length;
  const pendingReqs   = (requests||[]).filter(r=>r.status==="pending_approval").length;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <PageTitle title="Admin Dashboard" sub="Africa Prudential Plc · Tenant Overview"/>

      {/* Stats */}
      <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
        <StatCard label="Active Users"       value={activeUsers}  sub={`${users.length} total`}        color={C.blue}   icon="👥"/>
        <StatCard label="Fleet Available"    value={availVeh}     sub={`${vehicles.length} vehicles`}   color={C.green}  icon="🚗"/>
        <StatCard label="Pending Requests"   value={pendingReqs}  sub="Awaiting approval"               color={C.brand}  icon="📋" onClick={()=>setPage("requests")}/>
        <StatCard label="Pending CRs"        value={pendingCRs}   sub="Awaiting action"                 color={C.violet} icon="⟳"/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr",gap:16}}>
        {/* Recent CRs */}
        <div style={card(0)}>
          <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:14,fontWeight:700,color:C.ink}}>Recent Change Requests</span>
            <button onClick={()=>setPage("change_requests")} style={{...btn("ghost"),fontSize:11,padding:"4px 10px"}}>View all →</button>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <TH cols={["ID","Title","Type","Env","Status"]}/>
            <tbody>
              {crs.slice(0,5).map((c,i)=>(
                <tr key={c.id} style={{borderBottom:i<4?`1px solid #FAFAFA`:"none"}}>
                  <td style={{padding:"10px 14px",fontSize:11,fontWeight:700,color:C.ink}}>{c.id}</td>
                  <td style={{padding:"10px 14px",fontSize:12,color:C.ink,maxWidth:180}}><div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.isEmergency&&"⚡ "}{c.title}</div></td>
                  <td style={{padding:"10px 14px",fontSize:11,color:C.muted}}>{c.changeType}</td>
                  <td style={{padding:"10px 14px"}}><EnvTag e={c.environment}/></td>
                  <td style={{padding:"10px 14px"}}><CRChip s={c.status}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right panel */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* Vehicle status */}
          <div style={card(16)}>
            <div style={{fontSize:13,fontWeight:700,color:C.ink,marginBottom:12}}>🚗 Fleet Status</div>
            {VEHICLE_STATUSES.map(s=>{
              const count=vehicles.filter(v=>v.status===s.v).length;
              return count>0?(
                <div key={s.v} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <Chip label={s.l} color={s.color} bg={s.bg}/>
                  <span style={{fontSize:13,fontWeight:700,color:C.ink}}>{count}</span>
                </div>
              ):null;
            })}
          </div>
          {/* Low stock */}
          {lowStock>0&&(
            <div style={{...card(14),border:`1px solid ${C.amber}40`,background:C.amberBg}}>
              <div style={{fontSize:13,fontWeight:700,color:C.amber,marginBottom:10}}>⚠ Low Stock Alerts</div>
              {inventory.filter(i=>i.stock<5).map(i=>(
                <div key={i.id} style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.amber,marginBottom:4}}>
                  <span>{i.name}</span><span style={{fontWeight:700}}>{i.stock} {i.unit}s</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tenant info */}
      <div style={card(0)}>
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,fontSize:14,fontWeight:700,color:C.ink}}>Tenant Overview</div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <TH cols={["Tenant","Domain","Plan","Users","Status"]}/>
          <tbody>
            {TENANTS.map((t,i)=>(
              <tr key={t.id} style={{borderBottom:i<TENANTS.length-1?`1px solid #FAFAFA`:"none"}}>
                <td style={{padding:"11px 14px",fontSize:13,fontWeight:700,color:C.ink}}>{t.name}</td>
                <td style={{padding:"11px 14px",fontSize:12,color:C.muted}}>{t.domain}</td>
                <td style={{padding:"11px 14px"}}><Chip label={t.plan} color={C.blue} bg={C.blueBg}/></td>
                <td style={{padding:"11px 14px",fontSize:13,color:C.ink}}>{t.users}</td>
                <td style={{padding:"11px 14px"}}><Chip label={t.status==="active"?"Active":"Inactive"} color={t.status==="active"?C.green:C.muted} bg={t.status==="active"?C.greenBg:"#F8FAFC"}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// FACILITY REQUESTS MANAGEMENT
// ══════════════════════════════════════════════════════════════
function RequestsMgmt({ctx}){
  const {requests,setRequests,users,vehicles,drivers,inventory,addAudit,flash,uid,tid}=ctx;
  const [f,setF]       = useState({status:"",type:""});
  const [selected,setSel] = useState(null);

  const usersMap = {};
  (users||[]).forEach(u=>{ usersMap[u.id]=u; });

  const shown = (requests||[]).filter(r=>{
    if(f.status && r.status!==f.status) return false;
    if(f.type   && r.type!==f.type)     return false;
    return true;
  });

  const pending = (requests||[]).filter(r=>r.status==="pending_approval").length;

  // Approve or reject stationery request
  const actionReq = async (id, newStatus, note="") => {
    try {
      const req = requests.find(r=>r.id===id);
      const now = new Date().toISOString();
      const history = [...(req.history||[]), {s:newStatus, at:now, by:uid, note}];
      const updates = {
        status: newStatus,
        history,
        ...(newStatus==="approved" ? {approved_by: uid, approved_at: now} : {}),
      };
      const saved = await updateRequest(id, updates);
      setRequests(p=>p.map(r=>r.id===id ? saved : r));
      addAudit("REQUEST_"+newStatus.toUpperCase(), id, `Request ${id} → ${newStatus}`);
      flash(`Request ${newStatus.replace(/_/g," ")}`);
      setSel(null);

      // Send email notification to requester
      const requester = usersMap[req.submitted_by];
      if(requester?.email){
        await supabase.functions.invoke("send-email",{
          body:{ template:"request_approved", to:requester.email, data:{
            type: req.type==="pool_car"?"Pool Car":"Stationery",
            title: req.title,
            approver: usersMap[uid]?.name||"Admin",
            app_url: "https://facilflowuser.vercel.app",
          }}
        });
      }
    } catch(e){ flash(e.message,"error"); }
  };

  // Assign vehicle + driver to pool car request
  const assignVehicle = async (id, vehicleId, driverId) => {
    try {
      const req = requests.find(r=>r.id===id);
      const now = new Date().toISOString();
      const history = [...(req.history||[]), {s:"approved", at:now, by:uid, note:"Vehicle & driver assigned"}];
      const saved = await updateRequest(id, {
        status: "approved",
        history,
        approved_by: uid,
        approved_at: now,
        assigned_vehicle: vehicleId,
        assigned_driver: driverId || null,
      });
      // Also update vehicle status to in_use
      if(vehicleId) await updateVehicle(vehicleId, {status:"in_use"});

      setRequests(p=>p.map(r=>r.id===id ? saved : r));
      addAudit("REQUEST_ASSIGNED", id, `Vehicle assigned to ${id}`);
      flash("Vehicle assigned & request approved");
      setSel(null);

      // Email requester
      const requester = usersMap[req.submitted_by];
      const veh = (vehicles||[]).find(v=>v.id===vehicleId);
      const drv = (drivers||[]).find(d=>d.id===driverId);
      if(requester?.email){
        await supabase.functions.invoke("send-email",{
          body:{ template:"request_approved", to:requester.email, data:{
            type:"Pool Car",
            title: req.title,
            approver: `${usersMap[uid]?.name||"Admin"} — ${veh?.plate||""} ${veh?.model||""} ${drv?`(Driver: ${drv.name})`:""}`,
            app_url: "https://facilflowuser.vercel.app",
          }}
        });
      }
    } catch(e){ flash(e.message,"error"); }
  };

  // Mark stationery as delivered
  const markDelivered = async (id) => {
    try {
      const req = requests.find(r=>r.id===id);
      const now = new Date().toISOString();
      const history = [...(req.history||[]), {s:"delivered", at:now, by:uid, note:"Items delivered"}];
      const saved = await updateRequest(id, {status:"delivered", history, delivered_at: now});
      setRequests(p=>p.map(r=>r.id===id ? saved : r));
      addAudit("REQUEST_DELIVERED", id, `Request ${id} marked delivered`);
      flash("Marked as delivered");
      setSel(null);
    } catch(e){ flash(e.message,"error"); }
  };

  const statusColor = s => {
    const map = {
      pending_approval: {bg:"#FFF7ED", color:"#D97706"},
      approved:         {bg:"#ECFDF5", color:"#059669"},
      rejected:         {bg:"#FEF2F2", color:"#DC2626"},
      in_progress:      {bg:"#EFF6FF", color:"#2563EB"},
      delivered:        {bg:"#F0FDF4", color:"#059669"},
      fulfilled:        {bg:"#EFF6FF", color:"#2563EB"},
      cancelled:        {bg:"#F8FAFC", color:"#64748B"},
    };
    return map[s]||{bg:"#F8FAFC",color:"#64748B"};
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <PageTitle title="Facility Requests" sub="Pool car and stationery requests from staff"
        action={pending>0&&<span style={{background:C.brand,color:"#fff",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20}}>{pending} pending</span>}
      />

      {/* Filters */}
      <div style={{display:"flex",gap:10}}>
        <select value={f.status} onChange={e=>setF(p=>({...p,status:e.target.value}))} style={{...inp(),width:170}}>
          <option value="">All Statuses</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="in_progress">In Progress</option>
          <option value="delivered">Delivered</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={f.type} onChange={e=>setF(p=>({...p,type:e.target.value}))} style={{...inp(),width:150}}>
          <option value="">All Types</option>
          <option value="pool_car">Pool Car</option>
          <option value="stationary">Stationery</option>
        </select>
      </div>

      {/* Table */}
      <div style={card(0)}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <TH cols={["ID","Type","Requested By","Details","Date","Approved","Status","Action"]}/>
          <tbody>
            {shown.length===0&&(
              <tr><td colSpan={8} style={{padding:"40px",textAlign:"center",color:C.muted,fontSize:13}}>No requests found</td></tr>
            )}
            {shown.map((r,i)=>{
              const submitter = usersMap[r.submitted_by];
              const sc = statusColor(r.status);
              const approvedAt = r.approved_at ? new Date(r.approved_at).toLocaleDateString("en-GB",{day:"numeric",month:"short"}) : "—";
              const detail = r.type==="pool_car"
                ? `${r.details?.pickup||""} → ${r.details?.destination||""}`
                : (r.details?.items||[]).map(it=>{
                    const inv=(inventory||[]).find(x=>x.id===it.id);
                    return `${inv?.name||it.id} ×${it.qty}`;
                  }).join(", ");
              return (
                <tr key={r.id} style={{borderBottom:i<shown.length-1?`1px solid #F1F5F9`:"none"}}>
                  <td style={{padding:"11px 14px",fontSize:11,fontWeight:700,color:C.ink}}>{r.id}</td>
                  <td style={{padding:"11px 14px"}}>
                    <span style={{fontSize:11,fontWeight:600,background:r.type==="pool_car"?"#FEF2F2":"#EFF6FF",color:r.type==="pool_car"?C.brand:"#2563EB",padding:"3px 8px",borderRadius:5}}>
                      {r.type==="pool_car"?"🚗 Pool Car":"✏️ Stationery"}
                    </span>
                  </td>
                  <td style={{padding:"11px 14px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      <Av i={submitter?.initials||"?"} s={26}/>
                      <div>
                        <div style={{fontSize:12,fontWeight:600,color:C.ink}}>{submitter?.name||"Unknown"}</div>
                        <div style={{fontSize:10,color:C.muted}}>{submitter?.dept}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{padding:"11px 14px",fontSize:11,color:C.muted,maxWidth:200}}>
                    <div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{detail}</div>
                  </td>
                  <td style={{padding:"11px 14px",fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>
                    {new Date(r.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}
                  </td>
                  <td style={{padding:"11px 14px",fontSize:11,color:C.muted}}>{approvedAt}</td>
                  <td style={{padding:"11px 14px"}}>
                    <span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,background:sc.bg,color:sc.color,textTransform:"capitalize"}}>
                      {r.status.replace(/_/g," ")}
                    </span>
                  </td>
                  <td style={{padding:"11px 14px"}}>
                    <button onClick={()=>setSel(r)} style={{...btn(r.status==="pending_approval"?"primary":"ghost"),fontSize:11,padding:"4px 12px"}}>
                      {r.status==="pending_approval"?"Action →":"View →"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected&&(
        <RequestDetailModal
          req={selected}
          usersMap={usersMap}
          vehicles={vehicles||[]}
          drivers={drivers||[]}
          inventory={inventory||[]}
          onClose={()=>setSel(null)}
          onAction={actionReq}
          onAssign={assignVehicle}
          onDeliver={markDelivered}
        />
      )}
    </div>
  );
}

function RequestDetailModal({req,usersMap,vehicles,drivers,inventory,onClose,onAction,onAssign,onDeliver}){
  const [note,  setNote]  = useState("");
  const [vehId, setVehId] = useState("");
  const [drvId, setDrvId] = useState("");
  const [tab,   setTab]   = useState("details");

  const submitter  = usersMap[req.submitted_by];
  const isPending  = req.status==="pending_approval";
  const isApproved = req.status==="approved";
  const isCarReq   = req.type==="pool_car";
  const availVeh   = vehicles.filter(v=>v.status==="available");
  const availDrv   = drivers.filter(d=>d.status==="available");
  const assignedVeh= req.assigned_vehicle ? vehicles.find(v=>v.id===req.assigned_vehicle) : null;
  const assignedDrv= req.assigned_driver  ? drivers.find(d=>d.id===req.assigned_driver)  : null;

  const stationeryItems = isCarReq ? [] : (req.details?.items||[]).map(it=>{
    const inv = inventory.find(x=>x.id===it.id);
    return {name:inv?.name||it.id, qty:it.qty, unit:inv?.unit||"unit"};
  });

  return (
    <Modal title={`Request: ${req.id}`} sub={req.title} onClose={onClose} w={640}>
      {/* Status bar */}
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:14,padding:"10px 12px",background:"#F8FAFC",borderRadius:8}}>
        <Av i={submitter?.initials||"?"} s={32}/>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:C.ink}}>{submitter?.name||"Unknown"}</div>
          <div style={{fontSize:11,color:C.muted}}>{submitter?.dept} · {submitter?.email}</div>
        </div>
        <div style={{marginLeft:"auto",textAlign:"right"}}>
          <div style={{fontSize:11,color:C.muted}}>Submitted {new Date(req.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</div>
          {req.approved_at&&<div style={{fontSize:11,color:"#059669",fontWeight:600}}>Approved {new Date(req.approved_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</div>}
          {req.delivered_at&&<div style={{fontSize:11,color:"#2563EB",fontWeight:600}}>Delivered {new Date(req.delivered_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</div>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,marginBottom:16}}>
        {["details","history"].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:"8px 16px",border:"none",borderBottom:`2px solid ${tab===t?C.brand:"transparent"}`,background:"transparent",fontSize:12,fontWeight:tab===t?700:500,color:tab===t?C.brand:C.muted,cursor:"pointer",fontFamily:"inherit",textTransform:"capitalize"}}>{t}</button>
        ))}
      </div>

      {tab==="details"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* Pool car details */}
          {isCarReq&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[["Pickup",req.details?.pickup],["Destination",req.details?.destination],["Date",req.details?.date],["Time",`${req.details?.start||""} – ${req.details?.end||""}`],["Passengers",req.details?.passengers],["Purpose",req.details?.purpose]].map(([k,v])=>v?(
                <div key={k} style={{background:"#F8FAFC",borderRadius:7,padding:"10px 12px",gridColumn:k==="Purpose"?"1/-1":"auto"}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",marginBottom:3}}>{k}</div>
                  <div style={{fontSize:13,color:C.ink,fontWeight:500}}>{String(v)}</div>
                </div>
              ):null)}
            </div>
          )}

          {/* Stationery details */}
          {!isCarReq&&(
            <div style={{background:"#F8FAFC",borderRadius:8,padding:14}}>
              <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",marginBottom:10}}>Items Requested</div>
              {stationeryItems.map((it,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:i<stationeryItems.length-1?`1px solid ${C.border}`:"none"}}>
                  <span style={{fontSize:13,color:C.ink,fontWeight:500}}>{it.name}</span>
                  <span style={{fontSize:12,fontWeight:700,color:C.ink}}>{it.qty} {it.unit}s</span>
                </div>
              ))}
              {req.details?.urgency&&<div style={{marginTop:10,fontSize:12,color:C.muted}}>Urgency: <strong style={{textTransform:"capitalize"}}>{req.details.urgency}</strong></div>}
              {req.details?.notes&&<div style={{marginTop:6,fontSize:12,color:C.muted,fontStyle:"italic"}}>"{req.details.notes}"</div>}
            </div>
          )}

          {/* Assigned vehicle (if already assigned) */}
          {assignedVeh&&(
            <div style={{background:"#ECFDF5",border:`1px solid #059669`,borderRadius:8,padding:12}}>
              <div style={{fontSize:11,fontWeight:700,color:"#059669",marginBottom:8}}>✅ Vehicle Assigned</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div><div style={{fontSize:10,color:"#059669",fontWeight:700,marginBottom:2}}>VEHICLE</div><div style={{fontSize:13,color:C.ink,fontWeight:600}}>{assignedVeh.plate} — {assignedVeh.model}</div></div>
                {assignedDrv&&<div><div style={{fontSize:10,color:"#059669",fontWeight:700,marginBottom:2}}>DRIVER</div><div style={{fontSize:13,color:C.ink,fontWeight:600}}>{assignedDrv.name}<br/><span style={{fontSize:11,color:C.muted}}>{assignedDrv.phone}</span></div></div>}
              </div>
            </div>
          )}

          {/* Vehicle assignment UI for pending pool car */}
          {isPending&&isCarReq&&(
            <div style={{border:`1px solid ${C.border}`,borderRadius:8,padding:14}}>
              <div style={{fontSize:13,fontWeight:700,color:C.ink,marginBottom:12}}>🚗 Assign Vehicle & Driver</div>
              {availVeh.length===0
                ? <div style={{fontSize:13,color:C.muted,padding:"8px 0"}}>No vehicles available right now. All vehicles are in use or under maintenance.</div>
                : (
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                    <div>
                      <label style={LBL}>Vehicle <span style={{color:C.red}}>*</span></label>
                      <select value={vehId} onChange={e=>setVehId(e.target.value)} style={inp()}>
                        <option value="">Select vehicle…</option>
                        {availVeh.map(v=><option key={v.id} value={v.id}>{v.plate} — {v.model} ({v.color})</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={LBL}>Driver (optional)</label>
                      <select value={drvId} onChange={e=>setDrvId(e.target.value)} style={inp()}>
                        <option value="">Select driver…</option>
                        {availDrv.map(d=><option key={d.id} value={d.id}>{d.name} — {d.phone}</option>)}
                      </select>
                    </div>
                  </div>
                )
              }
            </div>
          )}

          {/* Note field */}
          {isPending&&!isCarReq&&(
            <div>
              <label style={LBL}>Note (optional)</label>
              <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a note for the requester…" style={{...inp(),height:60,resize:"vertical"}}/>
            </div>
          )}
        </div>
      )}

      {tab==="history"&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {(req.history||[]).length===0&&<div style={{color:C.muted,fontSize:13}}>No history yet.</div>}
          {(req.history||[]).map((h,i)=>(
            <div key={i} style={{display:"flex",gap:10,padding:"10px 12px",background:"#F8FAFC",borderRadius:7}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:C.brand,marginTop:4,flexShrink:0}}/>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:C.ink,textTransform:"capitalize"}}>{h.s.replace(/_/g," ")}</div>
                {h.note&&<div style={{fontSize:11,color:C.muted,marginTop:2}}>{h.note}</div>}
                <div style={{fontSize:10,color:C.muted,marginTop:2}}>{usersMap[h.by]?.name||"System"} · {new Date(h.at).toLocaleString("en-GB")}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:18,paddingTop:14,borderTop:`1px solid ${C.border}`}}>
        <button onClick={onClose} style={btn("ghost")}>Close</button>
        {isPending&&isCarReq&&(
          <>
            <button onClick={()=>onAction(req.id,"rejected",note)} style={btn("danger")}>Reject</button>
            <button onClick={()=>vehId&&onAssign(req.id,vehId,drvId)} disabled={!vehId} style={{...btn("primary"),opacity:vehId?1:0.5}}>
              Assign & Approve →
            </button>
          </>
        )}
        {isPending&&!isCarReq&&(
          <>
            <button onClick={()=>onAction(req.id,"rejected",note)} style={btn("danger")}>Reject</button>
            <button onClick={()=>onAction(req.id,"approved",note)} style={btn("primary")}>✓ Approve</button>
          </>
        )}
        {isApproved&&!isCarReq&&(
          <button onClick={()=>onDeliver(req.id)} style={{...btn("primary"),background:"#059669"}}>📦 Mark Delivered</button>
        )}
        {isApproved&&isCarReq&&(
          <button onClick={()=>onDeliver(req.id)} style={{...btn("primary"),background:"#059669"}}>✅ Mark Complete</button>
        )}
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════
// USER MANAGEMENT
// ══════════════════════════════════════════════════════════════
function UserMgmt({ctx}){
  const {users,setUsers,addAudit,flash,tid}=ctx;
  const [f,setF]       = useState({});
  const [modal,setModal]= useState(null);
  const [confirm,setConfirm]=useState(null);

  const shown=users.filter(u=>{
    if(f.role&&u.role!==f.role)return false;
    if(f.status&&u.status!==f.status)return false;
    if(f.q){const q=f.q.toLowerCase();if(!u.name.toLowerCase().includes(q)&&!u.email.toLowerCase().includes(q))return false;}
    return true;
  });

  const suspend = async id=>{
    try{
      await updateUser(id,{status:"suspended"});
      setUsers(p=>p.map(u=>u.id!==id?u:{...u,status:"suspended"}));
      addAudit("USER_SUSPENDED",id,"User suspended");flash("User suspended");setConfirm(null);
    }catch(e){flash(e.message,"error");}
  };
  const reinstate = async id=>{
    try{
      await updateUser(id,{status:"active"});
      setUsers(p=>p.map(u=>u.id!==id?u:{...u,status:"active"}));
      addAudit("USER_REINSTATED",id,"User reinstated");flash("User reinstated");
    }catch(e){flash(e.message,"error");}
  };
  const removeUser = async id=>{
    try{
      await deleteUser(id);
      setUsers(p=>p.filter(u=>u.id!==id));
      addAudit("USER_DELETED",id,"User deleted");flash("User deleted");setConfirm(null);
    }catch(e){flash(e.message,"error");}
  };
  const invite=async(email,name,role,dept,tempPassword)=>{
    try{
      const redirectTo = role==="admin"
        ? "https://facilflow-v2-admin.vercel.app"
        : "https://facilflowuser.vercel.app";

      // Call edge function which uses service role key
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { email, name, role, dept, tenant_id:tid, temp_password:tempPassword, redirect_to:redirectTo }
      });
      if(error) throw error;
      if(data.error) throw new Error(data.error);

      setUsers(p=>[...p, data.user]);
      addAudit("USER_INVITED", email, `${name} invited as ${role}`);
      flash(`Invitation sent to ${email}`);
    }catch(e){ flash(e.message,"error"); }
  };
  const updateUser=(id,data)=>{
    setUsers(p=>p.map(u=>u.id!==id?u:{...u,...data}));addAudit("USER_UPDATED",id,"User details updated");flash("User updated");
  };

  return (
    <div>
      <PageTitle title="User Management" sub="Manage users, roles and access permissions"
        action={<button onClick={()=>setModal("add")} style={btn("primary")}>+ Invite User</button>}/>
      <Filters values={f} onChange={setF} fields={[
        {k:"q",     label:"Search", type:"text",   w:200,ph:"Name or email…"},
        {k:"role",  label:"Role",   type:"select", w:150,opts:USER_ROLES.map(v=>({v,l:v.replace("_"," ")}))},
        {k:"status",label:"Status", type:"select", w:130,opts:[{v:"active",l:"Active"},{v:"suspended",l:"Suspended"}]},
      ]}/>
      <div style={card(0)}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <TH cols={["Name","Email","Role","Department","Status","Date Created",""]}/>
          <tbody>
            {shown.length===0?<tr><td colSpan={7}><Empty icon="👤" title="No users found"/></td></tr>
            :shown.map((u,i)=>(
              <tr key={u.id} style={{borderBottom:i<shown.length-1?`1px solid #FAFAFA`:"none"}}>
                <td style={{padding:"11px 14px"}}>
                  <div style={{display:"flex",gap:9,alignItems:"center"}}>
                    <Av i={u.initials} s={28} bg={u.status==="suspended"?C.muted:C.brand}/>
                    <span style={{fontSize:13,fontWeight:600,color:u.status==="suspended"?C.muted:C.ink}}>{u.name}</span>
                  </div>
                </td>
                <td style={{padding:"11px 14px",fontSize:12,color:C.muted}}>{u.email}</td>
                <td style={{padding:"11px 14px"}}><span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:4,background:C.surface,color:C.ink2,textTransform:"capitalize"}}>{u.role.replace("_"," ")}</span></td>
                <td style={{padding:"11px 14px",fontSize:12,color:C.muted}}>{u.dept}</td>
                <td style={{padding:"11px 14px"}}><UChip s={u.status}/></td>
                <td style={{padding:"11px 14px",fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>{fmtD(u.createdAt)}</td>
                <td style={{padding:"11px 14px"}}>
                  <div style={{display:"flex",gap:5}}>
                    <button onClick={()=>setModal({edit:u})} style={{...btn("ghost"),fontSize:11,padding:"4px 8px"}}>Edit</button>
                    {u.status==="active"
                      ?<button onClick={()=>setConfirm({type:"suspend",user:u})} style={{...btn("ghost"),fontSize:11,padding:"4px 8px",color:C.amber,borderColor:C.amber+"30"}}>Suspend</button>
                      :<button onClick={()=>reinstate(u.id)} style={{...btn("ghost"),fontSize:11,padding:"4px 8px",color:C.green,borderColor:C.green+"30"}}>Reinstate</button>}
                    <button onClick={()=>setConfirm({type:"delete",user:u})} style={{...btn("ghost"),fontSize:11,padding:"4px 8px",color:C.red,borderColor:C.red+"30"}}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{padding:"9px 14px",borderTop:`1px solid #FAFAFA`,fontSize:11,color:C.muted}}>{shown.length} of {users.length} users</div>
      </div>

      {/* Invite / Add modal */}
      {modal==="add"&&<InviteModal onClose={()=>setModal(null)} onInvite={(email,name,role,dept,pw)=>invite(email,name,role,dept,pw)}/>}
      {modal?.edit&&<EditUserModal user={modal.edit} onClose={()=>setModal(null)} onSave={updateUser}/>}

      {/* Confirm modal */}
      {confirm&&(
        <Modal title={confirm.type==="delete"?"Delete User":"Suspend User"} onClose={()=>setConfirm(null)} w={420}>
          <div style={{marginBottom:20,fontSize:13,color:C.ink2,lineHeight:1.6}}>
            {confirm.type==="delete"
              ?<>Are you sure you want to <strong style={{color:C.red}}>permanently delete</strong> <strong>{confirm.user.name}</strong>? This cannot be undone.</>
              :<>Are you sure you want to <strong style={{color:C.amber}}>suspend</strong> <strong>{confirm.user.name}</strong>? They will not be able to log in.</>}
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
            <button onClick={()=>setConfirm(null)} style={btn("ghost")}>Cancel</button>
            <button onClick={()=>confirm.type==="delete"?deleteUser(confirm.user.id):suspend(confirm.user.id)}
              style={btn(confirm.type==="delete"?"danger":"amber")}>
              {confirm.type==="delete"?"Delete User":"Suspend User"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function InviteModal({onClose,onInvite}){
  const [email,    setEmail]   = useState("");
  const [name,     setName]    = useState("");
  const [role,     setRole]    = useState("employee");
  const [dept,     setDept]    = useState("Finance");
  const [password, setPass]    = useState("");
  const [confirm,  setConfirm] = useState("");
  const [err,      setErr]     = useState("");

  const go=()=>{
    setErr("");
    if(!email) return setErr("Email is required.");
    if(!name)  return setErr("Full name is required.");
    if(password.length < 8) return setErr("Temporary password must be at least 8 characters.");
    if(password !== confirm) return setErr("Passwords do not match.");
    onInvite(email, name, role, dept, password);
    onClose();
  };

  return (
    <Modal title="Invite New User" sub="User will receive an email to access the platform" onClose={onClose} w={500}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div style={{gridColumn:"1/-1"}}>
            <label style={LBL}>Full Name</label>
            <input value={name} onChange={e=>setName(e.target.value)} style={inp()} placeholder="e.g. Adaeze Okonkwo"/>
          </div>
          <div style={{gridColumn:"1/-1"}}>
            <label style={LBL}>Email Address</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} style={inp()} placeholder="user@africaprudential.com"/>
          </div>
          <div>
            <label style={LBL}>Role</label>
            <select value={role} onChange={e=>setRole(e.target.value)} style={inp()}>
              {USER_ROLES.map(r=><option key={r} value={r}>{r.replace("_"," ")}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>Department</label>
            <select value={dept} onChange={e=>setDept(e.target.value)} style={inp()}>
              {["Finance","HR","IT","Operations","Legal","Facilities","Compliance"].map(d=><option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>Temporary Password</label>
            <input type="password" value={password} onChange={e=>setPass(e.target.value)} style={inp()} placeholder="Min 8 characters"/>
          </div>
          <div>
            <label style={LBL}>Confirm Password</label>
            <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} style={inp()} placeholder="Re-enter password"/>
          </div>
        </div>
        {err && <div style={{padding:"9px 13px",borderRadius:7,background:C.redBg,border:`1px solid ${C.red}30`,fontSize:13,color:C.red,fontWeight:500}}>{err}</div>}
        <div style={{padding:"10px 13px",borderRadius:7,background:C.blueBg,border:`1px solid ${C.blue}30`,fontSize:12,color:C.blue,fontWeight:600}}>
          📧 User will receive an invite email. They can log in immediately with the temporary password you set.
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:18,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
        <button onClick={onClose} style={btn("ghost")}>Cancel</button>
        <button onClick={go} style={btn("primary")}>Send Invitation</button>
      </div>
    </Modal>
  );
}

function EditUserModal({user,onClose,onSave}){
  const [d,setD]=useState({name:user.name,role:user.role,dept:user.dept});
  return (
    <Modal title="Edit User" sub={user.email} onClose={onClose} w={460}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div><label style={LBL}>Full Name</label><input value={d.name} onChange={e=>setD(p=>({...p,name:e.target.value}))} style={inp()}/></div>
        <div><label style={LBL}>Role</label>
          <select value={d.role} onChange={e=>setD(p=>({...p,role:e.target.value}))} style={inp()}>
            {USER_ROLES.map(r=><option key={r} value={r}>{r.replace("_"," ")}</option>)}
          </select>
        </div>
        <div><label style={LBL}>Department</label>
          <select value={d.dept} onChange={e=>setD(p=>({...p,dept:e.target.value}))} style={inp()}>
            {["Finance","HR","IT","Operations","Legal","Facilities","Compliance"].map(dep=><option key={dep} value={dep}>{dep}</option>)}
          </select>
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:18,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
        <button onClick={onClose} style={btn("ghost")}>Cancel</button>
        <button onClick={()=>{onSave(user.id,d);onClose()}} style={btn("primary")}>Save Changes</button>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════
// FLEET MANAGEMENT
// ══════════════════════════════════════════════════════════════
function FleetMgmt({ctx}){
  const {vehicles,setVehicles,drivers,addAudit,flash,tid}=ctx;
  const [f,setF]     = useState({});
  const [modal,setModal]=useState(null);

  const shown=vehicles.filter(v=>{
    if(f.status&&v.status!==f.status)return false;
    if(f.q){const q=f.q.toLowerCase();if(!v.model.toLowerCase().includes(q)&&!v.plate.toLowerCase().includes(q))return false;}
    return true;
  });

  const updateStatus=async(id,status)=>{
    try{
      await updateVehicle(id,{status});
      setVehicles(p=>p.map(v=>v.id!==id?v:{...v,status}));
      addAudit("VEHICLE_STATUS",id,`Status changed to ${vsm(status).l}`);
      flash(`Vehicle status updated to ${vsm(status).l}`);
    }catch(e){flash(e.message,"error");}
  };

  const addVehicle=async d=>{
    try{
      const rec={...d,id:genId("CAR"),tenant_id:tid,driver_id:null};
      const saved=await createVehicle(rec);
      setVehicles(p=>[...p,saved]);
      addAudit("VEHICLE_ADDED",saved.id,`${d.model} added`);flash("Vehicle added");
    }catch(e){flash(e.message,"error");}
  };

  const assignDriver=async(vId,dId)=>{
    try{
      await updateVehicle(vId,{driver_id:dId||null});
      setVehicles(p=>p.map(v=>v.id!==vId?v:{...v,driver_id:dId||null}));
      flash("Driver assignment updated");
    }catch(e){flash(e.message,"error");}
  };

  return (
    <div>
      <PageTitle title="Fleet Management" sub="Vehicles, status and driver assignments"
        action={<button onClick={()=>setModal("add")} style={btn("primary")}>+ Add Vehicle</button>}/>
      <Filters values={f} onChange={setF} fields={[
        {k:"q",     label:"Search",w:180,ph:"Plate or model…"},
        {k:"status",label:"Status",type:"select",w:170,opts:VEHICLE_STATUSES.map(s=>({v:s.v,l:s.l}))},
      ]}/>
      <div style={card(0)}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <TH cols={["Plate","Model","Year","Colour","Status","Assigned Driver","Last Updated",""]}/>
          <tbody>
            {shown.length===0?<tr><td colSpan={8}><Empty icon="🚗" title="No vehicles found"/></td></tr>
            :shown.map((v,i)=>{
              const drv=drivers.find(d=>d.id===v.driverId);
              return (
                <tr key={v.id} style={{borderBottom:i<shown.length-1?`1px solid #FAFAFA`:"none"}}>
                  <td style={{padding:"11px 14px",fontSize:12,fontWeight:700,color:C.ink}}>{v.plate}</td>
                  <td style={{padding:"11px 14px",fontSize:13,color:C.ink}}>{v.model}</td>
                  <td style={{padding:"11px 14px",fontSize:12,color:C.muted}}>{v.year}</td>
                  <td style={{padding:"11px 14px",fontSize:12,color:C.muted}}>{v.color}</td>
                  <td style={{padding:"11px 14px"}}>
                    <select value={v.status} onChange={e=>updateStatus(v.id,e.target.value)}
                      style={{border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 8px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:"#fff",color:vsm(v.status).color}}>
                      {VEHICLE_STATUSES.map(s=><option key={s.v} value={s.v}>{s.l}</option>)}
                    </select>
                  </td>
                  <td style={{padding:"11px 14px",fontSize:12,color:C.muted}}>
                    <select value={v.driverId||""} onChange={e=>assignDriver(v.id,e.target.value)}
                      style={{border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 8px",fontSize:11,cursor:"pointer",fontFamily:"inherit",background:"#fff",minWidth:130}}>
                      <option value="">— Unassigned —</option>
                      {drivers.filter(d=>d.status==="available"||d.id===v.driverId).map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </td>
                  <td style={{padding:"11px 14px",fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>{fmtD(v.lastUpdated)}</td>
                  <td style={{padding:"11px 14px"}}><button onClick={()=>setModal({edit:v})} style={{...btn("ghost"),fontSize:11,padding:"4px 8px"}}>Edit</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {modal==="add"&&<VehicleModal onClose={()=>setModal(null)} onSave={addVehicle}/>}
      {modal?.edit&&<VehicleModal vehicle={modal.edit} onClose={()=>setModal(null)} onSave={d=>{setVehicles(p=>p.map(v=>v.id!==modal.edit.id?v:{...v,...d,lastUpdated:now()}));flash("Vehicle updated");}}/>}
    </div>
  );
}

function VehicleModal({vehicle,onClose,onSave}){
  const [d,setD]=useState(vehicle?{plate:vehicle.plate,model:vehicle.model,year:vehicle.year,color:vehicle.color}:{plate:"",model:"",year:new Date().getFullYear(),color:"White"});
  return (
    <Modal title={vehicle?"Edit Vehicle":"Add Vehicle"} onClose={onClose} w={480}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={{gridColumn:"1/-1"}}><label style={LBL}>Plate Number</label><input value={d.plate} onChange={e=>setD(p=>({...p,plate:e.target.value}))} style={inp()} placeholder="e.g. AAA-001BE"/></div>
        <div><label style={LBL}>Model</label><input value={d.model} onChange={e=>setD(p=>({...p,model:e.target.value}))} style={inp()} placeholder="e.g. Toyota Camry"/></div>
        <div><label style={LBL}>Year</label><input type="number" value={d.year} onChange={e=>setD(p=>({...p,year:+e.target.value}))} style={inp()}/></div>
        <div><label style={LBL}>Colour</label><input value={d.color} onChange={e=>setD(p=>({...p,color:e.target.value}))} style={inp()} placeholder="e.g. Silver"/></div>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:18,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
        <button onClick={onClose} style={btn("ghost")}>Cancel</button>
        <button onClick={()=>{if(!d.plate||!d.model)return;onSave(d);onClose()}} style={btn("primary")}>{vehicle?"Save Changes":"Add Vehicle"}</button>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════
// DRIVER ROSTER
// ══════════════════════════════════════════════════════════════
function DriverRoster({ctx}){
  const {drivers,setDrivers,vehicles,addAudit,flash,tid}=ctx;
  const [f,setF]      = useState({});
  const [modal,setModal]=useState(null);

  const shown=drivers.filter(d=>{
    if(f.status&&d.status!==f.status)return false;
    if(f.q){const q=f.q.toLowerCase();if(!d.name.toLowerCase().includes(q)&&!d.license.toLowerCase().includes(q))return false;}
    return true;
  });

  const save=async d=>{
    try{
      if(d.id){
        const saved=await updateDriver(d.id,{name:d.name,license:d.license,phone:d.phone,status:d.status,vehicle_id:d.vehicleId||null});
        setDrivers(p=>p.map(r=>r.id!==d.id?r:saved));
        addAudit("DRIVER_UPDATED",d.id,"Driver details updated");flash("Driver updated");
      } else {
        const rec={...d,id:genId("DRV"),tenant_id:tid,vehicle_id:d.vehicleId||null};
        const saved=await createDriver(rec);
        setDrivers(p=>[...p,saved]);
        addAudit("DRIVER_ADDED",saved.id,`Driver ${d.name} registered`);flash("Driver added");
      }
    }catch(e){flash(e.message,"error");}
  };

  return (
    <div>
      <PageTitle title="Driver Roster" sub="Manage drivers, licences and vehicle assignments"
        action={<button onClick={()=>setModal({})} style={btn("primary")}>+ Register Driver</button>}/>
      <Filters values={f} onChange={setF} fields={[
        {k:"q",     label:"Search",  w:180,ph:"Name or licence…"},
        {k:"status",label:"Status",  type:"select",w:150,opts:DRIVER_STATUSES.map(s=>({v:s.v,l:s.l}))},
      ]}/>
      <div style={card(0)}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <TH cols={["Driver Name","Licence Number","Phone","Status","Assigned Vehicle","Last Updated",""]}/>
          <tbody>
            {shown.length===0?<tr><td colSpan={7}><Empty icon="🪪" title="No drivers found"/></td></tr>
            :shown.map((d,i)=>{
              const veh=vehicles.find(v=>v.id===d.vehicleId);
              return (
                <tr key={d.id} style={{borderBottom:i<shown.length-1?`1px solid #FAFAFA`:"none"}}>
                  <td style={{padding:"11px 14px"}}>
                    <div style={{display:"flex",gap:9,alignItems:"center"}}>
                      <Av i={d.name.split(" ").map(n=>n[0]).join("").slice(0,2)} s={28} bg={d.status==="suspended"||d.status==="resigned"?C.muted:C.blue}/>
                      <span style={{fontSize:13,fontWeight:600,color:C.ink}}>{d.name}</span>
                    </div>
                  </td>
                  <td style={{padding:"11px 14px",fontSize:12,color:C.muted,fontFamily:"monospace"}}>{d.license}</td>
                  <td style={{padding:"11px 14px",fontSize:12,color:C.muted}}>{d.phone}</td>
                  <td style={{padding:"11px 14px"}}><DChip s={d.status}/></td>
                  <td style={{padding:"11px 14px",fontSize:12,color:C.muted}}>{veh?`${veh.plate} · ${veh.model}`:"— Unassigned"}</td>
                  <td style={{padding:"11px 14px",fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>{fmtD(d.lastUpdated)}</td>
                  <td style={{padding:"11px 14px"}}><button onClick={()=>setModal(d)} style={{...btn("ghost"),fontSize:11,padding:"4px 8px"}}>Edit</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {modal!==null&&<DriverModal driver={modal.id?modal:null} vehicles={vehicles} onClose={()=>setModal(null)} onSave={save}/>}
    </div>
  );
}

function DriverModal({driver,vehicles,onClose,onSave}){
  const [d,setD]=useState(driver?{id:driver.id,name:driver.name,license:driver.license,phone:driver.phone,status:driver.status,vehicleId:driver.vehicleId||""}:{name:"",license:"",phone:"",status:"available",vehicleId:""});
  return (
    <Modal title={driver?"Edit Driver":"Register Driver"} onClose={onClose} w={500}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={{gridColumn:"1/-1"}}><label style={LBL}>Full Name</label><input value={d.name} onChange={e=>setD(p=>({...p,name:e.target.value}))} style={inp()} placeholder="Driver full name"/></div>
        <div><label style={LBL}>Licence Number</label><input value={d.license} onChange={e=>setD(p=>({...p,license:e.target.value}))} style={inp()} placeholder="LGA-2024-XXXX"/></div>
        <div><label style={LBL}>Phone</label><input value={d.phone} onChange={e=>setD(p=>({...p,phone:e.target.value}))} style={inp()} placeholder="+234 xxx xxxx xxx"/></div>
        <div><label style={LBL}>Status</label>
          <select value={d.status} onChange={e=>setD(p=>({...p,status:e.target.value}))} style={inp()}>
            {DRIVER_STATUSES.map(s=><option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        </div>
        <div><label style={LBL}>Assign Vehicle</label>
          <select value={d.vehicleId} onChange={e=>setD(p=>({...p,vehicleId:e.target.value}))} style={inp()}>
            <option value="">— No vehicle —</option>
            {vehicles.filter(v=>v.status!=="out_of_service").map(v=><option key={v.id} value={v.id}>{v.plate} · {v.model}</option>)}
          </select>
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:18,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
        <button onClick={onClose} style={btn("ghost")}>Cancel</button>
        <button onClick={()=>{if(!d.name||!d.license)return;onSave({...d,vehicleId:d.vehicleId||null});onClose()}} style={btn("primary")}>{driver?"Save Changes":"Register Driver"}</button>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════
// INVENTORY MANAGEMENT
// ══════════════════════════════════════════════════════════════
function InventoryMgmt({ctx}){
  const {inventory,setInv,addAudit,flash,tid}=ctx;
  const [f,setF]      = useState({});
  const [modal,setModal]=useState(null);

  const shown=inventory.filter(i=>{
    if(f.category&&i.category!==f.category)return false;
    if(f.q){const q=f.q.toLowerCase();if(!i.name.toLowerCase().includes(q)&&!i.code.toLowerCase().includes(q))return false;}
    return true;
  });
  const cats=[...new Set(inventory.map(i=>i.category))];

  const addItem=async d=>{
    try{
      const rec={...d,id:genId("INV"),tenant_id:tid};
      const saved=await createInventoryItem(rec);
      setInv(p=>[...p,saved]);addAudit("ITEM_ADDED",saved.id,`${d.name} added`);flash("Item added");
    }catch(e){flash(e.message,"error");}
  };
  const editItem=async(id,d)=>{
    try{
      const saved=await updateInventoryItem(id,d);
      setInv(p=>p.map(i=>i.id!==id?i:saved));
      addAudit("ITEM_UPDATED",id,"Item details updated");flash("Item updated");
    }catch(e){flash(e.message,"error");}
  };
  const adjustStock=async(id,qty,op)=>{
    try{
      const item=inventory.find(i=>i.id===id);
      const ns=op==="add"?item.stock+qty:Math.max(0,item.stock-qty);
      const saved=await updateInventoryItem(id,{stock:ns});
      setInv(p=>p.map(i=>i.id!==id?i:saved));
      addAudit("STOCK_ADJUSTED",id,`${item.name} stock: ${item.stock} → ${ns}`);
      flash("Stock adjusted");
    }catch(e){flash(e.message,"error");}
  };

  return (
    <div>
      <PageTitle title="Inventory" sub="Manage stationery and equipment stock"
        action={<button onClick={()=>setModal("add")} style={btn("primary")}>+ Add Item</button>}/>
      <Filters values={f} onChange={setF} fields={[
        {k:"q",       label:"Search",   w:200,ph:"Item name or code…"},
        {k:"category",label:"Category", type:"select",w:150,opts:cats.map(v=>({v,l:v}))},
      ]}/>
      {inventory.filter(i=>i.stock<5).length>0&&(
        <div style={{padding:"10px 14px",borderRadius:8,background:C.amberBg,border:`1px solid ${C.amber}40`,marginBottom:14,fontSize:12,color:C.amber,fontWeight:600}}>
          ⚠ {inventory.filter(i=>i.stock<5).length} item(s) are low on stock. Review and reorder as needed.
        </div>
      )}
      <div style={card(0)}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <TH cols={["Item Name","Item Code","Category","Units Available","Unit","Description","Last Updated",""]}/>
          <tbody>
            {shown.length===0?<tr><td colSpan={8}><Empty icon="📦" title="No items found"/></td></tr>
            :shown.map((item,i)=>(
              <tr key={item.id} style={{borderBottom:i<shown.length-1?`1px solid #FAFAFA`:"none"}}>
                <td style={{padding:"11px 14px",fontSize:13,fontWeight:600,color:C.ink}}>{item.name}</td>
                <td style={{padding:"11px 14px",fontSize:12,color:C.muted,fontFamily:"monospace"}}>{item.code}</td>
                <td style={{padding:"11px 14px"}}><span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:4,background:C.surface,color:C.ink2}}>{item.category}</span></td>
                <td style={{padding:"11px 14px"}}>
                  <span style={{fontSize:14,fontWeight:700,color:item.stock<5?C.red:C.ink}}>{item.stock}</span>
                  {item.stock<5&&<span style={{fontSize:10,color:C.red,marginLeft:4,fontWeight:600}}>LOW</span>}
                </td>
                <td style={{padding:"11px 14px",fontSize:12,color:C.muted}}>{item.unit}</td>
                <td style={{padding:"11px 14px",fontSize:12,color:C.muted,maxWidth:200}}><div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.desc}</div></td>
                <td style={{padding:"11px 14px",fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>{fmtD(item.lastUpdated)}</td>
                <td style={{padding:"11px 14px"}}>
                  <div style={{display:"flex",gap:5}}>
                    <button onClick={()=>setModal({adjust:item})} style={{...btn("ghost"),fontSize:11,padding:"4px 8px"}}>± Stock</button>
                    <button onClick={()=>setModal({edit:item})} style={{...btn("ghost"),fontSize:11,padding:"4px 8px"}}>Edit</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal==="add"&&<ItemModal onClose={()=>setModal(null)} onSave={addItem}/>}
      {modal?.edit&&<ItemModal item={modal.edit} onClose={()=>setModal(null)} onSave={d=>editItem(modal.edit.id,d)}/>}
      {modal?.adjust&&<StockModal item={modal.adjust} onClose={()=>setModal(null)} onSave={adjustStock}/>}
    </div>
  );
}

function ItemModal({item,onClose,onSave}){
  const [d,setD]=useState(item?{name:item.name,code:item.code,category:item.category,unit:item.unit,desc:item.desc,stock:item.stock}:{name:"",code:"",category:"Paper",unit:"unit",desc:"",stock:0});
  return (
    <Modal title={item?"Edit Item":"Add Inventory Item"} onClose={onClose} w={500}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={{gridColumn:"1/-1"}}><label style={LBL}>Item Name</label><input value={d.name} onChange={e=>setD(p=>({...p,name:e.target.value}))} style={inp()} placeholder="e.g. A4 Paper (Ream)"/></div>
        <div><label style={LBL}>Item Code</label><input value={d.code} onChange={e=>setD(p=>({...p,code:e.target.value}))} style={inp()} placeholder="e.g. STA-001"/></div>
        <div><label style={LBL}>Category</label>
          <select value={d.category} onChange={e=>setD(p=>({...p,category:e.target.value}))} style={inp()}>
            {["Paper","Writing","Equipment","Electronics","Consumables","Furniture"].map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div><label style={LBL}>Unit</label><input value={d.unit} onChange={e=>setD(p=>({...p,unit:e.target.value}))} style={inp()} placeholder="e.g. ream, box, unit"/></div>
        {!item&&<div><label style={LBL}>Initial Stock</label><input type="number" min={0} value={d.stock} onChange={e=>setD(p=>({...p,stock:+e.target.value}))} style={inp()}/></div>}
        <div style={{gridColumn:"1/-1"}}><label style={LBL}>Description</label><textarea value={d.desc} onChange={e=>setD(p=>({...p,desc:e.target.value}))} style={{...inp(),minHeight:64,resize:"vertical"}} placeholder="Brief description of the item…"/></div>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:18,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
        <button onClick={onClose} style={btn("ghost")}>Cancel</button>
        <button onClick={()=>{if(!d.name||!d.code)return;onSave(d);onClose()}} style={btn("primary")}>{item?"Save Changes":"Add Item"}</button>
      </div>
    </Modal>
  );
}

function StockModal({item,onClose,onSave}){
  const [qty,setQty]=useState(1);
  const [op,setOp]=useState("add");
  return (
    <Modal title="Adjust Stock" sub={item.name} onClose={onClose} w={400}>
      <div style={{marginBottom:14,display:"flex",gap:10}}>
        {[{v:"add",l:"Add Stock"},{v:"remove",l:"Remove Stock"}].map(o=>(
          <button key={o.v} onClick={()=>setOp(o.v)} style={{flex:1,padding:10,fontFamily:"inherit",
            border:`1.5px solid ${op===o.v?(o.v==="add"?C.green:C.red):C.border}`,borderRadius:7,
            background:op===o.v?(o.v==="add"?C.greenBg:C.redBg):"#fff",
            cursor:"pointer",fontSize:12,fontWeight:600,
            color:op===o.v?(o.v==="add"?C.green:C.red):C.muted}}>{o.v==="add"?"+ Add Stock":"− Remove Stock"}</button>
        ))}
      </div>
      <div style={{padding:"12px 14px",background:C.pageBg,borderRadius:8,marginBottom:14,display:"flex",justifyContent:"space-between",fontSize:13}}>
        <span style={{color:C.muted,fontWeight:600}}>Current stock:</span>
        <span style={{fontWeight:800,color:C.ink}}>{item.stock} {item.unit}s</span>
      </div>
      <div><label style={LBL}>Quantity to {op==="add"?"add":"remove"}</label>
        <input type="number" min={1} value={qty} onChange={e=>setQty(+e.target.value)} style={inp()}/>
      </div>
      <div style={{marginTop:10,padding:"10px 13px",borderRadius:7,background:op==="add"?C.greenBg:C.redBg,fontSize:13,fontWeight:600,color:op==="add"?C.green:C.red}}>
        New stock: {op==="add"?item.stock+qty:Math.max(0,item.stock-qty)} {item.unit}s
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:18,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
        <button onClick={onClose} style={btn("ghost")}>Cancel</button>
        <button onClick={()=>{onSave(item.id,qty,op);onClose()}} style={btn(op==="add"?"success":"danger")}>Confirm</button>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════
// CHANGE REQUESTS (Admin View)
// ══════════════════════════════════════════════════════════════
function CRAdmin({ctx}){
  const {crs,flash}=ctx;
  const [f,setF]=useState({});
  const [detail,setDetail]=useState(null);

  const shown=crs.filter(c=>{
    if(f.status&&c.status!==f.status)return false;
    if(f.changeType&&c.changeType!==f.changeType)return false;
    if(f.environment&&c.environment!==f.environment)return false;
    if(f.q){const q=f.q.toLowerCase();if(!c.title.toLowerCase().includes(q)&&!c.id.toLowerCase().includes(q))return false;}
    return true;
  });

  const USERS_MAP={U001:"Adaeze Okonkwo",U002:"Chukwuemeka Eze",U003:"Ngozi Adeyemi",U004:"Oluwaseun Balogun",U005:"Amaka Ihejirika",U006:"Tunde Fashola"};

  return (
    <div>
      <PageTitle title="Change Requests" sub="All change requests across the organisation"/>
      <Filters values={f} onChange={setF} fields={[
        {k:"q",         label:"Search",      w:180,ph:"CR ID or title…"},
        {k:"status",    label:"Status",      type:"select",w:160,opts:Object.entries(CR_STATUS).map(([v,m])=>({v,l:m.label}))},
        {k:"changeType",label:"Type",        type:"select",w:130,opts:["Standard","Normal","Emergency"].map(v=>({v,l:v}))},
        {k:"environment",label:"Environment",type:"select",w:130,opts:["Dev","Staging","Production"].map(v=>({v,l:v}))},
      ]}/>
      <div style={card(0)}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <TH cols={["Change ID","Title","Raised","Last Updated","Requested By","Type","Environment","Risk","Status",""]}/>
          <tbody>
            {shown.length===0?<tr><td colSpan={10}><Empty icon="🔍" title="No results"/></td></tr>
            :shown.map((c,i)=>(
              <tr key={c.id} style={{borderBottom:i<shown.length-1?`1px solid #FAFAFA`:"none",cursor:"pointer"}} onClick={()=>setDetail(c)}>
                <td style={{padding:"10px 14px",fontSize:11,fontWeight:700,color:C.ink,whiteSpace:"nowrap"}}>{c.id}</td>
                <td style={{padding:"10px 14px",fontSize:12,color:C.ink,maxWidth:200}}><div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.isEmergency&&<span style={{color:C.red,marginRight:4}}>⚡</span>}{c.title}</div></td>
                <td style={{padding:"10px 14px",fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>{fmtD(c.createdAt)}</td>
                <td style={{padding:"10px 14px",fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>{fmtD(c.updatedAt)}</td>
                <td style={{padding:"10px 14px",fontSize:11,color:C.muted}}>{USERS_MAP[c.initiator]||c.initiator}</td>
                <td style={{padding:"10px 14px",fontSize:11,color:C.muted}}>{c.changeType}</td>
                <td style={{padding:"10px 14px"}}><EnvTag e={c.environment}/></td>
                <td style={{padding:"10px 14px"}}><RiskTag r={c.riskLevel}/></td>
                <td style={{padding:"10px 14px"}}><CRChip s={c.status}/></td>
                <td style={{padding:"10px 14px",color:C.muted,fontSize:16}}>›</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{padding:"9px 14px",borderTop:`1px solid #FAFAFA`,fontSize:11,color:C.muted}}>{shown.length} of {crs.length} records</div>
      </div>

      {detail&&(
        <Modal title={detail.id} sub={detail.title} onClose={()=>setDetail(null)} w={720}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div style={{gridColumn:"1/-1",display:"flex",gap:8,flexWrap:"wrap",padding:"10px 12px",background:C.pageBg,borderRadius:8}}>
              <CRChip s={detail.status}/><EnvTag e={detail.environment}/><RiskTag r={detail.riskLevel}/>
              <span style={{fontSize:11,fontWeight:600,padding:"1px 7px",borderRadius:4,background:C.surface,color:C.ink2}}>{detail.changeType}</span>
              {detail.isEmergency&&<span style={{fontSize:11,fontWeight:700,color:C.red,background:C.redBg,padding:"2px 8px",borderRadius:4}}>⚡ Emergency</span>}
            </div>
            <div><label style={LBL}>System</label><div style={{fontSize:13,fontWeight:600,color:C.ink}}>{detail.system}</div></div>
            <div><label style={LBL}>Requested By</label><div style={{fontSize:13,color:C.ink}}>{USERS_MAP[detail.initiator]||detail.initiator}</div></div>
            <div><label style={LBL}>Created</label><div style={{fontSize:12,color:C.muted}}>{fmtDT(detail.createdAt)}</div></div>
            <div><label style={LBL}>Last Updated</label><div style={{fontSize:12,color:C.muted}}>{fmtDT(detail.updatedAt)}</div></div>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:18,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
            <button onClick={()=>flash("Reminder sent to all stakeholders")} style={{...btn("ghost"),color:C.blue,borderColor:C.blue+"30"}}>📧 Send Reminder</button>
            <button onClick={()=>setDetail(null)} style={btn("ghost")}>Close</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// CR POLICY
// ══════════════════════════════════════════════════════════════
function CRPolicy({ctx}){
  const {flash}=ctx;
  const [policy,setPolicy]=useState({
    standard: {stages:1,roles:["manager"],description:"Low-risk, pre-approved changes. Single manager approval."},
    normal:   {stages:2,roles:["manager","resource_team"],description:"Standard change workflow with multi-stage approval."},
    emergency:{stages:1,roles:["manager"],description:"Emergency bypass — senior approval only, no secondary review."},
    major:    {stages:3,roles:["manager","admin","resource_team"],description:"High-risk changes requiring full approval chain."},
  });

  const save=()=>{flash("Change management policy saved");};

  return (
    <div>
      <PageTitle title="Change Management Policy" sub="Configure approval workflows per change type"
        action={<button onClick={save} style={btn("primary")}>Save Policy</button>}/>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        {Object.entries(policy).map(([type,p])=>(
          <div key={type} style={card(20)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:C.ink,textTransform:"capitalize"}}>{type} Change</div>
                <div style={{fontSize:12,color:C.muted,marginTop:2}}>{p.description}</div>
              </div>
              <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,
                background:type==="emergency"?C.redBg:type==="major"?C.violetBg:type==="normal"?C.amberBg:C.greenBg,
                color:type==="emergency"?C.red:type==="major"?C.violet:type==="normal"?C.amber:C.green}}>
                {p.stages} stage{p.stages>1?"s":""}
              </span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <div>
                <label style={LBL}>Number of Approval Stages</label>
                <div style={{display:"flex",gap:8}}>
                  {[1,2,3].map(n=>(
                    <button key={n} onClick={()=>setPolicy(prev=>({...prev,[type]:{...p,stages:n}}))}
                      style={{width:40,height:36,border:`1.5px solid ${p.stages===n?C.brand:C.border}`,borderRadius:6,
                        background:p.stages===n?C.brandLt:"#fff",color:p.stages===n?C.brand:C.muted,
                        fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{n}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={LBL}>Approving Roles</label>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {["employee","manager","resource_team","admin"].map(role=>{
                    const active=p.roles.includes(role);
                    return (
                      <button key={role} onClick={()=>setPolicy(prev=>({...prev,[type]:{...p,roles:active?p.roles.filter(r=>r!==role):[...p.roles,role]}}))}
                        style={{padding:"5px 10px",border:`1.5px solid ${active?C.brand:C.border}`,borderRadius:6,
                          background:active?C.brandLt:"#fff",color:active?C.brand:C.muted,
                          fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",textTransform:"capitalize"}}>
                        {role.replace("_"," ")}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{gridColumn:"1/-1"}}>
                <label style={LBL}>Description</label>
                <input value={p.description} onChange={e=>setPolicy(prev=>({...prev,[type]:{...p,description:e.target.value}}))} style={inp()}/>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// NOTIFICATION POLICY
// ══════════════════════════════════════════════════════════════
function NotifPolicy({ctx}){
  const {flash}=ctx;
  const [triggers,setTriggers]=useState([
    {id:"T1",event:"CR Submitted",      enabled:true, channels:["email","in_app"],  template:"A new change request {cr_id} has been submitted by {user}.",   reminder:24},
    {id:"T2",event:"CR Approved (L1)",  enabled:true, channels:["email","in_app"],  template:"Change request {cr_id} has received L1 approval from {approver}.", reminder:0},
    {id:"T3",event:"CR Approved (L2)",  enabled:true, channels:["email"],           template:"Change request {cr_id} has received L2 approval. Awaiting review.", reminder:0},
    {id:"T4",event:"CR Scheduled",      enabled:true, channels:["email","in_app"],  template:"{cr_id} has been scheduled for deployment on {date} at {time}.",reminder:48},
    {id:"T5",event:"CR Rejected",       enabled:true, channels:["email","in_app"],  template:"Your change request {cr_id} has been rejected. Reason: {reason}.", reminder:0},
    {id:"T6",event:"Reminder: Approval",enabled:true, channels:["email"],           template:"Reminder: Change request {cr_id} is awaiting your approval.",     reminder:12},
    {id:"T7",event:"Low Inventory",     enabled:true, channels:["in_app"],          template:"{item} is running low on stock ({qty} remaining).",               reminder:72},
    {id:"T8",event:"Fleet Status Change",enabled:false,channels:["in_app"],         template:"Vehicle {plate} status changed to {status} by {user}.",           reminder:0},
  ]);
  const [editing,setEditing]=useState(null);

  const toggle=(id)=>setTriggers(p=>p.map(t=>t.id!==id?t:{...t,enabled:!t.enabled}));
  const toggleCh=(id,ch)=>setTriggers(p=>p.map(t=>t.id!==id?t:{...t,channels:t.channels.includes(ch)?t.channels.filter(c=>c!==ch):[...t.channels,ch]}));

  return (
    <div>
      <PageTitle title="Notification Policies" sub="Configure triggers, templates and reminder intervals"
        action={<button onClick={()=>flash("Notification policies saved")} style={btn("primary")}>Save Policies</button>}/>
      <div style={card(0)}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <TH cols={["Event","Enabled","Channels","Reminder (hrs)","Template",""]}/>
          <tbody>
            {triggers.map((t,i)=>(
              <tr key={t.id} style={{borderBottom:i<triggers.length-1?`1px solid #FAFAFA`:"none"}}>
                <td style={{padding:"12px 14px",fontSize:13,fontWeight:600,color:C.ink}}>{t.event}</td>
                <td style={{padding:"12px 14px"}}>
                  <div onClick={()=>toggle(t.id)} style={{width:40,height:22,borderRadius:11,
                    background:t.enabled?C.green:C.border,cursor:"pointer",position:"relative",transition:"background .2s"}}>
                    <div style={{position:"absolute",top:3,left:t.enabled?20:3,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
                  </div>
                </td>
                <td style={{padding:"12px 14px"}}>
                  <div style={{display:"flex",gap:6}}>
                    {["email","in_app"].map(ch=>(
                      <button key={ch} onClick={()=>toggleCh(t.id,ch)} style={{padding:"3px 8px",borderRadius:4,fontSize:11,fontWeight:600,fontFamily:"inherit",cursor:"pointer",
                        border:`1px solid ${t.channels.includes(ch)?C.blue:C.border}`,
                        background:t.channels.includes(ch)?C.blueBg:"transparent",
                        color:t.channels.includes(ch)?C.blue:C.muted}}>
                        {ch==="email"?"📧 Email":"🔔 In-App"}
                      </button>
                    ))}
                  </div>
                </td>
                <td style={{padding:"12px 14px"}}>
                  <input type="number" min={0} value={t.reminder}
                    onChange={e=>setTriggers(p=>p.map(tr=>tr.id!==t.id?tr:{...tr,reminder:+e.target.value}))}
                    style={{...inp(),width:70,padding:"5px 8px",fontSize:12}}/>
                </td>
                <td style={{padding:"12px 14px",fontSize:11,color:C.muted,maxWidth:280}}>
                  <div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.template}</div>
                </td>
                <td style={{padding:"12px 14px"}}>
                  <button onClick={()=>setEditing(t)} style={{...btn("ghost"),fontSize:11,padding:"4px 8px"}}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing&&(
        <Modal title="Edit Notification Template" sub={editing.event} onClose={()=>setEditing(null)} w={560}>
          <div style={{marginBottom:14,fontSize:11,color:C.muted,background:C.pageBg,borderRadius:6,padding:"8px 12px"}}>
            Available variables: <code style={{color:C.violet}}>{"{cr_id} {user} {approver} {date} {time} {reason} {item} {qty} {plate} {status}"}</code>
          </div>
          <div><label style={LBL}>Email Template</label>
            <textarea value={editing.template}
              onChange={e=>setEditing(p=>({...p,template:e.target.value}))}
              style={{...inp(),minHeight:100,resize:"vertical"}}/>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:18,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
            <button onClick={()=>setEditing(null)} style={btn("ghost")}>Cancel</button>
            <button onClick={()=>{setTriggers(p=>p.map(t=>t.id!==editing.id?t:editing));flash("Template saved");setEditing(null);}} style={btn("primary")}>Save Template</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// AUDIT LOG
// ══════════════════════════════════════════════════════════════
function AuditLog({ctx}){
  const {audit}=ctx;
  const [f,setF]=useState({});
  const shown=audit.filter(a=>{
    if(f.q){const q=f.q.toLowerCase();if(!a.action.toLowerCase().includes(q)&&!a.target.toLowerCase().includes(q)&&!a.detail.toLowerCase().includes(q))return false;}
    return true;
  });
  const actColor=a=>a.includes("DELETE")||a.includes("SUSPEND")||a.includes("EMERGENCY")?C.red:a.includes("ADDED")||a.includes("INVITED")||a.includes("CREAT")?C.green:C.blue;
  return (
    <div>
      <PageTitle title="Audit Log" sub="System-wide activity and change history"/>
      <Filters values={f} onChange={setF} fields={[{k:"q",label:"Search",w:250,ph:"Action, target, or detail…"}]}/>
      <div style={card(0)}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <TH cols={["Timestamp","Action","Target","Detail","Performed By"]}/>
          <tbody>
            {shown.length===0?<tr><td colSpan={5}><Empty icon="📋" title="No audit entries found"/></td></tr>
            :shown.map((a,i)=>(
              <tr key={a.id} style={{borderBottom:i<shown.length-1?`1px solid #FAFAFA`:"none"}}>
                <td style={{padding:"10px 14px",fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>{fmtDT(a.at)}</td>
                <td style={{padding:"10px 14px"}}>
                  <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:4,background:actColor(a.action)+"14",color:actColor(a.action),letterSpacing:".02em"}}>{a.action}</span>
                </td>
                <td style={{padding:"10px 14px",fontSize:12,color:C.ink,fontWeight:600}}>{a.target}</td>
                <td style={{padding:"10px 14px",fontSize:12,color:C.muted}}>{a.detail}</td>
                <td style={{padding:"10px 14px",fontSize:11,color:C.muted}}>Oluwaseun Balogun</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{padding:"9px 14px",borderTop:`1px solid #FAFAFA`,fontSize:11,color:C.muted}}>{shown.length} entries</div>
      </div>
    </div>
  );
}