import SharedGizmo from '@/components/social/SharedGizmo';
export default async function Page({params}:{params:Promise<{token:string}>}){const {token}=await params;return <SharedGizmo token={token}/>;}
