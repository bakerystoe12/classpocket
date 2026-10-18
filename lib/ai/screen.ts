// Conservative pre-screen run before any provider call. It keeps unnecessary personal information and
// clearly inappropriate requests away from the model; it is not a substitute for human moderation.
const personal:[RegExp,string][]=[
 [/[\w.+-]+@[\w-]+\.[\w.]+/,'an email address'],
 [/(?:\+?\d[\s-]?){8,}/,'a phone number'],
 [/\b\d{1,5}\s+\w+\s+(street|st|road|rd|avenue|ave|lane|ln|drive|dr|court|ct|crescent|cres)\b/i,'a street address'],
 [/\b(my name is|i live (at|in|on)|my address|my school is|i go to .{0,30} school|my password|my phone)\b/i,'details about you'],
 [/(^|\s)@[a-z0-9_.]{3,}/i,'a social media handle'],
];
const unsafe=/\b(kill(ing)?\s+(myself|yourself|people|him|her|them)|suicide|self[- ]?harm|cutting myself|porn\w*|nude\w*|naked|sex\w*|rape|gore|behead\w*|torture|terror\w*|school shooting|make a (bomb|weapon|gun)|meth|cocaine|heroin|vape|nazi\w*|slur)\b/i;
export type Screen={ok:true}|{ok:false;code:'personal-info'|'inappropriate';message:string};
export function screenPrompt(text:string):Screen{
 for(const [re,what] of personal)if(re.test(text))return {ok:false,code:'personal-info',message:`Please remove ${what} from your idea. ClassPocket never needs personal details to build a gizmo.`};
 if(unsafe.test(text))return {ok:false,code:'inappropriate',message:'That idea isn’t something ClassPocket can build. Try a playful science idea instead — like a cat jumping on Mars.'};
 return {ok:true};
}
