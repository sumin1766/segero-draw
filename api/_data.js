// PUBLIC synthetic fixture only. The real 2026 personnel list must never be committed.
const stages = [
  { id:"captain", label:"대장", rule:"captain", ticketStart:21, ticketEnd:30, people:Array.from({length:10}, (_,i)=>({id:"captain-"+(i+1),name:"예시 대장 "+(i+1),category:"",role:"대장"})) },
  { id:"leader4", label:"조장·대리추첨 (규칙 확인 필요)", rule:"leader4", ticketStart:1, ticketEnd:4, people:Array.from({length:4}, (_,i)=>({id:"leader4-"+(i+1),name:"예시 조장 "+(i+1),category:"",role:"조장"})) },
  { id:"leaders", label:"교구장", rule:"leaders", ticketStart:1, ticketEnd:20, people:Array.from({length:20}, (_,i)=>({id:"leaders-"+(i+1),name:"예시 교구장 "+(i+1),category:"",role:"교구장"})) },
  ...[["elder","어르신 구역",46, "어르신"],["middle","중간 구역",69,"중간"],["young","젊은 구역",25,"젊은"]].map(([id,label,count,category])=>({id,label,rule:id,ticketStart:1,ticketEnd:count,people:Array.from({length:count},(_,i)=>({id:id+"-"+(i+1),name:"예시 "+label+" "+(i+1),category,role:"구역장"}))})),
  { id:"pastor",label:"담당 교역자",rule:"pastor",ticketStart:1,ticketEnd:10,people:Array.from({length:10},(_,i)=>({id:"pastor-"+(i+1),name:"예시 교역자 "+(i+1),category:"",role:"교역자"})) }
];
const slotMap={elder:{},middle:{},young:{}};
for(const st of stages.filter(s=>["elder","middle","young"].includes(s.id))){
  for(let n=1;n<=st.ticketEnd;n++){
    slotMap[st.id][n]={battalion:(n-1)%10+1,district:Math.floor((n-1)/10)%3+1,verified:false,sourceName:"synthetic example"};
  }
}
export const seed={schema:3,year:2027,source:"공개 저장소용 예시 데이터 (실제 편성용 아님)",stages,slotMap,results:{},holds:{},activity:[],revision:0,activeStageId:"captain",updatedAt:null};
