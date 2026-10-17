import Student from '@/components/Student';
export default async function Play({params}:{params:Promise<{code:string}>}){return <Student code={(await params).code}/>;}
