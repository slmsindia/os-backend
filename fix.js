const fs = require('fs');
const content = fs.readFileSync('prisma/schema.prisma', 'utf8');

// The file got completely corrupted by bad replaces. 
// I will extract everything from the start up to the first MembershipConfig block.
const firstMembershipConfig = content.indexOf('model MembershipConfig');
const firstGlobalSetting = content.indexOf('model GlobalSetting');

// There are multiple duplicates of ImeBank etc.
// Let's just find the very last occurrence of "model DocumentType" and everything after it
// and reconstruct the file.
const lines = content.split('\n');
const fixedLines = [];
let insideDup = false;

for (let i = 0; i < lines.length; i++) {
   fixedLines.push(lines[i]);
}
console.log("Lines count: " + lines.length);

const cleanContent = content.replace(/model MembershipConfig \{[\s\S]*?\}\n\}\n\/\/ IME API Request\/Response Logs[\s\S]*?\/\/ Membership Configuration\n/, '');

fs.writeFileSync('prisma/schema.prisma.bak', content);
