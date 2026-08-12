import type { Automation, BlogPost, Campaign, Integration, Property, Site } from "@/src/domain/types";
export const sites:Site[]=[
 {id:"prime",name:"Area Prime",slug:"area-prime",description:"Oficinas y edificios corporativos",businessType:"Inmobiliario corporativo",domain:"areaprime.pe",wordpressUrl:"https://areaprime.pe",logoUrl:"",primaryColor:"#2563EB",secondaryColor:"#DBEAFE",senderName:"Area Prime",senderEmail:"novedades@areaprime.pe",timezone:"America/Lima",isActive:true,tokkoFilter:{}},
 {id:"retail",name:"Area Retail",slug:"area-retail",description:"Locales comerciales y retail",businessType:"Retail inmobiliario",domain:"arearetail.pe",wordpressUrl:"https://arearetail.pe",logoUrl:"",primaryColor:"#173B67",secondaryColor:"#DCE8F5",senderName:"Area Retail",senderEmail:"novedades@arearetail.pe",timezone:"America/Lima",isActive:true,tokkoFilter:{}},
 {id:"hub",name:"Area Hub",slug:"area-hub",description:"Naves y propiedades industriales",businessType:"Inmobiliario industrial",domain:"areahub.pe",wordpressUrl:"https://areahub.pe",logoUrl:"",primaryColor:"#EA6A27",secondaryColor:"#FDE8D8",senderName:"Area Hub",senderEmail:"novedades@areahub.pe",timezone:"America/Lima",isActive:true,tokkoFilter:{}}
];
const automationDefs=[{type:"weekly_new_properties",name:"Alertas de nuevas propiedades",frequency:"weekly",day:5},{type:"monthly_properties",name:"Resumen de propiedades disponibles",frequency:"monthly",day:1},{type:"monthly_blog",name:"Noticias y artículos del blog",frequency:"monthly",day:15}] as const;
export const automations:Automation[]=sites.flatMap((s,si)=>automationDefs.map((a,i)=>({id:`${s.id}-${i}`,siteId:s.id,type:a.type,name:a.name,isEnabled:!(si===2&&i===2),frequency:a.frequency,day:a.day,sendTime:i===0?"09:00":"10:00",requiresApproval:i!==0,nextRunAt:i===0?"15 ago · 09:00":"01 sep · 10:00"})));
export const integrations:Integration[]=sites.flatMap(s=>(["tokko","wordpress","resend"] as const).map((p,i)=>({id:`${s.id}-${p}`,siteId:s.id,provider:p,status:p==="wordpress"&&s.id==="prime"?"connected":"pending",lastSyncAt:i===1&&s.id==="prime"?"Hace 2 horas":null,lastError:null,config:{}})));
const titles={prime:["Oficina premium en San Isidro","Piso corporativo en Javier Prado","Oficina boutique en Miraflores"],retail:["Local comercial en esquina","Espacio retail en avenida principal","Tienda en centro empresarial"],hub:["Nave industrial en Lurín","Almacén logístico en Callao","Centro de distribución en Chilca"]};
export const properties:Property[]=sites.flatMap(s=>Array.from({length:10},(_,i)=>({id:`${s.id}-p${i}`,siteId:s.id,externalId:`MOCK-${s.id}-${i}`,title:titles[s.id as keyof typeof titles][i%3]+` ${i+1}`,description:"Propiedad destacada con excelente ubicación y conectividad.",propertyType:s.id==="hub"?"Industrial":s.id==="retail"?"Local":"Oficina",location:i%2?"San Isidro, Lima":"Miraflores, Lima",address:"Av. Principal 123",price:250000+i*18000,currency:"USD",area:120+i*25,imageUrl:"",publicUrl:`https://${s.domain}/propiedad/${i+1}`,status:"available",publishedAt:"2026-08-05"})));
export const posts:BlogPost[]=sites.flatMap(s=>Array.from({length:5},(_,i)=>({id:`${s.id}-b${i}`,siteId:s.id,externalId:`WP-${s.id}-${i}`,title:["Tendencias del mercado inmobiliario","Cómo elegir una ubicación estratégica","Claves para una inversión sólida","Perspectivas para el próximo trimestre","Guía para empresas en crecimiento"][i],excerpt:"Análisis y recomendaciones de nuestros especialistas para tomar mejores decisiones inmobiliarias.",imageUrl:"",publicUrl:`https://${s.domain}/blog/${i+1}`,publishedAt:`2026-08-${10-i}`})));
export const campaigns:Campaign[]=[
 {id:"cmp-001",siteId:"prime",automationType:"weekly_new_properties",name:"Nuevas propiedades · Semana 32",subject:"Nuevas oportunidades para tu empresa",status:"sent",recipientCount:1248,scheduledAt:null,sentAt:"12 ago · 09:02"},
 {id:"cmp-002",siteId:"retail",automationType:"monthly_properties",name:"Catálogo retail · Agosto",subject:"Locales disponibles este mes",status:"scheduled",recipientCount:846,scheduledAt:"15 ago · 10:00",sentAt:null},
 {id:"cmp-003",siteId:"hub",automationType:"monthly_blog",name:"Novedades industriales · Agosto",subject:"El pulso del mercado industrial",status:"draft",recipientCount:0,scheduledAt:null,sentAt:null},
 {id:"cmp-004",siteId:"prime",automationType:"monthly_blog",name:"Noticias corporativas · Julio",subject:"Novedades de Area Prime",status:"failed",recipientCount:1241,scheduledAt:null,sentAt:null,errorMessage:"El proveedor de correo rechazó la solicitud simulada."}
];
export const activities=[
 {date:"Hoy, 09:04",siteId:"prime",provider:"Resend",operation:"Campaña enviada",status:"success"},
 {date:"Hoy, 08:47",siteId:"prime",provider:"WordPress",operation:"Sincronización terminada",status:"success"},
 {date:"Ayer, 16:22",siteId:"retail",provider:"Resend",operation:"Email de prueba enviado",status:"success"},
 {date:"Ayer, 11:08",siteId:"hub",provider:"Tokko",operation:"Integración pendiente",status:"warning"},
 {date:"10 ago, 10:14",siteId:"prime",provider:"Resend",operation:"Envío fallido",status:"error"}
];
export const siteById=(id:string)=>sites.find(s=>s.id===id);
