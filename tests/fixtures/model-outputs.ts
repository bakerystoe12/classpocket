// Hand-written examples of what a structured-output model returns for the demo prompts.
// Used by unit tests and by the mock Groq server; they are NOT real provider responses.
const blank={refused:false,refusalReason:'',assumptions:['Vertical launch, constant gravity, no air resistance.'],feedback:{success:'Nailed it!',retry:'Try a faster jump.'},difficulty:'standard',unsupported:[],changeSummary:''};
export const catPlanet={...blank,engine:'jumper',title:'Sky Cat',caption:'this cat has legs and the planet barely has gravity',objective:'Jump height depends on launch speed and gravity: h = v²/2g.',instructions:'Pick a jump speed and tap Jump. Reach the ledge.',
 params:[{name:'gravity',value:1.62},{name:'jumpSpeed',value:4},{name:'goalHeight',value:5}],visual:{accent:'#9fd3ff',character:'cat',characterColour:'#9aa3b5',planet:'Moon'},objects:['goal-ledge'],controls:[{param:'jumpSpeed',min:1,max:6}],
 challenge:{enabled:true,metric:'maxHeight',comparator:'atLeast',target:5,label:'Reach the 5 m ledge'},changeSummary:'A cat on the Moon with a 5 m ledge.'};
export const marsSpringOrange={...catPlanet,title:'Sky Cat on Mars',caption:'mars gravity + a spring pad = one very orange, very airborne cat',
 params:[{name:'gravity',value:3.71},{name:'jumpSpeed',value:4},{name:'goalHeight',value:3.5},{name:'springConstant',value:900},{name:'compression',value:.25},{name:'mass',value:4}],
 visual:{accent:'#ff9a52',character:'cat',characterColour:'#f28c28',planet:'Mars'},objects:['goal-ledge','spring-pad'],challenge:{enabled:true,metric:'maxHeight',comparator:'atLeast',target:3.5,label:'Reach the 3.5 m ledge'},
 unsupported:['Purring sound effects'],changeSummary:'Moved to Mars, added a spring launch pad and made the cat orange.'};
export const wrongEngineParam={...catPlanet,params:[{name:'gravity',value:1.62},{name:'voltage',value:12},{name:'goalHeight',value:5}]};
export const unreachable={...catPlanet,params:[{name:'gravity',value:24.79},{name:'jumpSpeed',value:2},{name:'goalHeight',value:50}],visual:{...catPlanet.visual,planet:'Jupiter'},challenge:{...catPlanet.challenge,target:50,label:'Reach 50 m'}};
export const refusal={...catPlanet,refused:true,refusalReason:'That isn’t something I can build for a school app.'};
