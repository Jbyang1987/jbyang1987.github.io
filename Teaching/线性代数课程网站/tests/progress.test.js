const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm'), path=require('node:path');
const root=path.resolve(__dirname,'..');
const V1='linear-algebra.learning.v1',V2='linear-algebra.learning.v2';
function app(saved=new Map(), mode='normal'){
 const sandbox={window:{},localStorage:{
  getItem(key){if(mode==='read-blocked')throw new Error('blocked');return saved.has(key)?saved.get(key):null;},
  setItem(key,value){if(mode==='write-blocked')throw new Error('quota');saved.set(key,value);}
 }};
 vm.createContext(sandbox);
 for(const file of ['course.js','progress.js']) vm.runInContext(fs.readFileSync(path.join(root,'js',file),'utf8'),sandbox);
 return {p:sandbox.window.CourseProgress,c:sandbox.window.Course,saved};
}
test('阅读位置跨页保存，阅读不自动标为学会',()=>{
 const {p,c,saved}=app(),id=c.getUnits()[3].id;
 assert.equal(p.setVisited(id),true);assert.equal(p.getSummary().completed,0);
 assert.equal(app(saved).p.getResumeUnit().id,id);
 assert.equal(p.setVisited('https://invalid.example'),false);
});
test('标记、撤销以及小节与章节汇总',()=>{
 const {p,c}=app(),s=c.getSections()[0];
 for(const page of s.pages)p.setUnitCompleted(page.id,true);
 assert.equal(p.getSectionSummary(s.id).percent,100);
 assert.equal(p.getSummary().completed,9);assert.equal(p.isCompleted('chapter01'),false);
 for(const unit of c.getUnits().slice(9))p.setUnitCompleted(unit.id,true);
 assert.equal(p.getSummary().percent,100);assert.equal(p.isCompleted('chapter01'),true);
 p.setUnitCompleted(s.pages[2].id,false);
 assert.equal(p.getSectionSummary(s.id).completed,8);assert.equal(p.getChapterSummary('chapter01').completed,12);
});
test('旧整章已完成记录迁移，原键与完成时间保留',()=>{
 const old=JSON.stringify({version:1,chapters:{chapter01:{completed:true,completedAt:'2026-01-01'}}});
 const saved=new Map([[V1,old]]),{p,c}=app(saved);
 assert.equal(p.getSummary().completed,13);assert.equal(p.isCompleted('chapter01'),true);
 p.setVisited(c.getUnits()[0].id);
 assert.equal(saved.get(V1),old);
 assert.equal(JSON.parse(saved.get(V2)).units[c.getUnits()[0].id].completedAt,'2026-01-01');
 p.setUnitCompleted(c.getUnits()[0].id,false);
 assert.equal(app(saved).p.getSummary().completed,12);
});
test('旧未完成记录不会自动产生已学会的知识页',()=>{
 const saved=new Map([[V1,JSON.stringify({version:1,chapters:{chapter01:{completed:false}}})]]);
 assert.equal(app(saved).p.getSummary().completed,0);
});
test('整章批量标记和撤销作用于全部十三项',()=>{
 const {p}=app();p.setCompleted('chapter01',true);assert.equal(p.getSummary().completed,13);
 p.setCompleted('chapter01',false);assert.equal(p.getSummary().completed,0);
 assert.equal(p.setCompleted('chapter99',true),false);
});
test('两个标签页修改不同条目时合并最新记录',()=>{
 const saved=new Map(),a=app(saved),b=app(saved),units=a.c.getUnits();
 a.p.setUnitCompleted(units[0].id,true);b.p.setUnitCompleted(units[1].id,true);
 a.p.setVisited(units[2].id);assert.equal(b.p.getSummary().completed,2);
 assert.equal(b.p.getResumeUnit().id,units[2].id);
});
test('禁止写入时保留当前页内存中的标记和位置',()=>{
 const {p,c,saved}=app(new Map(),'write-blocked'),id=c.getUnits()[0].id;
 assert.equal(p.setUnitCompleted(id,true),false);assert.equal(p.isUnitCompleted(id),true);
 assert.equal(p.setVisited(id),false);assert.equal(p.getResumeUnit().id,id);
 assert.ok(p.getStorageIssue());assert.equal(saved.size,0);
});
test('损坏的数据不会被浏览位置自动覆盖',()=>{
 const saved=new Map([[V2,'broken']]),{p,c}=app(saved);
 assert.equal(p.getSummary().completed,0);assert.equal(p.setVisited(c.getUnits()[0].id),false);
 assert.equal(saved.get(V2),'broken');assert.ok(p.getStorageIssue());
});
test('读取被禁用仍可在当前页操作标记',()=>{
 const {p,c}=app(new Map(),'read-blocked');p.setUnitCompleted(c.getUnits()[0].id,true);
 assert.equal(p.isUnitCompleted(c.getUnits()[0].id),true);assert.ok(p.getStorageIssue());
});
test('过滤无效布尔值、未知阅读位置，不使用记录中的网址',()=>{
 const a=app(),id=a.c.getUnits()[0].id;
 const saved=new Map([[V2,JSON.stringify({version:2,chapters:{},units:{[id]:{completed:'true'}},lastVisited:{unitId:'javascript:bad'}})]]);
 const {p}=app(saved);assert.equal(p.getSummary().completed,0);assert.equal(p.getResumeUnit().id,id);
});
