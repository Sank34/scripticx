"use client";
import dynamic from 'next/dynamic';
import RouteGuard from '@/components/RouteGuard';
const OpenWorld=dynamic(()=>import('@/components/playground/OpenWorld'),{ssr:false});
export default function WorldPage(){return <RouteGuard><OpenWorld/></RouteGuard>;}
