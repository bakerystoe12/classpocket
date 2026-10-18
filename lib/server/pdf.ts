import 'server-only';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {Actor} from './auth';
import {HttpError} from './http';
export const SOURCE_BUCKET='lesson-sources',MAX_PDF_BYTES=10*1024*1024;
// Step 1: a short-lived signed upload token for <teacher-id>/<uuid>.pdf. The file goes straight from the
// browser to private storage, so its size is not limited by the Vercel Function request body.
export async function signUpload(actor:Actor,input:unknown){
 const b=z.object({filename:z.string().max(200),size:z.number().int().positive(),type:z.string().max(100)}).parse(input);
 if(!/\.pdf$/i.test(b.filename)||(b.type&&b.type!=='application/pdf'))throw new HttpError(415,'Choose a text-based PDF file. PPTX and images are not supported.','type');
 if(b.size>MAX_PDF_BYTES)throw new HttpError(413,'Use a PDF of 10 MB or less.','too-large');
 const path=`${actor.id}/${randomUUID()}.pdf`;const {data,error}=await actor.supabase.storage.from(SOURCE_BUCKET).createSignedUploadUrl(path);
 if(error||!data)throw new HttpError(error&&/row-level|policy|Unauthorized/i.test(error.message)?403:503,'Uploads are unavailable right now. Paste the lesson text instead.','upload-unavailable');
 return {bucket:SOURCE_BUCKET,path:data.path,token:data.token,maxBytes:MAX_PDF_BYTES};
}
// Step 2: read the uploaded object back (RLS: only its owner), extract page text, then delete it.
export async function extractUploaded(actor:Actor,path:string){
 if(!new RegExp(`^${actor.id}/[0-9a-f-]{36}\\.pdf$`).test(path))throw new HttpError(403,'That upload does not belong to you.','forbidden');
 const store=actor.supabase.storage.from(SOURCE_BUCKET);
 try{
  const {data,error}=await store.download(path);if(error||!data)throw new HttpError(404,'The uploaded PDF was not found. Upload it again.','not-found');
  if(data.size>MAX_PDF_BYTES)throw new HttpError(413,'Use a PDF of 10 MB or less.','too-large');
  const bytes=new Uint8Array(await data.arrayBuffer());if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw new HttpError(422,'That file is not a PDF.','type');
  return await pagesFromPdf(bytes);
 }finally{await store.remove([path]).catch(()=>{});}
}
export async function pagesFromPdf(bytes:Uint8Array){
 let parser:{getText:()=>Promise<{pages:{num:number;text:string}[]}>;destroy:()=>Promise<void>}|undefined;let pages:{page:number;text:string}[];
 try{const {PDFParse}=await import('pdf-parse');parser=new PDFParse({data:bytes}) as unknown as typeof parser;const result=await parser!.getText();pages=result.pages.map(p=>({page:p.num,text:p.text.trim().slice(0,30000)})).filter(p=>p.text).slice(0,150);}
 catch{throw new HttpError(422,'This PDF could not be read. Try an unencrypted, text-based PDF, paste the lesson text, or use the included sample.','unreadable');}
 finally{await parser?.destroy().catch(()=>{});}
 if(pages.reduce((n,p)=>n+p.text.length,0)<40)throw new HttpError(422,'This PDF has too little extractable text — it may be scanned slides. OCR is not supported; paste the notes instead.','scanned');
 return pages;
}
