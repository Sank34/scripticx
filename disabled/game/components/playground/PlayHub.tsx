"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Play, ShoppingBag } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchGameProgress } from '@/lib/game-account';
export default function PlayHub(){
  const {locale}=useLanguage(),{user}=useAuth();const ro=locale==='ro';const [count,setCount]=useState(0),[error,setError]=useState(false);
  useEffect(()=>{const controller=new AbortController();setCount(0);fetchGameProgress(controller.signal).then(value=>{if(!controller.signal.aborted){setCount(value.completed.length);setError(false);}}).catch(()=>{if(!controller.signal.aborted)setError(true);});return()=>controller.abort();},[user?.id]);
  return <div className="mx-auto max-w-6xl space-y-8 py-8">
    <header><p className="mb-3 text-sm text-muted-foreground">ScripticX Playground</p><h1 className="text-4xl font-semibold tracking-tight">{ro?'Învață. Explorează. Joacă-te.':'Learn. Explore. Play.'}</h1><p className="mt-4 max-w-xl text-muted-foreground">{ro?'O lume mică în care ideile tale prind viață. Intră alături de mascotele ScripticX.':'A little world where your ideas come to life. Step inside with the ScripticX mascots.'}</p></header>
    {error&&<p role="status">{ro?'Progresul din cont nu este disponibil momentan.':'Account progress is temporarily unavailable.'}</p>}
    <section className="grid overflow-hidden rounded-2xl border bg-card md:grid-cols-2">
      <div className="flex flex-col items-start justify-center p-7 md:p-10"><Badge variant="outline">Explore · Commons</Badge><h2 className="mt-5 text-3xl font-semibold">{ro?'Lumea ScripticX':'ScripticX World'}</h2><p className="my-4 text-muted-foreground">{ro?'Explorează pe jos sau cu roverul, descoperă atlasul și pornește în misiuni.':'Explore on foot or by rover, find the atlas and set out on missions.'}</p><Button asChild><Link href="/play/world"><Play className="mr-2 size-4"/>{count>0?(ro?'Înapoi în lume':'Return to world'):(ro?'Intră în joc':'Play now')}</Link></Button></div>
      <div className="flex min-h-72 items-center justify-center bg-muted"><Image width={1100} height={1100} sizes="(max-width: 768px) 100vw, 50vw" src="/game/robot-preview.png" alt={ro?'Robotul ScripticX':'ScripticX robot'} className="h-full max-h-96 w-full object-cover"/></div>
    </section>
    <section className="grid gap-8 border-t pt-6 md:grid-cols-2"><div><h2 className="font-semibold">{ro?'Progresul tău':'Your progress'}</h2><p className="mt-3 text-3xl font-semibold">{count} <span className="text-base font-normal text-muted-foreground">/ 3 {ro?'misiuni':'missions'}</span></p><p className="mt-2 text-sm text-muted-foreground">{ro?'Progres verificat și salvat în contul tău.':'Verified progress saved to your account.'}</p></div><div><h2 className="flex items-center gap-2 font-semibold"><ShoppingBag className="size-4"/>{ro?'Recompense':'Rewards'}</h2><p className="my-3 text-sm text-muted-foreground">{ro?'500 de puncte pentru fiecare misiune și fundalul MiniScript+ pentru prima. Premiile sunt unice.':'500 points per mission and the MiniScript+ background for your first. Rewards are one-time.'}</p><Link href="/shop" className="inline-flex items-center gap-2 text-sm underline">{ro?'Explorează shop-ul':'Browse shop'}<ArrowUpRight className="size-4"/></Link></div></section>
  </div>;
}
