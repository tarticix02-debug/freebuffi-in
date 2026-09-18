import {dbGetAll,dbPut} from './db';
export interface UserProfile{id:string;username:string;avatarInitial:string;rating:number;puzzleRating:number;createdAt:number;hasOnboarded:boolean;}
const PROFILE_ID='local-user';
const DEFAULT_PROFILE:UserProfile={id:PROFILE_ID,username:'Oyuncu',avatarInitial:'O',rating:1200,puzzleRating:1200,createdAt:Date.now(),hasOnboarded:false};
export async function getProfile(){const all=await dbGetAll<UserProfile>('profile');const p=all.find(x=>x.id===PROFILE_ID);if(p)return p;await dbPut('profile',DEFAULT_PROFILE);return DEFAULT_PROFILE;}
export async function updateProfile(patch:Partial<UserProfile>){const current=await getProfile();const updated={...current,...patch,id:PROFILE_ID};await dbPut('profile',updated);return updated;}
