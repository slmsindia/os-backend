const fs = require('fs');
const coll = require('../../prabhu-api-docs/SendAPI_JSON_PMT.postman_collection.json');

const preRequests = [];
function findScripts(items) {
  for (const item of items) {
    if (item.event) {
      for (const ev of item.event) {
        if (ev.listen === 'prerequest') {
          preRequests.push({ name: item.name, script: ev.script.exec.join('\n') });
        }
      }
    }
    if (item.item) {
      findScripts(item.item);
    }
  }
}

if (coll.event) {
  for (const ev of coll.event) {
    if (ev.listen === 'prerequest') {
      preRequests.push({ name: 'COLLECTION LEVEL', script: ev.script.exec.join('\n') });
    }
  }
}
if (coll.item) {
  findScripts(coll.item);
}

for (const p of preRequests) {
  console.log(`\n--- SCRIPT FOR: ${p.name} ---`);
  console.log(p.script);
  break; // the logic is usually at collection or folder level, we just need one example!
}
