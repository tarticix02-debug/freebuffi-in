import {NavLink} from 'react-router-dom';import {HomeIcon,PlayIcon,GridIcon,ChartIcon,GearIcon} from '../icons/NavIcons';
const ITEMS=[['/','Ana Sayfa',HomeIcon,true],['/play','Oyna',PlayIcon,false],['/variants','Varyantlar',GridIcon,false],['/stats','İstatistik',ChartIcon,false],['/settings','Ayarlar',GearIcon,false]] as const;
export function BottomNav(){return <nav className="bottom-nav">{ITEMS.map(([to,label,Icon,end])=><NavLink key={to} to={to} end={end} className={({isActive})=>`bottom-nav__item ${isActive?'bottom-nav__item--active':''}`}><Icon/><span>{label}</span></NavLink>)}</nav>}
