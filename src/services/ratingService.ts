export function expectedScore(ratingA:number,ratingB:number):number{return 1/(1+Math.pow(10,(ratingB-ratingA)/400));}
export function computeNewRating(current:number,opponent:number,result:'win'|'loss'|'draw',kFactor=32):number{const score=result==='win'?1:result==='draw'?0.5:0;return Math.round(current+kFactor*(score-expectedScore(current,opponent)));}
