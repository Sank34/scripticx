'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Square, RotateCcw, Lightbulb, Terminal } from 'lucide-react';
import type { GameMission } from '@/lib/game-missions';
import { type MissionFrame, type MissionResult } from '@/lib/island-mission';

type Props = {ro:boolean;mission:GameMission;draft?:string;onDraft(code:string):void;onFrame(frame:MissionFrame|null):void;onContinue():void;onComplete(code:string,signal:AbortSignal):Promise<string>;onTyping():void;onLeave():void};
export function MissionEditor({ ro, mission, draft, onDraft, onFrame, onContinue, onComplete, onTyping, onLeave }: Props) {
  const [code, setCode] = useState(draft??mission.starter), [running, setRunning] = useState(false);
  const [line, setLine] = useState(-1), [output, setOutput] = useState<string[]>([]), [lit, setLit] = useState(0);
  const [message, setMessage] = useState(''),[completed,setCompleted]=useState(false);
  const worker = useRef<Worker | null>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const codePane=useRef<HTMLDivElement>(null);
  useEffect(()=>{const pane=codePane.current;if(!pane||line<0)return;const top=12+line*28;if(top<pane.scrollTop)pane.scrollTop=top;else if(top+28>pane.scrollTop+pane.clientHeight)pane.scrollTop=top+28-pane.clientHeight;},[line]);
  const submission=useRef<AbortController|null>(null);
  const generation = useRef(0), leave = useRef(onLeave);
  leave.current = onLeave;
  function cancel() { submission.current?.abort();generation.current++; worker.current?.terminate(); worker.current = null; if (timer.current) clearTimeout(timer.current); }
  useEffect(() => () => { cancel(); leave.current(); }, []);
  function stop() { cancel(); onFrame(null); setRunning(false); setLine(-1); setMessage(ro ? 'Execuție oprită. Poți modifica programul.' : 'Execution stopped. You can edit your program.'); }
  function run() {
    cancel(); const id = generation.current;
    setRunning(true); setLine(-1); setOutput([]); setLit(0); setMessage('');setCompleted(false); onFrame(null);
    function fail(message: string) { if (generation.current !== id) return; cancel(); setRunning(false); setLine(-1); setMessage(message);onFrame(null); }
    try {
      const task = new Worker(new URL('./mission.worker.ts', import.meta.url), { type: 'module' });
      worker.current = task;
      timer.current = setTimeout(() => fail(ro ? 'Execuția a depășit limita de timp.' : 'Execution timed out.'), 4000);
      task.onerror = () => fail(ro ? 'Motorul nu a putut porni. Încearcă din nou.' : 'The interpreter could not start. Try again.');
      task.onmessage = ({ data }: MessageEvent<MissionResult>) => {
        if (generation.current !== id) return;
        task.terminate(); worker.current = null; if (timer.current) clearTimeout(timer.current);
        if (data.error) { fail(data.error); return; }
        let index = 0;
        const advance = async () => {
          if (generation.current !== id) return;
          const frame = data.frames[index++];
          if (!frame) {
            setLine(-1);
            if(data.success){setMessage(ro?'Verificăm soluția pe server…':'Verifying on the server…');const controller=new AbortController();submission.current=controller;try{const result=await onComplete(code,controller.signal);if(generation.current===id){setMessage(result);setCompleted(true);}}catch(error){if(generation.current===id)setMessage(error instanceof Error?error.message:'Save failed. Retry safely.');}}
            else setMessage(ro?mission.hint.ro:mission.hint.en);
            if(generation.current===id)setRunning(false);
            return;
          }
          setLine(frame.line);onFrame(frame);
          if (frame.output !== null) setOutput(values => [...values, frame.output!]);
          if (frame.lamp !== null) { setLit(frame.lamp); }
          timer.current = setTimeout(advance, 350);
        };
        advance();
      };
      task.postMessage({code,id:mission.id});
    } catch { fail(ro ? 'Execuția nu este disponibilă în acest browser.' : 'Execution is unavailable in this browser.'); }
  }
  return <section className="game-mission" aria-label={ro ? 'Editorul misiunii' : 'Mission editor'}>
    <p>{ro?mission.description.ro:mission.description.en}</p>
    {Object.entries(mission.inputs).length>0&&<p className="game-note">{Object.entries(mission.inputs).map(([key,value])=>`${key} = ${value}`).join(' · ')}</p>}
    <div className="mission-lamps" aria-label={`${lit} / ${mission.expected.length}`}>{mission.expected.map((value,i) => <span key={i} data-lit={lit > i}><Lightbulb size={22}/>{value}</span>)}<small>{lit} / {mission.expected.length}</small></div>
    <div className="mission-editor-heading"><label htmlFor="island-code">{mission.id}.msp</label><span>MiniScript+</span></div>
    <div ref={codePane} className="mission-code-area">
      {running ? <div className="mission-trace" aria-label={ro ? 'Cod în execuție' : 'Executing code'}>{code.split('\n').map((text, n) => <div key={n} data-active={line === n}><span aria-hidden="true">{n + 1}</span><code>{text || ' '}</code></div>)}</div> : <textarea id="island-code" aria-label={ro ? 'Cod MiniScript+' : 'MiniScript+ code'} value={code} maxLength={2000} spellCheck={false} autoCapitalize="off" autoCorrect="off" wrap="off" onChange={e => { setCode(e.target.value); onDraft(e.target.value); onTyping(); }} />}
    </div>
    <div className="mission-console"><span><Terminal size={15}/>Output</span><pre>{output.length ? output.join('\n') : (ro ? 'Aici apare rezultatul programului.' : 'Your program output will appear here.')}</pre></div>
    <div className="game-actions">{running ? <button className="game-button" onClick={stop}><Square size={16}/>{ro ? 'Oprește' : 'Stop'}</button> : <button className="game-button game-primary" onClick={run}><Play size={16}/>{ro ? 'Rulează' : 'Run'}</button>}<button className="game-button" disabled={running} onClick={() => { setCode(mission.starter);onDraft(mission.starter); setOutput([]); setMessage(''); setLit(0);setCompleted(false); onFrame(null); }}><RotateCcw size={16}/>{ro ? 'Resetează codul' : 'Reset code'}</button></div>
    {completed&&<button className="game-button game-primary" onClick={onContinue}>{ro?'Continuă aventura':'Continue the adventure'}</button>}
    <p role="status" className="mission-feedback">{message || (running ? (ro ? 'Urmărește execuția…' : 'Follow the execution…') : '')}</p>
    <p className="game-note">{ro ? '500 de puncte, o singură dată, după verificarea serverului.' : '500 points, once only, after server verification.'}</p>
  </section>;
}
