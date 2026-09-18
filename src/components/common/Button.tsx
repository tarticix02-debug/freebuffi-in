import type {ButtonHTMLAttributes,ReactNode} from 'react';
export function Button({children,variant='primary',...props}:{children:ReactNode;variant?:'primary'|'secondary'|'ghost'|'danger'}&ButtonHTMLAttributes<HTMLButtonElement>){return <button {...props} className={`btn btn--${variant} ${props.className??''}`}>{children}</button>}
