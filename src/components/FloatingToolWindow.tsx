import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './FloatingToolWindow.css';

type WindowRect={x:number;y:number;width:number;height:number};
interface Props{
 id:string;
 title:string;
 subtitle?:string;
 open:boolean;
 onClose:()=>void;
 children:ReactNode;
 initialWidth?:number;
 initialHeight?:number;
 initialX?:number;
 initialY?:number;
 minWidth?:number;
 minHeight?:number;
 className?:string;
}
let topZ=1200;
const clamp=(value:number,min:number,max:number)=>Math.min(Math.max(value,min),Math.max(min,max));
export function FloatingToolWindow({id,title,subtitle,open,onClose,children,initialWidth=520,initialHeight=420,initialX=140,initialY=120,minWidth=320,minHeight=220,className=''}:Props){
 const ref=useRef<HTMLDivElement>(null);
 const [rect,setRect]=useState<WindowRect>({x:initialX,y:initialY,width:initialWidth,height:initialHeight});
 const [maximized,setMaximized]=useState(false);
 const restoreRef=useRef<WindowRect>(rect);
 const [zIndex,setZIndex]=useState(()=>++topZ);
 const dragRef=useRef<{pointerId:number;startX:number;startY:number;originX:number;originY:number}|null>(null);
 const bringFront=()=>setZIndex(++topZ);
 useEffect(()=>{if(!open)return;bringFront();const fit=()=>setRect(r=>({width:Math.min(r.width,window.innerWidth-24),height:Math.min(r.height,window.innerHeight-92),x:clamp(r.x,8,window.innerWidth-Math.min(r.width,window.innerWidth-24)-8),y:clamp(r.y,72,window.innerHeight-Math.min(r.height,window.innerHeight-92)-8)}));fit();window.addEventListener('resize',fit);return()=>window.removeEventListener('resize',fit)},[open]);
 useEffect(()=>{if(!open||!ref.current)return;const el=ref.current;const observer=new ResizeObserver(entries=>{const cr=entries[0]?.contentRect;if(!cr||maximized)return;setRect(r=>({...r,width:Math.max(minWidth,Math.round(cr.width)),height:Math.max(minHeight,Math.round(cr.height))}))});observer.observe(el);return()=>observer.disconnect()},[open,maximized,minWidth,minHeight]);
 const pointerDown=(e:ReactPointerEvent<HTMLDivElement>)=>{if(maximized||e.button!==0)return;const target=e.target as HTMLElement;if(target.closest('button,input,select,textarea,a'))return;bringFront();dragRef.current={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,originX:rect.x,originY:rect.y};e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault()};
 const pointerMove=(e:ReactPointerEvent<HTMLDivElement>)=>{const d=dragRef.current;if(!d||d.pointerId!==e.pointerId)return;const nextX=d.originX+(e.clientX-d.startX);const nextY=d.originY+(e.clientY-d.startY);setRect(r=>({...r,x:clamp(nextX,4,window.innerWidth-r.width-4),y:clamp(nextY,28,window.innerHeight-r.height-4)}))};
 const pointerUp=(e:ReactPointerEvent<HTMLDivElement>)=>{if(dragRef.current?.pointerId===e.pointerId)dragRef.current=null};
 const toggleMax=()=>{bringFront();if(maximized){setRect(restoreRef.current);setMaximized(false)}else{restoreRef.current=rect;setRect({x:18,y:86,width:Math.max(minWidth,window.innerWidth-36),height:Math.max(minHeight,window.innerHeight-104)});setMaximized(true)}};
 if(!open)return null;
 const style=maximized?{left:rect.x,top:rect.y,width:rect.width,height:rect.height,zIndex}:{left:rect.x,top:rect.y,width:rect.width,height:rect.height,zIndex};
 return createPortal(<div ref={ref} className={`floating-tool-window ${maximized?'maximized':''} ${className}`} data-tool-window={id} style={style} onPointerDown={bringFront} dir="rtl">
   <div className="floating-tool-titlebar" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
    <div className="floating-tool-title"><b>{title}</b>{subtitle&&<span>{subtitle}</span>}</div>
    <div className="floating-tool-actions"><button type="button" className="floating-tool-max" onClick={toggleMax} aria-label={maximized?'بازگردانی اندازه':'بزرگ‌نمایی'} title={maximized?'بازگردانی اندازه':'بزرگ‌نمایی'}>{maximized?'↙':'↗'}</button><button type="button" className="floating-tool-close" onClick={onClose} aria-label="بستن" title="بستن">×</button></div>
   </div>
   <div className="floating-tool-body">{children}</div>
   {!maximized&&<div className="floating-resize-hint" aria-hidden="true">⋰</div>}
 </div>,document.body);
}
