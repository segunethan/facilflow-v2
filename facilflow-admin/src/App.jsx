import { supabase } from "./lib/supabase.js";
import { fetchUsers, updateUser, deleteUser, fetchVehicles, createVehicle, updateVehicle, fetchDrivers, createDriver, updateDriver, fetchInventory, createInventoryItem, updateInventoryItem, fetchRequests, updateRequest, fetchCRs, updateCR, fetchAuditLog, addAuditEntry, fetchChangeRoles, fetchUserChangeRoles, assignChangeRole, removeChangeRole, fetchApprovalLevels, saveApprovalLevel, deleteApprovalLevel, fetchTenantConfig, saveTenantConfig } from "./lib/supabase.js";
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
const normCR  = cr => cr ? ({...cr, changeType:cr.change_type??cr.changeType, riskLevel:cr.risk_level??cr.riskLevel, deployDate:cr.deploy_date??cr.deployDate, deployStart:cr.deploy_start??cr.deployStart, deployEnd:cr.deploy_end??cr.deployEnd, isEmergency:cr.is_emergency??cr.isEmergency, systemName:cr.system_name??cr.systemName, createdAt:cr.created_at??cr.createdAt, updatedAt:cr.updated_at??cr.updatedAt }) : cr;
const normVeh = v  => v  ? ({...v,  driverId:v.driver_id??v.driverId, lastUpdated:v.updated_at??v.lastUpdated, createdAt:v.created_at??v.createdAt }) : v;
const normDrv = d  => d  ? ({...d,  vehicleId:d.vehicle_id??d.vehicleId, lastUpdated:d.updated_at??d.lastUpdated, createdAt:d.created_at??d.createdAt }) : d;
const normInv = i  => i  ? ({...i,  desc:i.description??i.desc, lastUpdated:i.updated_at??i.lastUpdated, createdAt:i.created_at??i.createdAt }) : i;
const normAudit = a => a ? ({...a,  at:a.created_at??a.at, by:a.performed_by??a.by }) : a;
const fmtSafe = d => { if(!d) return "—"; const dt = new Date(d); return isNaN(dt) ? "—" : dt.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}); };

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
    {k:"change_requests", l:"Change Requests",  icon:"⟳"},
    {k:"cr_policy",       l:"CR Policy",        icon:"⚙"},
    {k:"change_config",   l:"Change Config",    icon:"🔧"},
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
  const [audit,       setAudit]      = useState([]);
  const [changeRoles,   setChangeRoles]   = useState([]);
  const [userCRoles,    setUserCRoles]    = useState([]);
  const [approvalLevels,setApprovalLevels]= useState([]);
  const [tenantConfig,  setTenantConfig]  = useState(null);
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

    // Load change management config (non-fatal)
    Promise.all([
      fetchChangeRoles(),
      fetchUserChangeRoles(tid),
      fetchApprovalLevels(tid),
      fetchTenantConfig(tid),
    ]).then(([cr2,ucr,al2,tc])=>{
      setChangeRoles(cr2||[]);
      setUserCRoles(ucr||[]);
      setApprovalLevels(al2||[]);
      setTenantConfig(tc);
    }).catch(e=>console.warn("Change config load:", e.message));
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
    changeRoles, setChangeRoles,
    userCRoles, setUserCRoles,
    approvalLevels, setApprovalLevels,
    tenantConfig, setTenantConfig,
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
          {page==="change_config"   && <ChangeConfig  ctx={ctx}/>}
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
  const {requests,setRequests,users,vehicles,drivers,inventory,addAudit,flash,uid}=ctx;

  // ── FILTER STATE ─────────────────────────────────────────
  const [search,    setSearch]    = useState("");
  const [fStatus,   setFStatus]   = useState("");
  const [fType,     setFType]     = useState("");
  const [fDept,     setFDept]     = useState("");
  const [fUser,     setFUser]     = useState("");
  const [fDriver,   setFDriver]   = useState("");
  const [fVehicle,  setFVehicle]  = useState("");
  const [fItem,     setFItem]     = useState("");
  const [fDateFrom, setFDateFrom] = useState("");
  const [fDateTo,   setFDateTo]   = useState("");
  const [pageSize,  setPageSize]  = useState(25);
  const [page,      setPage]      = useState(1);
  const [selected,  setSel]       = useState(null);

  const usersMap = {};
  (users||[]).forEach(u=>{ usersMap[u.id]=u; });

  const allReqs = requests||[];

  // ── METRICS (always on full dataset) ─────────────────────
  const totalReqs     = allReqs.length;
  const pendingAppr   = allReqs.filter(r=>r.status==="pending_approval").length;
  const pendingProc   = allReqs.filter(r=>r.status==="approved").length;
  const activeFleet   = (vehicles||[]).filter(v=>v.status==="in_use").length;
  const completed     = allReqs.filter(r=>["delivered","fulfilled","completed"].includes(r.status)).length;

  // ── FILTER LOGIC ──────────────────────────────────────────
  const filtered = useMemo(()=>{
    const q = search.toLowerCase();
    return allReqs.filter(r=>{
      const sub = usersMap[r.submitted_by];
      const veh = r.assigned_vehicle ? (vehicles||[]).find(v=>v.id===r.assigned_vehicle) : null;
      const drv = r.assigned_driver  ? (drivers||[]).find(d=>d.id===r.assigned_driver)  : null;
      const items = (r.details?.items||[]).map(it=>(inventory||[]).find(x=>x.id===it.id)?.name||"").join(" ");

      if(fStatus  && r.status!==fStatus)  return false;
      if(fType    && r.type!==fType)      return false;
      if(fDept    && sub?.dept!==fDept)   return false;
      if(fUser    && r.submitted_by!==fUser) return false;
      if(fDriver  && r.assigned_driver!==fDriver) return false;
      if(fVehicle && r.assigned_vehicle!==fVehicle) return false;
      if(fItem    && !(r.details?.items||[]).some(it=>it.id===fItem)) return false;
      if(fDateFrom && new Date(r.created_at) < new Date(fDateFrom)) return false;
      if(fDateTo   && new Date(r.created_at) > new Date(fDateTo+"T23:59:59")) return false;
      if(q){
        const haystack = [r.id, sub?.name||"", veh?.plate||"", drv?.name||"", items].join(" ").toLowerCase();
        if(!haystack.includes(q)) return false;
      }
      return true;
    });
  },[allReqs,search,fStatus,fType,fDept,fUser,fDriver,fVehicle,fItem,fDateFrom,fDateTo,usersMap,vehicles,drivers,inventory]);

  const totalPages = Math.max(1, Math.ceil(filtered.length/pageSize));
  const paged = filtered.slice((page-1)*pageSize, page*pageSize);

  // Reset to page 1 when filters change
  const resetPage = fn => (...args) => { fn(...args); setPage(1); };

  // ── ACTIONS ───────────────────────────────────────────────
  const actionReq = async (id, newStatus, note="") => {
    try {
      const req = allReqs.find(r=>r.id===id);
      const now = new Date().toISOString();
      const history = [...(req.history||[]), {s:newStatus, at:now, by:uid, note}];
      const updates = {
        status: newStatus,
        history,
        ...(newStatus==="approved" ? {approved_by:uid, approved_at:now} : {}),
      };
      const saved = await updateRequest(id, updates);
      setRequests(p=>p.map(r=>r.id===id ? saved : r));
      addAudit("REQUEST_"+newStatus.toUpperCase(), id, `Request ${id} → ${newStatus}`);
      flash(`Request ${newStatus.replace(/_/g," ")}`);
      setSel(null);
      const requester = usersMap[req.submitted_by];
      if(requester?.email){
        try {
          const template = newStatus === "approved" ? "request_approved" : "request_rejected";
          const { data:emailData, error:emailErr } = await supabase.functions.invoke("send-email",{body:{
            template,
            to: requester.email,
            data:{
              requester_name: requester.name,
              request_id:     req.id,
              type:           req.type==="pool_car" ? "Pool Car" : "Stationery",
              title:          req.title,
              approver:       usersMap[uid]?.name || "Admin",
              approved_at:    new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}),
              reason:         note || null,
              app_url:        "https://facilflowuser.vercel.app",
            }
          }});
          if(emailErr) flash(`Request ${newStatus} but email failed: ${emailErr.message}`,"error");
          else if(emailData?.error) flash(`Request ${newStatus} but email failed: ${JSON.stringify(emailData.error)}`,"error");
        } catch(emailEx){ flash(`Request ${newStatus} but email error: ${emailEx.message}`,"error"); }
      }
    } catch(e){ flash(e.message,"error"); }
  };

  const assignVehicle = async (id, vehicleId, driverId) => {
    try {
      const req = allReqs.find(r=>r.id===id);
      const now = new Date().toISOString();
      const history = [...(req.history||[]), {s:"approved", at:now, by:uid, note:"Vehicle & driver assigned"}];
      const saved = await updateRequest(id, {status:"approved", history, approved_by:uid, approved_at:now, assigned_vehicle:vehicleId, assigned_driver:driverId||null});
      if(vehicleId) await updateVehicle(vehicleId,{status:"in_use"});
      setRequests(p=>p.map(r=>r.id===id ? saved : r));
      addAudit("REQUEST_ASSIGNED", id, `Vehicle assigned to ${id}`);
      flash("Vehicle assigned & request approved");
      setSel(null);
      const requester = usersMap[req.submitted_by];
      const veh = (vehicles||[]).find(v=>v.id===vehicleId);
      const drv = driverId ? (drivers||[]).find(d=>d.id===driverId) : null;
      if(requester?.email){
        try {
          const { data:emailData, error:emailErr } = await supabase.functions.invoke("send-email",{body:{
            template:"request_approved",
            to: requester.email,
            data:{
              requester_name: requester.name,
              request_id:     req.id,
              type:           "Pool Car",
              title:          req.title,
              approver:       usersMap[uid]?.name || "Admin",
              approved_at:    new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}),
              vehicle:        veh ? `${veh.plate} — ${veh.model} (${veh.color})` : null,
              driver:         drv ? `${drv.name} · ${drv.phone}` : null,
              app_url:        "https://facilflowuser.vercel.app",
            }
          }});
          if(emailErr) flash(`Request approved but email failed: ${emailErr.message}`,"error");
          else if(emailData?.error) flash(`Request approved but email failed: ${JSON.stringify(emailData.error)}`,"error");
        } catch(emailEx){ flash(`Request approved but email error: ${emailEx.message}`,"error"); }
      }
    } catch(e){ flash(e.message,"error"); }
  };

  const markDelivered = async (id) => {
    try {
      const req = allReqs.find(r=>r.id===id);
      const now = new Date().toISOString();
      const isCarReq = req.type === "pool_car";
      const statusLabel = isCarReq ? "completed" : "delivered";
      const noteLabel   = isCarReq ? "Trip completed, vehicle returned" : "Items delivered";
      const history = [...(req.history||[]), {s:statusLabel, at:now, by:uid, note:noteLabel}];
      const saved = await updateRequest(id, {status:statusLabel, history, delivered_at:now});
      // Reset vehicle back to available when trip is complete
      if(isCarReq && req.assigned_vehicle){
        await updateVehicle(req.assigned_vehicle, {status:"available"});
        setVehicles(p=>p.map(v=>v.id===req.assigned_vehicle ? {...v,status:"available"} : v));
      }
      setRequests(p=>p.map(r=>r.id===id ? saved : r));
      addAudit("REQUEST_DELIVERED", id, `Request ${id} marked ${statusLabel}`);
      flash("Marked as delivered");
      setSel(null);
    } catch(e){ flash(e.message,"error"); }
  };

  // ── CSV EXPORT ────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ["ID","Type","Requester","Department","Date Requested","Approval Date","Status","Assigned Vehicle","Assigned Driver"];
    const rows = filtered.map(r=>{
      const sub = usersMap[r.submitted_by];
      const veh = r.assigned_vehicle ? (vehicles||[]).find(v=>v.id===r.assigned_vehicle) : null;
      const drv = r.assigned_driver  ? (drivers||[]).find(d=>d.id===r.assigned_driver)  : null;
      return [
        r.id,
        r.type==="pool_car"?"Pool Car":"Stationery",
        sub?.name||"",
        sub?.dept||"",
        r.created_at ? new Date(r.created_at).toLocaleDateString("en-GB") : "",
        r.approved_at ? new Date(r.approved_at).toLocaleDateString("en-GB") : "",
        r.status.replace(/_/g," "),
        veh ? `${veh.plate} ${veh.model}` : "",
        drv?.name||"",
      ];
    });
    const csv = [headers,...rows].map(r=>r.map(v=>`"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv],{type:"text/csv"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href=url; a.download=`facility-requests-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ── STATUS COLOR ──────────────────────────────────────────
  const statusColor = s => {
    const map = {
      pending_approval:{bg:"#FFF7ED",color:"#B45309"},
      approved:        {bg:"#ECFDF5",color:"#065F46"},
      rejected:        {bg:"#FEF2F2",color:"#991B1B"},
      in_progress:     {bg:"#EFF6FF",color:"#1D4ED8"},
      delivered:       {bg:"#F0FDF4",color:"#15803D"},
      fulfilled:       {bg:"#EFF6FF",color:"#1D4ED8"},
      cancelled:       {bg:"#F8FAFC",color:"#475569"},
    };
    return map[s]||{bg:"#F8FAFC",color:"#475569"};
  };

  // ── UNIQUE VALUES FOR FILTER DROPDOWNS ────────────────────
  const depts   = [...new Set((users||[]).map(u=>u.dept).filter(Boolean))].sort();
  const invItems = inventory||[];

  const clearFilters = () => {
    setSearch(""); setFStatus(""); setFType(""); setFDept(""); setFUser("");
    setFDriver(""); setFVehicle(""); setFItem(""); setFDateFrom(""); setFDateTo(""); setPage(1);
  };
  const hasFilters = search||fStatus||fType||fDept||fUser||fDriver||fVehicle||fItem||fDateFrom||fDateTo;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <PageTitle title="Facility Requests" sub="Pool car and stationery requests across the organisation"/>

      {/* ── METRIC CARDS ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12}}>
        {[
          {label:"Total Requests",        value:totalReqs,   sub:"All time",                  active:!fStatus,             onClick:()=>resetPage(setFStatus)("")},
          {label:"Pending Approval",       value:pendingAppr, sub:"Awaiting manager sign-off",  active:fStatus==="pending_approval", onClick:()=>resetPage(setFStatus)(fStatus==="pending_approval"?"":"pending_approval")},
          {label:"Pending Processing",     value:pendingProc, sub:"Approved, needs fulfillment",active:fStatus==="approved",         onClick:()=>resetPage(setFStatus)(fStatus==="approved"?"":"approved")},
          {label:"Active Fleet",           value:activeFleet, sub:"Vehicles currently in use",  active:false,                onClick:()=>{}},
          {label:"Completed",              value:completed,   sub:"Delivered or fulfilled",     active:fStatus==="delivered",        onClick:()=>resetPage(setFStatus)(fStatus==="delivered"?"":"delivered")},
        ].map(({label,value,sub,active,onClick})=>(
          <div key={label} onClick={onClick} style={{
            background:"#fff", border:`1.5px solid ${active?C.brand:C.border}`,
            borderRadius:10, padding:"14px 16px", cursor:"pointer",
            boxShadow: active?`0 0 0 3px ${C.brand}18`:"none",
            transition:"all .15s",
          }}>
            <div style={{fontSize:26,fontWeight:800,color:active?C.brand:C.ink,letterSpacing:"-.03em",lineHeight:1}}>{value}</div>
            <div style={{fontSize:12,fontWeight:700,color:active?C.brand:C.ink,marginTop:6}}>{label}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ── FILTER PANEL ── */}
      <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 16px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <span style={{fontSize:12,fontWeight:700,color:C.ink}}>Filters</span>
          {hasFilters&&<button onClick={clearFilters} style={{...btn("ghost"),fontSize:11,padding:"3px 10px",color:C.red}}>✕ Clear all</button>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:10}}>
          <div>
            <label style={LBL}>Request Type</label>
            <select value={fType} onChange={e=>resetPage(setFType)(e.target.value)} style={inp()}>
              <option value="">All Types</option>
              <option value="pool_car">Pool Car</option>
              <option value="stationary">Stationery</option>
            </select>
          </div>
          <div>
            <label style={LBL}>Approval Status</label>
            <select value={fStatus} onChange={e=>resetPage(setFStatus)(e.target.value)} style={inp()}>
              <option value="">All Statuses</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="in_progress">In Progress</option>
              <option value="delivered">Delivered</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label style={LBL}>Department</label>
            <select value={fDept} onChange={e=>resetPage(setFDept)(e.target.value)} style={inp()}>
              <option value="">All Departments</option>
              {depts.map(d=><option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>Requester</label>
            <select value={fUser} onChange={e=>resetPage(setFUser)(e.target.value)} style={inp()}>
              <option value="">All Users</option>
              {(users||[]).filter(u=>u.role!=="admin").map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>Assigned Vehicle</label>
            <select value={fVehicle} onChange={e=>resetPage(setFVehicle)(e.target.value)} style={inp()}>
              <option value="">Any Vehicle</option>
              {(vehicles||[]).map(v=><option key={v.id} value={v.id}>{v.plate} — {v.model}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>Assigned Driver</label>
            <select value={fDriver} onChange={e=>resetPage(setFDriver)(e.target.value)} style={inp()}>
              <option value="">Any Driver</option>
              {(drivers||[]).map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label style={LBL}>Inventory Item</label>
            <select value={fItem} onChange={e=>resetPage(setFItem)(e.target.value)} style={inp()}>
              <option value="">Any Item</option>
              {invItems.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <div style={{display:"flex",gap:6}}>
            <div style={{flex:1}}>
              <label style={LBL}>Date From</label>
              <input type="date" value={fDateFrom} onChange={e=>resetPage(setFDateFrom)(e.target.value)} style={inp()}/>
            </div>
            <div style={{flex:1}}>
              <label style={LBL}>Date To</label>
              <input type="date" value={fDateTo} onChange={e=>resetPage(setFDateTo)(e.target.value)} style={inp()}/>
            </div>
          </div>
        </div>
      </div>

      {/* ── SEARCH + EXPORT BAR ── */}
      <div style={{display:"flex",gap:10,alignItems:"center"}}>
        <div style={{flex:1,position:"relative"}}>
          <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:C.muted,fontSize:14}}>🔍</span>
          <input
            value={search}
            onChange={e=>resetPage(setSearch)(e.target.value)}
            placeholder="Search by request ID, requester name, vehicle plate, driver, item…"
            style={{...inp(),paddingLeft:32,width:"100%"}}
          />
        </div>
        <div style={{fontSize:12,color:C.muted,whiteSpace:"nowrap"}}>{filtered.length} result{filtered.length!==1?"s":""}</div>
        <button onClick={exportCSV} style={{...btn("ghost"),fontSize:12,padding:"7px 14px",whiteSpace:"nowrap"}}>⬇ Export CSV</button>
      </div>

      {/* ── TABLE ── */}
      <div style={card(0)}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <TH cols={["ID","Type","Requester","Dept","Date Requested","Last Updated","Status","Resource","Action"]}/>
          <tbody>
            {paged.length===0&&(
              <tr><td colSpan={9} style={{padding:"48px",textAlign:"center",color:C.muted,fontSize:13}}>
                {hasFilters?"No requests match your filters.":"No requests yet."}
              </td></tr>
            )}
            {paged.map((r,i)=>{
              const sub = usersMap[r.submitted_by];
              const veh = r.assigned_vehicle ? (vehicles||[]).find(v=>v.id===r.assigned_vehicle) : null;
              const drv = r.assigned_driver  ? (drivers||[]).find(d=>d.id===r.assigned_driver)  : null;
              const sc  = statusColor(r.status);
              const resource = veh
                ? `${veh.plate}${drv?` · ${drv.name.split(" ")[0]}`:""}`
                : r.type!=="pool_car" && (r.details?.items||[]).length>0
                  ? `${(r.details.items||[]).length} item${(r.details.items||[]).length>1?"s":""}`
                  : "—";
              return (
                <tr key={r.id}
                  onClick={()=>setSel(r)}
                  style={{borderBottom:i<paged.length-1?`1px solid #F1F5F9`:"none",cursor:"pointer"}}
                >
                  <td style={{padding:"11px 14px",fontSize:11,fontWeight:700,color:C.ink}}>{r.id}</td>
                  <td style={{padding:"11px 14px"}}>
                    <span style={{fontSize:11,fontWeight:600,padding:"3px 8px",borderRadius:5,
                      background:r.type==="pool_car"?"#FEF2F2":"#EFF6FF",
                      color:r.type==="pool_car"?C.brand:"#2563EB"}}>
                      {r.type==="pool_car"?"🚗 Pool Car":"✏️ Stationery"}
                    </span>
                  </td>
                  <td style={{padding:"11px 14px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      <Av i={sub?.initials||"?"} s={26}/>
                      <span style={{fontSize:12,fontWeight:600,color:C.ink}}>{sub?.name||"Unknown"}</span>
                    </div>
                  </td>
                  <td style={{padding:"11px 14px",fontSize:11,color:C.muted}}>{sub?.dept||"—"}</td>
                  <td style={{padding:"11px 14px",fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>
                    {r.created_at ? new Date(r.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) : "—"}
                  </td>
                  <td style={{padding:"11px 14px",fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>
                    {r.updated_at ? new Date(r.updated_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) : "—"}
                  </td>
                  <td style={{padding:"11px 14px"}}>
                    <span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,background:sc.bg,color:sc.color,textTransform:"capitalize",whiteSpace:"nowrap"}}>
                      {r.status.replace(/_/g," ")}
                    </span>
                  </td>
                  <td style={{padding:"11px 14px",fontSize:11,color:C.muted}}>{resource}</td>
                  <td style={{padding:"11px 14px"}}>
                    <button
                      onClick={e=>{e.stopPropagation();setSel(r);}}
                      style={{...btn(r.status==="pending_approval"?"primary":"ghost"),fontSize:11,padding:"4px 12px"}}>
                      {r.status==="pending_approval"?"Action →":"View →"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ── PAGINATION ── */}
        <div style={{padding:"12px 16px",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:11,color:C.muted}}>Rows per page:</span>
            <select value={pageSize} onChange={e=>{setPageSize(+e.target.value);setPage(1);}} style={{...inp(),width:70,padding:"4px 8px",fontSize:12}}>
              {[10,25,50,100].map(n=><option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div style={{fontSize:11,color:C.muted}}>
            {filtered.length===0?"0 results":`${(page-1)*pageSize+1}–${Math.min(page*pageSize,filtered.length)} of ${filtered.length}`}
          </div>
          <div style={{display:"flex",gap:4}}>
            <button onClick={()=>setPage(1)}      disabled={page===1}          style={{...btn("ghost"),padding:"4px 8px",fontSize:12,opacity:page===1?.4:1}}>«</button>
            <button onClick={()=>setPage(p=>p-1)} disabled={page===1}          style={{...btn("ghost"),padding:"4px 8px",fontSize:12,opacity:page===1?.4:1}}>‹</button>
            {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
              const pg = Math.max(1,Math.min(page-2,totalPages-4))+i;
              if(pg<1||pg>totalPages) return null;
              return <button key={pg} onClick={()=>setPage(pg)} style={{...btn(pg===page?"primary":"ghost"),padding:"4px 10px",fontSize:12,minWidth:32}}>{pg}</button>;
            })}
            <button onClick={()=>setPage(p=>p+1)} disabled={page===totalPages} style={{...btn("ghost"),padding:"4px 8px",fontSize:12,opacity:page===totalPages?.4:1}}>›</button>
            <button onClick={()=>setPage(totalPages)} disabled={page===totalPages} style={{...btn("ghost"),padding:"4px 8px",fontSize:12,opacity:page===totalPages?.4:1}}>»</button>
          </div>
        </div>
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
  const [vehId, setVehId] = useState(req.assigned_vehicle||"");
  const [drvId, setDrvId] = useState(req.assigned_driver||"");
  const [tab,   setTab]   = useState("details");

  const submitter  = usersMap[req.submitted_by];
  const isPending  = req.status==="pending_approval";
  const isApproved = req.status==="approved";
  const isCarReq   = req.type==="pool_car";
  // For pending: only show available. For approved: show available + currently assigned
  const availVeh   = vehicles.filter(v=>v.status==="available" || v.id===req.assigned_vehicle);
  const availDrv   = drivers.filter(d=>d.status==="available"  || d.id===req.assigned_driver);
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
          <div style={{fontSize:11,color:C.muted}}>Submitted {req.created_at ? new Date(req.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) : "—"}</div>
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
          {assignedVeh&&(
            <div style={{background:"#ECFDF5",border:`1px solid #059669`,borderRadius:8,padding:12}}>
              <div style={{fontSize:11,fontWeight:700,color:"#059669",marginBottom:8}}>✅ Vehicle Assigned</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div><div style={{fontSize:10,color:"#059669",fontWeight:700,marginBottom:2}}>VEHICLE</div><div style={{fontSize:13,color:C.ink,fontWeight:600}}>{assignedVeh.plate} — {assignedVeh.model}</div></div>
                {assignedDrv&&<div><div style={{fontSize:10,color:"#059669",fontWeight:700,marginBottom:2}}>DRIVER</div><div style={{fontSize:13,color:C.ink,fontWeight:600}}>{assignedDrv.name}<br/><span style={{fontSize:11,color:C.muted}}>{assignedDrv.phone}</span></div></div>}
              </div>
            </div>
          )}
          {(isPending||isApproved)&&isCarReq&&(
            <div style={{border:`1px solid ${isApproved?C.green:C.border}`,borderRadius:8,padding:14,background:isApproved?"#F0FDF4":"#fff"}}>
              <div style={{fontSize:13,fontWeight:700,color:isApproved?C.green:C.ink,marginBottom:12}}>
                🚗 {isApproved?"Change Vehicle / Driver Assignment":"Assign Vehicle & Driver"}
              </div>
              {availVeh.length===0 && !assignedVeh
                ? <div style={{fontSize:13,color:C.muted}}>No vehicles available right now.</div>
                : <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:4}}>
                    <div>
                      <label style={LBL}>Vehicle {isPending&&<span style={{color:C.red}}>*</span>}</label>
                      <select value={vehId} onChange={e=>setVehId(e.target.value)} style={inp()}>
                        <option value="">Select vehicle…</option>
                        {availVeh.map(v=><option key={v.id} value={v.id}>{v.plate} — {v.model} ({v.color}){v.id===req.assigned_vehicle?" (currently assigned)":""}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={LBL}>Driver (optional)</label>
                      <select value={drvId} onChange={e=>setDrvId(e.target.value)} style={inp()}>
                        <option value="">No driver</option>
                        {availDrv.map(d=><option key={d.id} value={d.id}>{d.name} — {d.phone}{d.id===req.assigned_driver?" (currently assigned)":""}</option>)}
                      </select>
                    </div>
                  </div>
              }
              {isApproved&&<div style={{fontSize:11,color:C.green,marginTop:6}}>Changing assignment will notify the requester by email.</div>}
            </div>
          )}
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

      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:18,paddingTop:14,borderTop:`1px solid ${C.border}`}}>
        <button onClick={onClose} style={btn("ghost")}>Close</button>
        {isPending&&isCarReq&&(
          <>
            <button onClick={()=>onAction(req.id,"rejected",note)} style={btn("danger")}>Reject</button>
            <button onClick={()=>vehId&&onAssign(req.id,vehId,drvId)} disabled={!vehId} style={{...btn("primary"),opacity:vehId?1:0.5}}>Assign & Approve →</button>
          </>
        )}
        {isPending&&!isCarReq&&(
          <>
            <button onClick={()=>onAction(req.id,"rejected",note)} style={btn("danger")}>Reject</button>
            <button onClick={()=>onAction(req.id,"approved",note)} style={btn("primary")}>✓ Approve</button>
          </>
        )}
        {isApproved&&!isCarReq&&<button onClick={()=>onDeliver(req.id)} style={{...btn("primary"),background:"#059669"}}>📦 Mark Delivered</button>}
        {isApproved&&isCarReq&&(
          <>
            {vehId&&vehId!==req.assigned_vehicle&&(
              <button onClick={()=>onAssign(req.id,vehId,drvId)} style={{...btn("primary"),background:C.blue}}>🔄 Update Assignment</button>
            )}
            <button onClick={()=>onDeliver(req.id)} style={{...btn("primary"),background:"#059669"}}>✅ Mark Complete</button>
          </>
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
                <td style={{padding:"11px 14px",fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>{fmtSafe(u.created_at)}</td>
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
      const {desc,...rest}=d;
      const rec={...rest,description:desc,id:genId("INV"),tenant_id:tid};
      const saved=await createInventoryItem(rec);
      setInv(p=>[...p,normInv(saved)]);addAudit("ITEM_ADDED",saved.id,`${d.name} added`);flash("Item added");
    }catch(e){flash(e.message,"error");}
  };
  const editItem=async(id,d)=>{
    try{
      const {desc,...rest}=d;
      const saved=await updateInventoryItem(id,{...rest,description:desc});
      setInv(p=>p.map(i=>i.id!==id?i:normInv(saved)));
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
  const {crs,users,flash,tid}=ctx;
  const [detail,   setDetail]  = useState(null);
  const [search,   setSearch]  = useState("");
  const [fStatus,  setFStatus] = useState("");
  const [fType,    setFType]   = useState("");
  const [fEnv,     setFEnv]    = useState("");
  const [fRisk,    setFRisk]   = useState("");
  const [fUser,    setFUser]   = useState("");
  const [fOutcome, setFOutcome]= useState("");
  const [fFrom,    setFFrom]   = useState("");
  const [fTo,      setFTo]     = useState("");
  const [activeCard,setActiveCard]=useState("");
  const [page,     setPage]    = useState(1);
  const PAGE_SIZE = 15;

  const allCRs = crs||[];

  // ── METRICS ──────────────────────────────────────────────
  const total     = allCRs.length;
  const pending   = allCRs.filter(c=>["pending_manager","pending_approval"].includes(c.status)).length;
  const inImpl    = allCRs.filter(c=>["pending_implementation","in_progress"].includes(c.status)).length;
  const completed = allCRs.filter(c=>["completed","closed"].includes(c.status)).length;
  const tatDays   = useMemo(()=>{
    const done = allCRs.filter(c=>c.status==="completed"&&c.created_at&&c.implementation_completed_at);
    if(!done.length) return null;
    const avg = done.reduce((s,c)=>s+(new Date(c.implementation_completed_at)-new Date(c.created_at))/(86400000),0)/done.length;
    return avg.toFixed(1);
  },[allCRs]);

  // ── FILTER ───────────────────────────────────────────────
  const filtered = useMemo(()=>{
    const q = search.toLowerCase();
    return allCRs.filter(c=>{
      const raiser = users.find?.(u=>u.id===c.initiator) || Object.values(users||{}).find(u=>u?.id===c.initiator);
      const ct  = c.change_type||c.changeType||"";
      const rl  = c.risk_level||c.riskLevel||"";
      const st  = c.status||"";
      const outcome = c.implementation_outcome||"";

      if(activeCard==="pending" && !["pending_manager","pending_approval"].includes(st)) return false;
      if(activeCard==="impl"    && !["pending_implementation","in_progress"].includes(st)) return false;
      if(activeCard==="done"    && !["completed","closed"].includes(st)) return false;

      if(fStatus){
        const groups={pending_manager:["pending_manager"],pending_approval:["pending_approval"],implementation:["pending_implementation","in_progress"],completed:["completed","closed"],rejected:["rejected"]};
        if(!(groups[fStatus]||[fStatus]).includes(st)) return false;
      }
      if(fType    && ct!==fType)   return false;
      if(fEnv     && c.environment!==fEnv) return false;
      if(fRisk    && rl!==fRisk)   return false;
      if(fUser    && c.initiator!==fUser) return false;
      if(fOutcome && outcome!==fOutcome) return false;
      if(fFrom && new Date(c.created_at)<new Date(fFrom)) return false;
      if(fTo   && new Date(c.created_at)>new Date(fTo+"T23:59:59")) return false;
      if(q){
        const hay=[c.id,c.title||"",c.description||"",raiser?.name||"",c.system_name||c.systemName||""].join(" ").toLowerCase();
        if(!hay.includes(q)) return false;
      }
      return true;
    });
  },[allCRs,search,fStatus,fType,fEnv,fRisk,fUser,fOutcome,fFrom,fTo,activeCard,users]);

  const totalPages = Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const paged = filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
  const resetPage = fn=>(...args)=>{ fn(...args); setPage(1); };
  const hasFilters = search||fStatus||fType||fEnv||fRisk||fUser||fOutcome||fFrom||fTo||activeCard;

  const clearAll=()=>{ setSearch("");setFStatus("");setFType("");setFEnv("");setFRisk("");setFUser("");setFOutcome("");setFFrom("");setFTo("");setActiveCard("");setPage(1); };

  const stageLabel=c=>{
    if(c.status==="pending_manager")        return {label:"Awaiting Manager",   color:C.amber};
    if(c.status==="pending_approval")       return {label:`Level ${c.current_level||1} Approval`,color:C.violet};
    if(c.status==="pending_implementation") return {label:"Ready to Implement", color:C.blue};
    if(c.status==="in_progress")            return {label:"Implementing",        color:C.teal};
    if(c.status==="completed")              return {label:"Completed",           color:C.green};
    if(c.status==="closed")                 return {label:"Closed",              color:C.muted};
    if(c.status==="rejected")               return {label:"Rejected",            color:C.red};
    return {label:c.status.replace(/_/g," "),color:C.muted};
  };

  const exportCSV=()=>{
    const headers=["CR ID","Title","Type","Environment","Risk","Raised By","Date Raised","Last Updated","Status","Outcome"];
    const rows=filtered.map(c=>{
      const raiser=users.find?.(u=>u.id===c.initiator)||Object.values(users||{}).find(u=>u?.id===c.initiator);
      return [c.id,c.title||"",c.change_type||c.changeType||"",c.environment||"",c.risk_level||c.riskLevel||"",raiser?.name||"",
        c.created_at?new Date(c.created_at).toLocaleDateString("en-GB"):"",
        c.updated_at?new Date(c.updated_at).toLocaleDateString("en-GB"):"",
        c.status.replace(/_/g," "),c.implementation_outcome||""];
    });
    const csv=[headers,...rows].map(r=>r.map(v=>`"${v}"`).join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url;
    a.download=`change-requests-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const uniqueUsers = Array.isArray(users) ? users : Object.values(users||{}).filter(Boolean);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <PageTitle title="Change Requests" sub="All change requests across the organisation"/>

      {/* ── 5 METRIC CARDS ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12}}>
        {[
          {key:"",       label:"Total Changes",     value:total,    sub:"All time",              color:C.blue},
          {key:"pending",label:"Pending Approvals", value:pending,  sub:"Awaiting sign-off",     color:C.amber},
          {key:"tat",    label:"Avg TAT (days)",     value:tatDays??"-",sub:"Submission to close",color:C.violet},
          {key:"impl",   label:"In Implementation", value:inImpl,   sub:"Currently executing",   color:C.teal},
          {key:"done",   label:"Completed",          value:completed,sub:"Successfully closed",   color:C.green},
        ].map(({key,label,value,sub,color})=>{
          const active=activeCard===key&&key!=="tat";
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
          <div><label style={LBL}>Status / Stage</label>
            <select value={fStatus} onChange={e=>resetPage(setFStatus)(e.target.value)} style={inp()}>
              <option value="">All Statuses</option>
              <option value="pending_manager">Pending Manager</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="implementation">In Implementation</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div><label style={LBL}>Change Type</label>
            <select value={fType} onChange={e=>resetPage(setFType)(e.target.value)} style={inp()}>
              <option value="">All Types</option>
              {["Standard","Normal","Major","Emergency"].map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div><label style={LBL}>Environment</label>
            <select value={fEnv} onChange={e=>resetPage(setFEnv)(e.target.value)} style={inp()}>
              <option value="">All Environments</option>
              {["Dev","Staging","Production"].map(e=><option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div><label style={LBL}>Risk Level</label>
            <select value={fRisk} onChange={e=>resetPage(setFRisk)(e.target.value)} style={inp()}>
              <option value="">All Risks</option>
              {["Low","Medium","High"].map(r=><option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div><label style={LBL}>Requester</label>
            <select value={fUser} onChange={e=>resetPage(setFUser)(e.target.value)} style={inp()}>
              <option value="">All Requesters</option>
              {uniqueUsers.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div><label style={LBL}>Outcome</label>
            <select value={fOutcome} onChange={e=>resetPage(setFOutcome)(e.target.value)} style={inp()}>
              <option value="">Any Outcome</option>
              <option value="successful">Successful</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div><label style={LBL}>Date From</label>
            <input type="date" value={fFrom} onChange={e=>resetPage(setFFrom)(e.target.value)} style={inp()}/>
          </div>
          <div><label style={LBL}>Date To</label>
            <input type="date" value={fTo} onChange={e=>resetPage(setFTo)(e.target.value)} style={inp()}/>
          </div>
        </div>
      </div>

      {/* ── SEARCH + EXPORT ── */}
      <div style={{display:"flex",gap:10,alignItems:"center"}}>
        <div style={{flex:1,position:"relative"}}>
          <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:C.muted,fontSize:14}}>🔍</span>
          <input value={search} onChange={e=>resetPage(setSearch)(e.target.value)}
            placeholder="Search by CR code, title, requester, system name, description…"
            style={{...inp(),paddingLeft:32,width:"100%"}}/>
        </div>
        <div style={{fontSize:12,color:C.muted,whiteSpace:"nowrap"}}>{filtered.length} result{filtered.length!==1?"s":""}</div>
        <button onClick={exportCSV} style={{...btn("ghost"),fontSize:12,padding:"7px 14px",whiteSpace:"nowrap"}}>⬇ Export CSV</button>
      </div>

      {/* ── TABLE ── */}
      <div style={card(0)}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <TH cols={["CR ID","Title","Type","Environment","Risk","Raised By","Date Raised","Last Updated","Stage","Approval Level",""]}/>
          <tbody>
            {paged.length===0&&(
              <tr><td colSpan={11} style={{padding:"48px",textAlign:"center",color:C.muted,fontSize:13}}>
                {hasFilters?"No change requests match your filters.":"No change requests in the system yet."}
              </td></tr>
            )}
            {paged.map((c,i)=>{
              const raiser = uniqueUsers.find(u=>u.id===c.initiator);
              const sl     = stageLabel(c);
              const ct     = c.change_type||c.changeType||"—";
              const rl     = c.risk_level||c.riskLevel||"—";
              const levelLabel = c.status==="pending_approval"?`L${c.current_level||1}`:c.status==="pending_manager"?"Manager":c.status==="pending_implementation"||c.status==="in_progress"?"Impl":"—";
              return (
                <tr key={c.id} onClick={()=>setDetail(c)}
                  style={{borderBottom:i<paged.length-1?`1px solid #F1F5F9`:"none",cursor:"pointer"}}>
                  <td style={{padding:"10px 14px",fontSize:11,fontWeight:700,color:C.ink,whiteSpace:"nowrap"}}>
                    {(c.is_emergency||c.isEmergency)&&<span style={{color:C.red,marginRight:4}}>⚡</span>}{c.id}
                    {c.version>1&&<span style={{fontSize:9,color:C.muted,marginLeft:4}}>v{c.version}</span>}
                  </td>
                  <td style={{padding:"10px 14px",maxWidth:200}}>
                    <div style={{fontSize:12,color:C.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.title}</div>
                    {(c.system_name||c.systemName)&&<div style={{fontSize:10,color:C.muted,marginTop:1}}>{c.system_name||c.systemName}</div>}
                  </td>
                  <td style={{padding:"10px 14px",fontSize:11,color:C.muted}}>{ct}</td>
                  <td style={{padding:"10px 14px"}}><EnvTag e={c.environment}/></td>
                  <td style={{padding:"10px 14px"}}><RiskTag r={rl}/></td>
                  <td style={{padding:"10px 14px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      <Av i={raiser?.initials||"?"} s={24}/>
                      <span style={{fontSize:11,color:C.muted}}>{raiser?.name||c.initiator||"—"}</span>
                    </div>
                  </td>
                  <td style={{padding:"10px 14px",fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>{fmtD(c.created_at||c.createdAt)}</td>
                  <td style={{padding:"10px 14px",fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>{fmtD(c.updated_at||c.updatedAt)}</td>
                  <td style={{padding:"10px 14px",whiteSpace:"nowrap"}}>
                    <span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,background:sl.color+"18",color:sl.color}}>{sl.label}</span>
                  </td>
                  <td style={{padding:"10px 14px",fontSize:11,fontWeight:600,color:levelLabel==="—"?C.muted:C.violet,textAlign:"center"}}>{levelLabel}</td>
                  <td style={{padding:"10px 14px",color:C.muted,fontSize:16}}>›</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        <div style={{padding:"12px 16px",borderTop:`1px solid ${C.border}`,display:"flex",flexDirection:"column",gap:10}}>
          {/* Load More button — shows when more pages available */}
          {page < totalPages && (
            <div style={{textAlign:"center"}}>
              <button
                onClick={()=>setPage(p=>p+1)}
                style={{...btn("ghost"),fontSize:12,padding:"8px 28px",width:"100%",borderStyle:"dashed",color:C.brand,borderColor:C.brand+"40",background:C.brandLt}}>
                Load More ({Math.min(PAGE_SIZE, filtered.length - page*PAGE_SIZE)} more of {filtered.length - page*PAGE_SIZE} remaining)
              </button>
            </div>
          )}
          {/* Standard pagination controls */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:11,color:C.muted}}>
              {filtered.length===0?"0 results":`Showing ${(page-1)*PAGE_SIZE+1}–${Math.min(page*PAGE_SIZE,filtered.length)} of ${filtered.length} change requests`}
            </div>
            <div style={{display:"flex",gap:4,alignItems:"center"}}>
              <button onClick={()=>setPage(1)} disabled={page===1} style={{...btn("ghost"),padding:"4px 8px",fontSize:12,opacity:page===1?.4:1}}>«</button>
              <button onClick={()=>setPage(p=>p-1)} disabled={page===1} style={{...btn("ghost"),padding:"4px 8px",fontSize:12,opacity:page===1?.4:1}}>‹</button>
              {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
                const pg=Math.max(1,Math.min(page-2,totalPages-4))+i;
                if(pg<1||pg>totalPages) return null;
                return <button key={pg} onClick={()=>setPage(pg)} style={{...btn(pg===page?"primary":"ghost"),padding:"4px 10px",fontSize:12,minWidth:32}}>{pg}</button>;
              })}
              <button onClick={()=>setPage(p=>p+1)} disabled={page===totalPages} style={{...btn("ghost"),padding:"4px 8px",fontSize:12,opacity:page===totalPages?.4:1}}>›</button>
              <button onClick={()=>setPage(totalPages)} disabled={page===totalPages} style={{...btn("ghost"),padding:"4px 8px",fontSize:12,opacity:page===totalPages?.4:1}}>»</button>
              <span style={{fontSize:11,color:C.muted,marginLeft:6}}>Page {page} of {totalPages}</span>
            </div>
          </div>
        </div>
      </div>

      {detail&&(
        <Modal title={detail.id} sub={detail.title} onClose={()=>setDetail(null)} w={800}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16,padding:"10px 12px",background:C.pageBg,borderRadius:8}}>
            <CRChip s={detail.status}/>
            <EnvTag e={detail.environment}/>
            <RiskTag r={detail.risk_level||detail.riskLevel}/>
            <span style={{fontSize:11,fontWeight:600,padding:"1px 7px",borderRadius:4,background:C.surface,color:C.ink2}}>{detail.change_type||detail.changeType}</span>
            {(detail.is_emergency||detail.isEmergency)&&<span style={{fontSize:11,fontWeight:700,color:C.red,background:C.redBg,padding:"2px 8px",borderRadius:4}}>⚡ Emergency</span>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {[["System",detail.system_name||detail.systemName],["Raised By",uniqueUsers.find(u=>u.id===detail.initiator)?.name||detail.initiator],["Created",fmtDT(detail.created_at||detail.createdAt)],["Last Updated",fmtDT(detail.updated_at||detail.updatedAt)],["Deploy Date",detail.deploy_date||detail.deployDate],["Current Stage",stageLabel(detail).label]].filter(([,v])=>v).map(([k,v])=>(
              <div key={k} style={{background:C.pageBg,borderRadius:7,padding:"10px 12px"}}>
                <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",marginBottom:3}}>{k}</div>
                <div style={{fontSize:13,color:C.ink,fontWeight:500}}>{String(v)}</div>
              </div>
            ))}
          </div>
          {detail.description&&<div style={{marginTop:12,background:C.pageBg,borderRadius:7,padding:"12px 14px"}}>
            <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>Description</div>
            <div style={{fontSize:13,color:C.ink,lineHeight:1.7}}>{detail.description}</div>
          </div>}
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
function CRPolicy({ctx}){ return <CRPolicyFull ctx={ctx}/>; }

// ══════════════════════════════════════════════════════════════
// CR POLICY — Rebuilt with real approval levels
// ══════════════════════════════════════════════════════════════
function CRPolicyFull({ctx}){
  const {approvalLevels,setApprovalLevels,tenantConfig,setTenantConfig,users,flash,tid,changeRoles}=ctx;
  const [editing,setEditing]=useState(null);
  const [saving,setSaving]=useState(false);

  const CHANGE_TYPES = ["Standard","Normal","Major","Emergency"];

  const addLevel = () => {
    const next = (approvalLevels||[]).length + 1;
    setEditing({
      id: null, tenant_id: tid,
      level_order: next, name:`Level ${next} Approval`,
      description:"", role_key:"change_approver_l1",
      change_types:["Normal","Major"],
    });
  };

  const saveLevel = async (level) => {
    setSaving(true);
    try {
      const saved = await saveApprovalLevel({...level, tenant_id:tid});
      setApprovalLevels(p => {
        const exists = p.find(l=>l.id===saved.id);
        return exists ? p.map(l=>l.id===saved.id?saved:l) : [...p, saved];
      });
      flash("Approval level saved");
      setEditing(null);
    } catch(e){ flash(e.message,"error"); }
    finally { setSaving(false); }
  };

  const removeLevel = async (id) => {
    try {
      await deleteApprovalLevel(id);
      setApprovalLevels(p=>p.filter(l=>l.id!==id));
      flash("Level removed");
    } catch(e){ flash(e.message,"error"); }
  };

  const saveManager = async (managerId) => {
    try {
      const saved = await saveTenantConfig(tid, {change_manager_id: managerId||null});
      setTenantConfig(p=>({...p,...saved}));
      flash("Change Manager updated");
    } catch(e){ flash(e.message,"error"); }
  };

  const cmUser = users.find(u=>u.id===tenantConfig?.change_manager_id);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <PageTitle title="CR Policy" sub="Configure change management workflow and approval levels"
        action={<button onClick={addLevel} style={btn("primary")}>+ Add Approval Level</button>}/>

      {/* Change Manager Config */}
      <div style={card(20)}>
        <div style={{fontSize:14,fontWeight:700,color:C.ink,marginBottom:4}}>Fixed Change Manager</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:14}}>All change requests go to this person as the first approval gate.</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:12,alignItems:"end"}}>
          <div>
            <label style={LBL}>Assign Change Manager</label>
            <select
              value={tenantConfig?.change_manager_id||""}
              onChange={e=>saveManager(e.target.value)}
              style={inp()}>
              <option value="">— Not configured —</option>
              {users.filter(u=>u.status==="active").map(u=>(
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
          </div>
          {cmUser&&(
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:C.greenBg,borderRadius:8,border:`1px solid ${C.green}30`}}>
              <Av i={cmUser.initials||"?"} s={28}/>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:C.ink}}>{cmUser.name}</div>
                <div style={{fontSize:10,color:C.green,fontWeight:600}}>Active Change Manager</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Approval Levels */}
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{fontSize:14,fontWeight:700,color:C.ink}}>Approval Levels</div>
        {(approvalLevels||[]).length===0&&(
          <div style={{...card(20),textAlign:"center",color:C.muted,fontSize:13}}>
            No approval levels configured. Click "+ Add Approval Level" to add one.
          </div>
        )}
        {(approvalLevels||[]).map((level,i)=>(
          <div key={level.id||i} style={card(16)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:C.brand,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800}}>{level.level_order}</div>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:C.ink}}>{level.name}</div>
                  <div style={{fontSize:11,color:C.muted}}>{level.description||"No description"}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>setEditing(level)} style={{...btn("ghost"),fontSize:11,padding:"4px 10px"}}>Edit</button>
                <button onClick={()=>removeLevel(level.id)} style={{...btn("ghost"),fontSize:11,padding:"4px 10px",color:C.red}}>Remove</button>
              </div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:4,background:C.violetBg,color:C.violet}}>
                Role: {(changeRoles||[]).find(r=>r.key===level.role_key)?.label||level.role_key}
              </span>
              {(level.change_types||[]).map(ct=>(
                <span key={ct} style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:4,background:C.blueBg,color:C.blue}}>{ct}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Workflow Summary */}
      <div style={card(16)}>
        <div style={{fontSize:13,fontWeight:700,color:C.ink,marginBottom:12}}>Workflow Preview</div>
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
          {["Technician Creates",`Change Manager`,
            ...(approvalLevels||[]).map(l=>l.name),
            "Implementer Executes","Closed"].map((step,i,arr)=>(
            <React.Fragment key={i}>
              <span style={{padding:"5px 12px",borderRadius:20,fontSize:11,fontWeight:600,
                background:i===0?C.blueBg:i===arr.length-1?C.greenBg:i===1?C.violetBg:C.amberBg,
                color:i===0?C.blue:i===arr.length-1?C.green:i===1?C.violet:C.amber}}>
                {step}
              </span>
              {i<arr.length-1&&<span style={{color:C.muted,fontSize:14}}>→</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      {editing&&(
        <Modal title={editing.id?"Edit Approval Level":"New Approval Level"} onClose={()=>setEditing(null)} w={520}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div>
              <label style={LBL}>Level Name</label>
              <input value={editing.name} onChange={e=>setEditing(p=>({...p,name:e.target.value}))} style={inp()} placeholder="e.g. Level 1 Approval"/>
            </div>
            <div>
              <label style={LBL}>Description</label>
              <input value={editing.description||""} onChange={e=>setEditing(p=>({...p,description:e.target.value}))} style={inp()} placeholder="e.g. CTO Level"/>
            </div>
            <div>
              <label style={LBL}>Level Order</label>
              <input type="number" min={1} value={editing.level_order} onChange={e=>setEditing(p=>({...p,level_order:+e.target.value}))} style={inp()}/>
            </div>
            <div>
              <label style={LBL}>Required Role</label>
              <select value={editing.role_key||""} onChange={e=>setEditing(p=>({...p,role_key:e.target.value}))} style={inp()}>
                {(changeRoles||[]).filter(r=>r.key.includes("approver")).map(r=>(
                  <option key={r.key} value={r.key}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={LBL}>Applies to Change Types</label>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {CHANGE_TYPES.map(ct=>{
                  const active = (editing.change_types||[]).includes(ct);
                  return (
                    <button key={ct} onClick={()=>setEditing(p=>({...p,change_types:active?p.change_types.filter(t=>t!==ct):[...(p.change_types||[]),ct]}))}
                      style={{padding:"5px 12px",border:`1.5px solid ${active?C.brand:C.border}`,borderRadius:6,
                        background:active?C.brandLt:"#fff",color:active?C.brand:C.muted,
                        fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                      {ct}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:18,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
            <button onClick={()=>setEditing(null)} style={btn("ghost")}>Cancel</button>
            <button onClick={()=>saveLevel(editing)} disabled={saving} style={btn("primary")}>{saving?"Saving…":"Save Level"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// CHANGE CONFIG — Role assignment per user
// ══════════════════════════════════════════════════════════════
function ChangeConfig({ctx}){
  const {users,changeRoles,userCRoles,setUserCRoles,flash,tid}=ctx;
  const [search,setSearch]=useState("");
  const [saving,setSaving]=useState(null);

  // Build a map: userId -> array of role keys
  const roleMap = {};
  (userCRoles||[]).forEach(r=>{ if(!roleMap[r.user_id]) roleMap[r.user_id]=[]; roleMap[r.user_id].push(r.role_key); });

  const shown = users.filter(u=>{
    if(!search) return true;
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const toggleRole = async (userId, roleKey) => {
    const hasRole = (roleMap[userId]||[]).includes(roleKey);
    setSaving(userId+roleKey);
    try {
      if(hasRole){
        await removeChangeRole(userId, roleKey);
        setUserCRoles(p=>p.filter(r=>!(r.user_id===userId&&r.role_key===roleKey)));
      } else {
        const saved = await assignChangeRole(userId, roleKey, tid);
        setUserCRoles(p=>[...p, {user_id:userId, role_key:roleKey, ...saved}]);
      }
      flash(`Change role ${hasRole?"removed":"assigned"}`);
    } catch(e){ flash(e.message,"error"); }
    finally { setSaving(null); }
  };

  const CR_ROLES = (changeRoles||[]);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <PageTitle title="Change Roles" sub="Assign change management roles to users — users can hold multiple roles"/>

      {/* Legend */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {CR_ROLES.map(r=>(
          <span key={r.key} style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,background:C.violetBg,color:C.violet,border:`1px solid ${C.violet}22`}}>
            {r.label}
          </span>
        ))}
      </div>

      {/* Search */}
      <div style={{position:"relative"}}>
        <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:C.muted}}>🔍</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search users…" style={{...inp(),paddingLeft:30}}/>
      </div>

      {/* User role grid */}
      <div style={card(0)}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{background:"#FAFAFA"}}>
              <th style={{padding:"9px 14px",textAlign:"left",fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".08em",borderBottom:`1px solid ${C.border}`}}>User</th>
              <th style={{padding:"9px 14px",textAlign:"left",fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".08em",borderBottom:`1px solid ${C.border}`}}>Dept</th>
              {CR_ROLES.map(r=>(
                <th key={r.key} style={{padding:"9px 10px",textAlign:"center",fontSize:9,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",borderBottom:`1px solid ${C.border}`,minWidth:80}}>
                  {r.label.replace("Change ","").replace(" L1","L1").replace(" L2","L2")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((u,i)=>{
              const myRoles = roleMap[u.id]||[];
              return (
                <tr key={u.id} style={{borderBottom:i<shown.length-1?`1px solid #F8FAFC`:"none"}}>
                  <td style={{padding:"11px 14px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <Av i={u.initials||"?"} s={28}/>
                      <div>
                        <div style={{fontSize:12,fontWeight:600,color:C.ink}}>{u.name}</div>
                        <div style={{fontSize:10,color:C.muted}}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{padding:"11px 14px",fontSize:11,color:C.muted}}>{u.dept}</td>
                  {CR_ROLES.map(r=>{
                    const has = myRoles.includes(r.key);
                    const isSaving = saving===u.id+r.key;
                    return (
                      <td key={r.key} style={{padding:"11px 10px",textAlign:"center"}}>
                        <button
                          onClick={()=>toggleRole(u.id, r.key)}
                          disabled={!!isSaving}
                          style={{width:28,height:28,borderRadius:"50%",border:`2px solid ${has?C.green:C.border}`,
                            background:has?C.green:"#fff",cursor:"pointer",
                            display:"flex",alignItems:"center",justifyContent:"center",
                            fontSize:13,margin:"0 auto",
                            opacity:isSaving?.5:1}}>
                          {isSaving?"…":has?"✓":""}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{padding:"9px 14px",borderTop:`1px solid #F8FAFC`,fontSize:11,color:C.muted}}>
          {shown.length} users · Click circles to toggle roles · Green = assigned
        </div>
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