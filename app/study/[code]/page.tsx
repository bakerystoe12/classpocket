import StudyHub from '@/components/study/StudyHub';
export default async function Page({params}:{params:Promise<{code:string}>}){return <StudyHub code={(await params).code}/>;}
