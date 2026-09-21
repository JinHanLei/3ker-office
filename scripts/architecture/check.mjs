import {readdirSync,readFileSync} from 'node:fs';
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(`${dir}/${e.name}`):[`${dir}/${e.name}`]);}
for(const file of walk('packages/game-core/src')){
 const text=readFileSync(file,'utf8');
 if(/from ['"](?:node:|fs['"]|better-sqlite3|@3ker\/kernel-adapters)|Date\.now\(|Math\.random\(|process\.env|setTimeout\(/.test(text))throw Error(`Core boundary: ${file}`);
}
console.log('Architecture check passed');
