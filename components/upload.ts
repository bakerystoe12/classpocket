'use client';
import {browserClient} from '@/lib/supabase/browser';
// Direct-to-storage upload: the server signs a one-time upload for the teacher's own folder,
// then the browser sends the PDF straight to private Supabase Storage (not through a Vercel Function).
export async function uploadPdf(file:File){
 if(!/\.pdf$/i.test(file.name))throw new Error('Choose a text-based PDF file.');
 if(file.size>10*1024*1024)throw new Error('Use a PDF of 10 MB or less.');
 const res=await fetch('/api/uploads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filename:file.name,size:file.size,type:file.type||'application/pdf'})});
 const sign=await res.json();if(!res.ok)throw new Error(sign.error||'Uploads are unavailable.');
 const {error}=await browserClient().storage.from(sign.bucket).uploadToSignedUrl(sign.path,sign.token,file,{contentType:'application/pdf'});
 if(error)throw new Error(/size|large/i.test(error.message)?'Use a PDF of 10 MB or less.':'The upload did not finish. Check your connection and try again.');
 return sign.path as string;
}
