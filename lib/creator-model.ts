import {z} from 'zod';

export const creatorTemplates=['jump','circuit','light','solar','waves'] as const;
export const worldSchema=z.object({
 template:z.enum(creatorTemplates),object:z.enum(['cat','ball','rocket']),
 gravity:z.number().min(.5).max(25),launchSpeed:z.number().min(1).max(15),goalHeight:z.number().min(.1).max(100),
 voltage:z.number().min(0).max(24),resistance:z.number().min(1).max(100),
 red:z.number().int().min(0).max(100),green:z.number().int().min(0).max(100),blue:z.number().int().min(0).max(100),
 irradiance:z.number().min(0).max(1200),area:z.number().min(.1).max(5),
 frequency:z.number().min(.1).max(5),amplitude:z.number().min(0).max(2),phase:z.number().min(0).max(360)
}).strict();
export type CreatorWorld=z.infer<typeof worldSchema>;
export const worldDefaults:CreatorWorld={template:'jump',object:'cat',gravity:3.71,launchSpeed:5,goalHeight:2,voltage:6,resistance:10,red:100,green:40,blue:0,irradiance:500,area:1,frequency:1,amplitude:1,phase:0};
export const proposalSchema=z.object({title:z.string().trim().min(1).max(70),caption:z.string().trim().min(1).max(240),instructions:z.string().trim().min(1).max(300),accent:z.string().regex(/^#[0-9a-fA-F]{6}$/),world:worldSchema}).strict();
export type CreatorProposal=z.infer<typeof proposalSchema>;
export function validateProposal(value:unknown){const p=proposalSchema.parse(value);if(p.world.template==='jump'&&p.world.goalHeight>p.world.launchSpeed**2/(2*p.world.gravity))throw new Error('Jump goal is unreachable. Lower the target or increase launch speed.');return p;}
export const templateEngine={jump:'lander',circuit:'circuit',light:'mixer',solar:'ecosystem',waves:'waves'} as const;
export function proposalFor(template:CreatorWorld['template']):CreatorProposal{return {title:{jump:'Cat on Mars',circuit:'Snack-powered circuit',light:'Light Kitchen',solar:'My solar sculpture',waves:'Two waves, one plot twist'}[template],caption:'A little experiment I made. Change a control and see what happens.',instructions:'Try the controls, compare the result, and remix it into your own experiment.',accent:'#c4a5ff',world:{...worldDefaults,template}};}
export const parameterFields:{[K in CreatorWorld['template']]:{key:keyof Omit<CreatorWorld,'template'|'object'>;label:string;min:number;max:number;step:number}[]}={
 jump:[{key:'gravity',label:'Gravity (m/s²)',min:.5,max:25,step:.01},{key:'launchSpeed',label:'Launch speed (m/s)',min:1,max:15,step:.1},{key:'goalHeight',label:'Target height (m)',min:.1,max:100,step:.1}],
 circuit:[{key:'voltage',label:'Voltage (V)',min:0,max:24,step:.1},{key:'resistance',label:'Resistance (Ω)',min:1,max:100,step:1}],
 light:[{key:'red',label:'Red light (%)',min:0,max:100,step:1},{key:'green',label:'Green light (%)',min:0,max:100,step:1},{key:'blue',label:'Blue light (%)',min:0,max:100,step:1}],
 solar:[{key:'irradiance',label:'Irradiance (W/m²)',min:0,max:1200,step:10},{key:'area',label:'Panel area (m²)',min:.1,max:5,step:.1}],
 waves:[{key:'frequency',label:'Frequency (Hz)',min:.1,max:5,step:.1},{key:'amplitude',label:'Amplitude (m)',min:0,max:2,step:.1},{key:'phase',label:'Phase offset (degrees)',min:0,max:360,step:1}]
};
