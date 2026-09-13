"use client";
import dynamic from 'next/dynamic';
import RouteGuard from '@/components/RouteGuard';
import { GameLoading } from '@/components/playground/GameLoading';
import '@/components/playground/game-ui.css';
const Playground = dynamic(() => import('@/components/playground/Playground'), { ssr:false, loading:()=> <div className="sx-game"><GameLoading ro={false}/></div> });
export default function IslandPage(){return <RouteGuard><Playground /></RouteGuard>;}
