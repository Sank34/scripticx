import { parseLine, reset, setVariable, step } from './engine';
import { getMission, missions, type MissionId } from './game-missions';
export const starterCode = missions[0].starter;
export type MissionFrame = { line:number; output:string|null; lamp:number|null };
export type MissionResult = { frames:MissionFrame[]; success:boolean; error?:string };

// Bounded interpreter shared by Worker previews and server verification.
// No JS eval, network commands, or caller-provided expected answers.
export function executeIslandMission(code:string,id:MissionId='lanterns',inputs?:Record<string,number>):MissionResult {
  const frames:MissionFrame[]=[];
  try {
    const mission=getMission(id);if(!mission)throw Error('Unknown mission.');
    if(code.length>2000||code.split('\n').length>60)throw Error('Maximum 60 lines / 2,000 characters.');
    let depth=0;
    for(const char of code){if(char==='('&&++depth>12)throw Error('Expression nesting is too deep.');if(char===')')depth--;}
    if(/\b(__proto__|constructor|prototype|hasOwnProperty)\b/.test(code))throw Error('Reserved variable name.');
    const program=code.split('\n').map(parseLine);
    if(program.some(i=>i.type==='INPUT'))throw Error('The mission supplies sensor inputs automatically.');
    if(program.some(i=>i.type==='ASSIGN'&&Object.hasOwn(mission.inputs,i.var)))throw Error('Do not overwrite sensor inputs.');
    reset();const readings=inputs??mission.inputs;
    for(const [name,value] of Object.entries(readings))setVariable(name,value);
    const expected=id==='gate'?[readings.energy>=3?'OPEN':'WAIT']:id==='beacon'?Array.from({length:Math.floor(readings.limit/2)},(_,i)=>(i+1)*2):mission.expected;
    let line=0,outputIndex=0,valid=true;const executed=new Set<string>();const start=Date.now();
    for(let count=0;count<160;count++){
      if(Date.now()-start>75)throw Error('Execution time limit reached.');
      const result=step(program);
      if(!result)return {frames,success:valid&&outputIndex===expected.length&&mission.required.every(type=>executed.has(type))};
      executed.add(program[line]?.type);
      if(program.some(i=>i.type==='ELSE'))executed.add('ELSE');
      if(Object.values(result.variables).some(v=>typeof v==='string'&&v.length>1024))throw Error('A variable is too large.');
      const output=result.output===null?null:String(result.output);
      if(output&&output.length>200)throw Error('Output is too long.');
      let lamp:number|null=null;
      if(output!==null){if(valid&&outputIndex<expected.length&&result.output===expected[outputIndex])lamp=++outputIndex;else valid=false;}
      frames.push({line,output,lamp});line=result.currentLine;
    }
    throw Error('Execution stopped after 160 steps. Check your loop condition.');
  }catch(error){return {frames:[],success:false,error:error instanceof Error?error.message:'Execution failed.'};}
}
export function verifyMission(code:string,id:MissionId){
  const cases:Record<string,number>[]=id==='gate'?[{energy:0},{energy:2},{energy:3},{energy:8}]:id==='beacon'?[{limit:2},{limit:5},{limit:8}]:[{}];
  return cases.every(inputs=>executeIslandMission(code,id,inputs).success);
}
