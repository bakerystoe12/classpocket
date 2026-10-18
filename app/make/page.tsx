import CreatorStudio from '@/components/social/CreatorStudio';
export default async function Page({searchParams}:{searchParams:Promise<{draft?:string}>}){const {draft}=await searchParams;return <main className="creator-page"><header className="creator-page-header"><a href="/">← ClassPocket</a><span>CREATOR PILOT</span></header><CreatorStudio initialId={draft}/></main>;}
