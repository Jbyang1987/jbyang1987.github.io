/* Editable extracted documents. Imported lecture snapshots are never mutated. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TexWorkingCopy=api;})(typeof globalThis==='undefined'?this:globalThis,function(){
  'use strict';
  const clone=value=>JSON.parse(JSON.stringify(value));
  function fingerprint(text){let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return (h>>>0).toString(16);}
  function key(files,config){return JSON.stringify([!!config.lectureBatch,...files.map(f=>[f.name,f.text.length,fingerprint(f.text),(config.frameSelection?.[f.name]||[]).slice().sort((a,b)=>a-b)])]);}
  function clean(line){let result='',escaped=false;for(const ch of line){if(ch==='%'&&!escaped)break;result+=ch;escaped=ch==='\\'&&!escaped;}return result;}
  function create(files){
    const doc={version:1,text:'',segments:[],origins:[],revision:0,edits:[]};
    for(const file of files){
      if(doc.segments.length){doc.text+='\n\n';doc.segments.at(-1).end=doc.text.length;}
      const segment={name:file.name,start:doc.text.length,end:0};doc.segments.push(segment);
      doc.text+='% ===== '+file.name.replace(/[\r\n]/g,' ')+' =====\n';
      let offset=0,first=true;
      for(const line of file.text.split('\n')){
        const end=offset+line.length+1;
        if(!file.ranges||file.ranges.some(r=>offset<r.sourceEnd&&end>r.sourceStart)||/^\s*\\(?:section|subsection|subsubsection)\b/.test(line)){
          if(!first)doc.text+='\n';first=false;
          const value=clean(line);doc.origins.push({name:file.name,from:offset,to:end,start:doc.text.length,length:value.length});doc.text+=value;
        }
        offset=end;
      }
      segment.end=doc.text.length;
    }
    return doc;
  }
  function update(doc,text,ownerName=null){
    if(text===doc.text)return false;
    let start=0,end=doc.text.length,newEnd=text.length;
    while(start<end&&start<newEnd&&doc.text[start]===text[start])start++;
    while(end>start&&newEnd>start&&doc.text[end-1]===text[newEnd-1]){end--;newEnd--;}
    const length=newEnd-start,delta=length-(end-start),empty=doc.text.length===0;
    const boundary=p=>p<=start?p:p>=end?p+delta:start+length;
    for(let i=1;i<doc.segments.length;i++){const position=doc.segments[i].start;doc.segments[i].start=empty?text.length:ownerName===doc.segments[i-1].name&&position===start&&start===end?position+delta:boundary(position);}
    for(let i=0;i<doc.segments.length;i++)doc.segments[i].end=doc.segments[i+1]?.start??text.length;
    doc.text=text;doc.revision++;doc.edits.push({revision:doc.revision,start,end,length});return true;
  }
  function files(doc){return doc.segments.map(s=>({name:s.name,text:doc.text.slice(s.start,s.end)}));}
  function snapshot(doc){return {revision:doc.revision,segments:clone(doc.segments)};}
  function move(position,edit,edge){
    const {start,end,length}=edit;
    if(position<start)return position;
    if(position>end)return position+length-(end-start);
    if(start===end)return position+(edge==='start'?length:0);
    if(position===end)return start+length;
    return edge==='start'?start:start+length;
  }
  function locate(doc,source,file,start,end=start+1){
    const segment=source.segments.find(s=>s.name===file);if(!segment)return null;
    let a=segment.start+Math.max(0,Math.min(start,segment.end-segment.start)),b=segment.start+Math.max(0,Math.min(end,segment.end-segment.start));
    for(const edit of doc.edits){if(edit.revision<=source.revision)continue;a=move(a,edit,'start');b=move(b,edit,'end');}
    a=Math.min(doc.text.length,a);b=Math.max(a,Math.min(doc.text.length,b));return {start:a,end:b};
  }
  function originalOffset(doc,file,offset){
    const rows=doc.origins.filter(row=>row.name===file),row=rows.find(row=>offset>=row.from&&offset<row.to)||rows.find(row=>row.from>=offset)||rows.at(-1);
    const segment=doc.segments.find(s=>s.name===file);if(!segment)return null;
    return row?row.start+Math.max(0,Math.min(row.length,offset-row.from))-segment.start:0;
  }
  function restore(value){
    if(!value||value.version!==1||typeof value.text!=='string'||!Array.isArray(value.segments)||!Number.isSafeInteger(value.revision)||value.revision<0)throw Error('工作副本格式无效');
    let end=0;for(const s of value.segments){if(typeof s.name!=='string'||s.start!==end||!Number.isSafeInteger(s.end)||s.end<s.start||s.end>value.text.length)throw Error('工作副本章节边界无效');end=s.end;}
    if(end!==value.text.length)throw Error('工作副本内容与章节边界不一致');
    for(const e of value.edits||[])if(![e.start,e.end,e.length,e.revision].every(Number.isSafeInteger)||e.start<0||e.end<e.start||e.length<0||e.revision>value.revision)throw Error('工作副本编辑记录无效');
    return {...clone(value),edits:clone(value.edits||[]),origins:clone(value.origins||[])};
  }
  return {key,create,update,files,snapshot,locate,originalOffset,restore};
});
