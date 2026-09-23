import type {ReactNode} from 'react';
/**
 * onClick yoksa div render eder: Ayarlar'daki tema swatch'ları ve derinlik
 * kartları Card İÇİNDE <button> taşıdığından button-inside-button geçersiz
 * DOM yaratıyordu (React validateDOMNesting uyarısı + ekran okuyucu bozulması).
 */
export function Card({children,onClick,disabled=false,className='',ariaLabel}:{children:ReactNode;onClick?:()=>void;disabled?:boolean;className?:string;ariaLabel?:string}){
  if (!onClick) return <div className={`card ${className}`} aria-label={ariaLabel}>{children}</div>;
  return <button type="button" disabled={disabled} aria-label={ariaLabel} onClick={onClick} className={`card ${!disabled?'card--interactive':''} ${disabled?'card--disabled':''} ${className}`}>{children}</button>;
}
