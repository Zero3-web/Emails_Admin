const fs = require('fs');

// 1. Edit page.tsx
const pagePath = 'C//Users/OC/Desktop/EmailP/app/(panel)/campaigns/[id]/page.tsx';
let pageCode = fs.readFileSync(pagePath, 'utf8');
pageCode = pageCode.replace(/<Link className="btn" href={\/templates<site=\d{site.id}\`}>Revisar plantilla<\/Link>/g, '');
pageCode = pageCode.replace(/<small>La prueba y el envío permanecerÁn bloqueados hasta completar la aprobación<\/small>/g, '');
fs.writeFileSync(pagePath, pageCode, 'utf8');
console.log('1. page.tsx updated successfully');

// 2. Edit campaign-approval.tsx
const approvalPath = 'C//Users/OC/Desktop/EmailP/src/components/campaign-approval.tsx';
let approvalCode = fs.readFileSync(approvalPath, 'utf8');

const marker = '{/* Optional Test Email Box */}';
while (approvalCode.includes(marker)) {
  const startIdx = approvalCode.indexOf(marker);
  const endIdx = approvalCode.indexOf('</div>', approvalCode.indexOf('</button>', startIdx)) + '</div>'.length;
  if (startIdx !== -1 && endIdx !== -1) {
    approvalCode = approvalCode.slice(0, startIdx) + approvalCode.slice(endIdx);
  } else {
    break;
  }
}
fs.writeFileSync(approvalPath, approvalCode, 'utf8');
console.log('2. campaign-approval.tsx updated successfully');

// 3. Edit send/route.tsx
const sendRoutePath = 'C//Users/PC/Desktop/EmailP/app/api/campaigns/[id]/send/route.tsx';
let sendRouteCode = fs.readFileSync(sendRoutePath, 'utf8');
if (!sendRouteCode.includes('let lastError')) {
  sendRouteCode = sendRouteCode.replace('let sentCount = 0;', 'let sentCount = 0;\n    let lastError = "";');
  sendRouteCode = sendRouteCode.replace('console.error(`Error sending email to ${to}:`, err);', 'console.error(`Error sending email to ${to}:`, err);\n        lastError = err instanceof Error ? err.message : String(err);');
  sendRouteCode = sendRouteCode.replace('throw new Error("no se pudo enviar la campaña a ningPún destinatario.");', 'throw new HttpError(lastError || "No se pudo enviar la campaña a ninguãn destinatario.");');
  fs.writeFileSync(sendRoutePath, sendRouteCode, 'utf8');
  console.log('3. send/route.tsx updated successfully');
}