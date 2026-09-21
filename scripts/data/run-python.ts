import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
export function runPython(file:string,args:string[]):void {const python=process.platform==='win32'?'.venv-data/Scripts/python.exe':'.venv-data/bin/python';if(!existsSync(python))throw Error('Create .venv-data and install scripts/data/requirements.txt first');const result=spawnSync(python,[file,...args],{stdio:'inherit',timeout:600000});if(result.error)throw result.error;process.exitCode=result.status??1;}
