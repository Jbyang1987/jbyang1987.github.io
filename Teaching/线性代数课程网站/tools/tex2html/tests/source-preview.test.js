const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),C=require('../core'),W=require('../working-copy');
const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const start=app.indexOf('  function renderLectureCode('),end=app.indexOf('  function setLectureFrames',start);
function preview(config){
 const element={},state={config,files:[{name:'00 introduction.tex',text:'intro'},{name:'09 quadratic forms.tex',text:'first\nsecond'},{name:'10 tensors.tex',text:'tensor'}]};
 const frames=[{index:0,sourceStart:0,sourceEnd:5},{index:1,sourceStart:6,sourceEnd:12}],doc=W.create(C.selectLectureFiles(state.files,config).map(f=>({...f,ranges:config.frameSelection?.[f.name]?.length?frames.filter(frame=>config.frameSelection[f.name].includes(frame.index)):null}))),input={};
 doc.activeChapter='all';
 const sandbox={state,C,W,E:C.esc,codeView:{},$:id=>id==='tex-input'?input:element,ensureWorkingCopy:()=>doc,lineNumbers:()=>{},document:{querySelector:()=>({classList:{contains:()=>false}})},highlightTex:s=>s};
 vm.runInNewContext(app.slice(start,end)+'\nrenderLectureCode();',sandbox);return element.innerHTML;
}
test('code preview shows all default chapters, including chapter 09',()=>{
 const text=preview({lectureBatch:true});assert.match(text,/00 introduction/);assert.match(text,/09 quadratic forms/);assert.doesNotMatch(text,/10 tensors/);
});
test('code preview follows PPT and frame filters',()=>{
 const text=preview({lectureBatch:true,lectureSelection:['09 quadratic forms.tex'],frameSelection:{'09 quadratic forms.tex':[1]}});
 assert.match(text,/second/);assert.doesNotMatch(text,/first|intro|tensor/);
});
test('filtered code points into the same extracted text used by the editor',()=>{
 const text=preview({lectureBatch:true,lectureSelection:['09 quadratic forms.tex'],frameSelection:{'09 quadratic forms.tex':[1]}});
 assert.match(text,/data-working-start="\d+" data-working-end="\d+" data-source-line="2">second/);
});
