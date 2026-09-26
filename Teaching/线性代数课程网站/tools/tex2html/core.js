/* Browser + Node core. Never executes TeX or evaluates imported JavaScript. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Tex2HTML = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const labels = {theorem:'定理',proposition:'性质',lemma:'引理',corollary:'推论',definition:'定义',example:'例题',problem:'习题',question:'思考',fact:'事实',proof:'证明',remark:'注'};
  const clone = value => JSON.parse(JSON.stringify(value));
  const esc = value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const safeName = value => String(value || '').normalize('NFKC').replace(/[^\p{L}\p{N}_-]+/gu,'-').replace(/^-+|-+$/g,'').slice(0,100) || 'page';
  const color = (value, fallback='#2563eb') => /^#[a-f\d]{3,8}$/i.test(value || '') ? value : fallback;
  const num = (value,min,max,fallback) => Number.isFinite(+value) ? Math.min(max,Math.max(min,+value)) : fallback;
  const declarations = new Set(['newcommand','renewcommand','providecommand','def','DeclareMathOperator','newtheorem','definecolor']);
  const mathEnvs = new Set(['equation','equation*','align','align*','aligned','gather','gather*','gathered','multline','multline*','displaymath','math','eqnarray','eqnarray*']);
  const modes = ['onlyppt','onlyhandout','onlysummary','forppt','forhandout','forsummary'];
  const standardMath = new Set(('begin end frac dfrac tfrac cfrac sqrt vec overrightarrow overleftarrow overline underline widehat hat bar tilde widetilde dot ddot dots ldots cdots vdots ddots mathbb mathcal mathrm mathbf mathit mathsf mathtt mathfrak mathscr boldsymbol pmb operatorname text textrm textbf textit mbox left right middle big Big bigg Bigg bigl bigr Bigl Bigr biggl biggr Biggl Biggr alpha beta gamma delta epsilon varepsilon zeta eta theta vartheta iota kappa lambda mu nu xi pi varpi rho varrho sigma varsigma tau upsilon phi varphi chi psi omega Gamma Delta Theta Lambda Xi Pi Sigma Upsilon Phi Psi Omega sum prod coprod int iint iiint oint lim limsup liminf min max inf sup det dim ker hom log ln exp sin cos tan cot sec csc arcsin arccos arctan sinh cosh tanh gcd lcm Pr deg arg to mapsto longmapsto rightarrow leftarrow leftrightarrow Rightarrow Leftarrow Leftrightarrow longrightarrow longleftarrow longleftrightarrow Longrightarrow Longleftarrow Longleftrightarrow xrightarrow xleftarrow implies iff in notin ni subset supset subseteq supseteq subsetneq supsetneq cup cap bigcup bigcap setminus emptyset varnothing forall exists nexists neg land lor wedge vee oplus otimes bigoplus bigotimes times cdot div pm mp ast star circ bullet le leq ge geq neq ne equiv sim simeq approx cong propto ll gg prec succ preceq succeq parallel perp mid nmid infty partial nabla ell hbar imath jmath Re Im aleph angle triangle triangleleft triangleright prime top bot vert Vert lvert rvert lVert rVert langle rangle lceil rceil lfloor rfloor lbrace rbrace backslash colon quad qquad enspace thinspace hspace vspace smallskip medskip bigskip limits nolimits displaystyle textstyle scriptstyle scriptscriptstyle overset underset stackrel underbrace overbrace phantom hphantom vphantom smash rule strut boxed tag tag* notag nonumber label ref eqref substack cases matrix pmatrix bmatrix Bmatrix vmatrix Vmatrix array hline cline cr color textcolor bf rm cal it sf tt char unicode space').split(/\s+/));
  ['xleftrightarrow','xLeftrightarrow','xRightarrow','xmapsto','xrightleftharpoons','bigwedge','odot','downarrow','uparrow','nparallel','iddots','rightsquigarrow','choose','atop','makebox','fbox','arraycolsep','not'].forEach(name=>standardMath.add(name));
  function defaults() {
    return {chapter:1,section:1,start:1,autoNumber:true,sectionSign:true,bodyNumber:false,bodyTitle:false,htmlTitleNumber:false,slugMode:'number',cleanTitle:true,subtitle:'framesubtitle',description:'empty',pp:'ignore',pause:'ignore',splitEnvironment:'none',separator:'\\lessonbreak',keepFrameTitles:false,warningLevel:'all',pretty:true,theme:'light',macros:{},environments:Object.fromEntries(Object.entries(labels).map(([key,label])=>[key,{label,light:'#2563eb',dark:'#93c5fd',background:'#eff6ff',darkBackground:'#17253b',border:'#3b82f6',darkBorder:'#60a5fa',numbered:!['proof','remark'].includes(key),collapsed:key==='proof',icon:false,headingSize:17,bodySize:16,padding:16,radius:10,printBackground:false}])),colors:Object.fromEntries(Object.entries({blue:['#2563eb','#93c5fd'],red:['#dc2626','#fca5a5'],green:['#15803d','#86efac'],yang:['#0e7490','#67e8f9'],rev:['#a21caf','#f0abfc']}).map(([k,v])=>[k,{light:v[0],dark:v[1],mode:'color'}])),beamer:Object.fromEntries(['frame','frametitle','framesubtitle','title','author','institute','date','titlepage','section','subsection','subsubsection','columns','column','only','uncover','visible','alt','onslide',...modes].map(k=>[k,['author','institute','date','section','subsection','subsubsection'].includes(k)?'hide':'show'])),figure:{tikz:true,xypic:true,engine:'browser',directory:'assets/generated',prefix:'figure',width:640,maxWidth:100,transparent:true,background:'#ffffff',darkBackground:'#182131',crop:true,textMode:'path',light:true,dark:true,caption:true,scroll:true,aspect:true,service:'http://127.0.0.1:4174',preamble:'',libraries:'arrows.meta,calc',replacements:{}},image:{maxWidth:100,caption:true},unknown:{}};
  }
  function mergeConfig(input={}) {
    function merge(a,b) {for(const [k,v] of Object.entries(b || {})) {if(['__proto__','constructor','prototype'].includes(k))continue; a[k]=v && typeof v==='object' && !Array.isArray(v)?merge(a[k] && typeof a[k]==='object'?a[k]:{},v):v;}return a;}
    return merge(defaults(),input);
  }
  // Preserve offsets while erasing TeX comments, including escaped percent signs.
  function uncomment(source) {
    return source.replace(/(?:\\[\s\S]|%[^\n]*|[^\\%])+/g, chunk=>{
      let out=''; for(let i=0;i<chunk.length;i++){if(chunk[i]==='\\' && i+1<chunk.length){out+=chunk.slice(i,i+2);i++;}else if(chunk[i]==='%'){while(i<chunk.length && chunk[i]!=='\n'){out+=' ';i++;}if(i<chunk.length)out+='\n';}else out+=chunk[i];} return out;
    });
  }
  const skip = (s,p) => {while(/\s/.test(s[p] || '') && p<s.length)p++;return p;};
  function group(s,p,open='{',close='}') {
    p=skip(s,p); if(s[p]!==open)return null;
    let level=1,brace=0,i=p+1;
    for(;i<s.length;i++) {if(s[i]==='\\'){i++;continue;} if(open!=='{'){if(s[i]==='{')brace++;if(s[i]==='}')brace--;if(brace>0)continue;}if(s[i]===open)level++;
      if(s[i]===close){level--;if(!level)return {value:s.slice(p+1,i),start:p,inner:p+1,end:i+1,closed:true};}}
    return {value:s.slice(p+1),start:p,inner:p+1,end:s.length,closed:false};
  }
  function command(s,p) {const m=/^\\([A-Za-z@]+|[^\r\n])/.exec(s.slice(p));return m?{name:m[1],start:p,end:p+m[0].length}:null;}
  const lineAt = (s,p) => 1+(s.slice(0,p).match(/\n/g)||[]).length;
  function warning(file,source,start,commandName,raw,reason,suggestion='在规则管理器中添加展开规则，或编辑原始 TeX。',severity='warning') {
    return {file,line:lineAt(source,start),offset:start,command:commandName,raw,reason,suggestion,severity};
  }
  function parseStyles(files) {
    const macros=Object.create(null),environments=Object.create(null),colors=Object.create(null),warnings=[],definitions=[];
    for(const file of files) {
      const source=file.text || '',s=uncomment(source);let i=0;
      while(i<s.length) {
        if(s[i]!=='\\'){i++;continue;}const c=command(s,i);if(!c){i++;continue;}let kind=c.name;
        if(macros[kind] && /^(?:\{\s*)?\\(?:newcommand|renewcommand|providecommand)(?:\s*\})?$/.test(macros[kind].body))kind=macros[kind].body.match(/\\(\w+)/)[1];
        if(!declarations.has(kind)){if(/\.sty$/i.test(file.name))warnings.push(warning(file.name,source,c.start,kind,s.slice(c.start,Math.min(s.indexOf('\n',c.start)<0?s.length:s.indexOf('\n',c.start),c.start+240)),'此样式命令未在浏览器执行','正文中引用的未知命令会另外标记；本地编译所需设置可填入前导代码。',/^newenvironment|^renewenvironment|^newif|^if/.test(kind)?'warning':'info'));i=c.end;continue;}
        let p=c.end;if(s[p]==='*')p++; let name,body,args=0,optional=null,unsafe='';
        const take=(open='{',close='}')=>{const g=group(s,p,open,close);if(g)p=g.end;return g;};
        if(['newcommand','renewcommand','providecommand','DeclareMathOperator','def'].includes(kind)) {
          const n=take(); if(n)name=n.value.trim().replace(/^\\/,'');else {const q=command(s,skip(s,p));if(q){name=q.name;p=q.end;}}
          if(kind==='def') {const begin=s.indexOf('{',p);if(begin<0){i=c.end;continue;}const param=s.slice(p,begin).trim();args=(param.match(/#\d/g)||[]).length;if(param!==Array.from({length:args},(_,n)=>'#'+(n+1)).join(''))unsafe='带分隔符的 \\def 参数暂不支持';p=begin;}
          else if(kind!=='DeclareMathOperator'){const a=take('[',']');if(a){args=+a.value;const opt=take('[',']');if(opt)optional=opt.value;}}
          const b=take();body=b?.value;if(b && !b.closed)unsafe='宏定义的大括号未闭合';
          if(kind==='DeclareMathOperator')body='\\operatorname'+(s[c.end]==='*'?'*':'')+'{'+body+'}';
          if(body && /\\(?:if\w*|else|fi|csname|endcsname|expandafter|input|include|catcode|write|read|newcommand|renewcommand)\b/.test(body) && !/^\\(?:newcommand|renewcommand)$/.test(body.trim()))unsafe='包含条件、动态定义或文件操作，不能安全展开';
          if(name && body!==undefined && /^[A-Za-z@]+$/.test(name)) {if(kind!=='providecommand'||!macros[name])macros[name]={name,body,defaultBody:body,args:num(args,0,9,0),optional,enabled:true,scope:'all',source:file.name,line:lineAt(source,c.start),unsafe};if(unsafe)warnings.push(warning(file.name,source,c.start,name,source.slice(c.start,p),unsafe));}
          else warnings.push(warning(file.name,source,c.start,kind,source.slice(c.start,p),'无法识别宏定义'));
        } else if(kind==='newtheorem') {
          const n=take();take('[',']');const title=take();take('[',']');if(n&&title)environments[n.value]={label:title.value};
        } else {const n=take(),model=take(),v=take();if(n&&model&&v){let hex;if(model.value==='HTML')hex='#'+v.value.trim();else if(['RGB','rgb'].includes(model.value)){const values=v.value.split(',').map(Number);if(values.length===3&&values.every(Number.isFinite))hex='#'+values.map(n=>Math.round(num(n*(model.value==='rgb'?255:1),0,255,0)).toString(16).padStart(2,'0')).join('');}if(hex)colors[n.value]={light:color(hex),dark:color(hex),mode:'color'};else warnings.push(warning(file.name,source,c.start,'definecolor',source.slice(c.start,p),'暂不支持此颜色模型'));}}
        definitions.push({file:file.name,start:c.start,end:p});i=Math.max(p,c.end);
      }
    }
    return {macros,environments,colors,warnings,definitions};
  }
  function parse(source, file='input.tex', base=0, fullSource=source) {
    const s=uncomment(source),nodes=[],issues=[];let i=0;
    const add=(type,start,end,extra={})=>nodes.push({type,start:base+start,end:base+end,raw:source.slice(start,end),file,...extra});
    while(i<s.length) {
      const start=i;
      if(s[i]==='$'||s.startsWith('\\[',i)||s.startsWith('\\(',i)) {
        const open=s[i]==='$'?(s[i+1]==='$'?'$$':'$'):s.slice(i,i+2),close=open==='\\['?'\\]':open==='\\('?'\\)':open;
        let p=i+open.length;while(p<s.length){if(s.startsWith(close,p))break;if(s[p]==='\\')p+=2;else p++;}const closed=p<s.length;
        i=closed?p+close.length:s.length;add('formula',start,i,{tex:s.slice(start+open.length,p),display:['$$','\\['].includes(open),closed});
        if(!closed)issues.push(warning(file,fullSource,base+start,open,source.slice(start,i),'数学公式未闭合'));continue;
      }
      if(s[i]==='\\') {
        const c=command(s,i);if(!c){add('text',i,++i);continue;}i=c.end;
        if(c.name==='begin') {
          const name=group(s,i);if(!name){add('unknown',start,i,{name:'begin'});continue;}i=name.end;
          let p=i,depth=1,ending=null;
          while(p<s.length){if(s[p]!=='\\'){p++;continue;}const q=command(s,p);if(!q){p++;continue;}if(q.name==='begin'||q.name==='end'){const g=group(s,q.end);if(g && g.value===name.value){depth+=q.name==='begin'?1:-1;if(!depth){ending={start:p,end:g.end};break;}}}p=q.end;}
          const innerEnd=ending?ending.start:s.length;i=ending?ending.end:s.length;
          add('environment',start,i,{name:name.value,inner:s.slice(name.end,innerEnd),innerStart:base+name.end,closed:!!ending});
          if(!ending)issues.push(warning(file,fullSource,base+start,name.value,source.slice(start,i),'环境未闭合'));continue;
        }
        if(c.name==='xy') {const end=s.indexOf('\\endxy',i);i=end<0?s.length:end+6;add('diagram',start,i,{name:'xypic'});if(end<0)issues.push(warning(file,fullSource,base+start,'xy',source.slice(start,i),'XY-pic 未闭合'));continue;}
        let overlay=null,opt=null,args=[],frameboxSize=null;
        if(s[i]==='*')i++;
        if(s[skip(s,i)]==='<'){const g=group(s,i,'<','>');overlay=g?.value;i=g?.end||i;}
        const o=group(s,i,'[',']');if(o){opt=o.value;i=o.end;}
        if(c.name==='framebox'&&s[i]==='('){const close=s.indexOf(')',i+1);if(close>=0){frameboxSize=s.slice(i+1,close).trim();i=close+1;}}
        // Only consume groups; command-specific rendering uses the unconsumed groups too.
        while(args.length<9){const g=group(s,i);if(!g)break;args.push(g);i=g.end;}
        add('command',start,i,{name:c.name,args:args.map(g=>({...g,start:base+g.start,inner:base+g.inner,end:base+g.end})),optional:opt,overlay,frameboxSize});continue;
      }
      if(s[i]==='{') {const g=group(s,i);i=g.end;add('group',start,i,{inner:g.value,innerStart:base+g.inner});if(!g.closed)issues.push(warning(file,fullSource,base+start,'{',source.slice(start,i),'分组未闭合'));continue;}
      while(i<s.length&&!['\\','$','{'].includes(s[i]))i++;add('text',start,i,{value:s.slice(start,i)});
    }
    return {nodes,warnings:issues};
  }
  function expand(tex,macros,context,warn,stack=[],budget={remaining:2000}) {
    let result='';const s=tex;
    for(let i=0;i<s.length;){if(s[i]!=='\\'){result+=s[i++];continue;}const c=command(s,i);if(!c){result+=s[i++];continue;}const m=macros[c.name];
      if(!Object.hasOwn(macros,c.name)||!m||m.enabled===false||m.scope==='preserve'||(m.scope==='math'&&context!=='math')||(m.scope==='text'&&context!=='text')){result+=s.slice(i,c.end);i=c.end;continue;}
      let p=c.end,args=[],failed=m.unsafe;
      if(stack.includes(c.name))failed='宏递归循环：'+[...stack,c.name].join(' → ');
      if(stack.length>=24||--budget.remaining<0)failed='宏展开超过安全上限';
      if(m.optional!==null&&m.optional!==undefined){const opt=group(s,p,'[',']');args.push(opt?opt.value:m.optional);if(opt)p=opt.end;}
      for(let a=args.length;a<m.args;a++){const g=group(s,p);if(g&&g.closed){args.push(g.value);p=g.end;}else {p=skip(s,p);const token=command(s,p);if(token){args.push(s.slice(p,token.end));p=token.end;}else if(p<s.length){args.push(s[p++]);}else {failed='宏缺少参数';break;}}}
      if(failed){warn(c.name,s.slice(i,p),failed);result+=s.slice(i,p);i=p;continue;}
      const body=m.body.replace(/#([1-9])/g,(_,n)=>args[+n-1]??'#'+n);
      result+=expand(body,macros,context,warn,[...stack,c.name],budget);i=p;
      if(result.length>1000000){warn(c.name,s.slice(i),'宏展开文本过大');return result+s.slice(i);}
    }return result;
  }
  function titleText(tex) {return tex.replace(/\\(?:textbf|textit|emph|blue|red|green|yang|rev)\s*\{([^{}]*)\}/g,'$1').replace(/\\(?:quad|qquad|small|large|Large|LARGE)\b/g,' ').replace(/[{}]/g,'').replace(/\s+/g,' ').trim();}
  function figureKey(raw) {let hash=2166136261;for(let i=0;i<raw.length;i++){hash^=raw.charCodeAt(i);hash=Math.imul(hash,16777619);}return 'fig-'+(hash>>>0).toString(16);}
  // Intentionally strict: never returns a partial picture for unsupported TikZ.
  function simpleTikz(raw,options={},dark=false) {
    let source=uncomment(raw).trim().replace(/^\\begin\{tikzpicture\}\s*/,'').replace(/\\end\{tikzpicture\}\s*$/,'').trim();
    if(source.startsWith('['))throw Error('图形全局选项需要本地编译');
    source=source.replace(/\\(?:pp|pause)\b/g,'');
    const paths=[];const point='\\(\\s*(-?[\\d.]+)\\s*,\\s*(-?[\\d.]+)\\s*\\)';
    const re=new RegExp('^\\\\draw(?:\\[([^\\]]*)\\])?\\s*('+point+'(?:\\s*--\\s*'+point+')+)\\s*;');
    while(source.trim()){source=source.trim();const m=re.exec(source);if(!m)throw Error('浏览器子集仅支持数值坐标的 \\draw 折线；标签、计算、节点和其他命令需本地编译');const opts=(m[1]||'').split(',').map(x=>x.trim()).filter(Boolean);if(opts.some(o=>!['->','<-','<->','thick','very thick','thin','dashed','dotted','red','blue','green','black','purple'].includes(o)))throw Error('不支持的 TikZ 绘图选项');const pts=[...m[2].matchAll(/\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/g)].map(m=>[+m[1]*60,-m[2]*60]);if(pts.some(p=>p.some(x=>!Number.isFinite(x))))throw Error('无效坐标');paths.push({pts,opts});source=source.slice(m[0].length);}
    if(!paths.length)throw Error('没有可转换的路径');const all=paths.flatMap(p=>p.pts),xs=all.map(p=>p[0]),ys=all.map(p=>p[1]);let x=Math.min(...xs)-18,y=Math.min(...ys)-18,w=Math.max(...xs)-x+18,h=Math.max(...ys)-y+18;
    if(options.crop===false){x-=40;y-=40;w+=80;h+=80;}const palette=dark?{red:'#fca5a5',blue:'#93c5fd',green:'#86efac',purple:'#d8b4fe',black:'#e2e8f0'}:{red:'#dc2626',blue:'#2563eb',green:'#15803d',purple:'#9333ea',black:'#172033'};
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${num(options.width,80,3000,640)}" height="${Math.round(num(options.width,80,3000,640)*h/w)}" role="img" aria-label="TikZ 图形"><defs>${paths.map((p,i)=>`<marker id="a${i}" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto-start-reverse"><path d="M0,0 L7,3 L0,6 Z" fill="${palette[p.opts.find(o=>palette[o])]||palette.black}"/></marker>`).join('')}</defs>${options.transparent===false?`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color(dark?options.darkBackground:options.background)}"/>`:''}${paths.map((p,i)=>`<polyline points="${p.pts.map(a=>a.join(',')).join(' ')}" fill="none" stroke="${palette[p.opts.find(o=>palette[o])]||palette.black}" stroke-width="${p.opts.includes('very thick')?3:p.opts.includes('thick')?2:1.4}"${p.opts.some(o=>o==='dashed'||o==='dotted')?' stroke-dasharray="4 4"':''}${p.opts.some(o=>o==='->'||o==='<->')?` marker-end="url(#a${i})"`:''}${p.opts.some(o=>o==='<-'||o==='<->')?` marker-start="url(#a${i})"`:''}/>`).join('')}</svg>`;
  }
  function convert(files,styleFiles=[],inputConfig={},assets={}) {
    const config=mergeConfig(inputConfig),registry=parseStyles([...styleFiles,...files]);
    const macros=Object.assign(Object.create(null),registry.macros,config.macros);
    for(const [k,v] of Object.entries(registry.environments))if(!config.environments[k])config.environments[k]={...clone(config.environments.theorem),...v};
    for(const [k,v] of Object.entries(registry.colors))if(!config.colors[k])config.colors[k]=v;
    const model={version:1,section:`${config.chapter}.${config.section}`,pages:[],globalWarnings:[...registry.warnings],frames:[],log:[],config,registry,files:files.map(f=>({name:f.name})),assets:[]};
    let frameCount=0,blockCount=0;const envCounts={};
    for(const file of files) {
      const source=file.text || '';let masked=source;
      const defs=registry.definitions.filter(d=>d.file===file.name);
      for(const d of defs)masked=masked.slice(0,d.start)+masked.slice(d.start,d.end).replace(/[^\r\n]/g,' ')+masked.slice(d.end);
      const top=parse(masked,file.name);model.globalWarnings.push(...top.warnings);
      const metadata={};let outside=[],frames=[],subsectionCounter=0;const hasRenderableOutside=nodes=>nodes.some(n=>{if(n.type==='text')return n.value.trim();if(n.type!=='command')return true;return !['title','author','institute','date','section','subsection','subsubsection','makeatletter','makeatother','ifodd','ifnum','ifdefined','ifx','else','fi','value','titlepage'].includes(n.name);});
      const scan=nodes=>{for(const n of nodes) {
        if(n.type==='environment'&&n.name==='document'){const p=parse(n.inner,file.name,n.innerStart,source);model.globalWarnings.push(...p.warnings);scan(p.nodes);continue;}
        if((n.type==='environment'&&n.name==='frame')||(n.type==='command'&&n.name==='frame')) {
          if(hasRenderableOutside(outside))frames.push({nodes:outside,title:'未分帧内容',start:outside[0].start});outside=[];
          let inner=n.type==='environment'?n.inner:n.args[0]?.value||'',base=n.type==='environment'?n.innerStart:n.args[0]?.inner||n.start,title='',subtitle='';
          if(n.type==='environment') {let p=0;const overlay=group(inner,p,'<','>');if(overlay)p=overlay.end;const opt=group(inner,p,'[',']');if(opt)p=opt.end;const t=group(inner,p);if(t){title=t.value;p=t.end;const sub=group(inner,p);if(sub){subtitle=sub.value;p=sub.end;}}base+=p;inner=inner.slice(p);}
          const parsed=parse(inner,file.name,base,source);model.globalWarnings.push(...parsed.warnings);
          const body=parsed.nodes.filter(node=>{if(node.type==='command'&&['frametitle','framesubtitle'].includes(node.name)){if(node.name==='frametitle')title=node.args[0]?.value||title;else subtitle=node.args[0]?.value||subtitle;return config.beamer[node.name]==='preserve';}return true;});
          frames.push({nodes:body,title:metadata.subsubsection||title||metadata.subsection||metadata.title||'未命名页面',frameTitle:title,subtitle,sectionTitle:metadata.section||'',subsectionTitle:metadata.subsection||'',subsectionIndex:metadata.subsectionIndex||0,subsubsectionTitle:metadata.subsubsection||'',start:n.start,raw:n.raw});continue;
        }
        if(n.type==='command'&&['title','author','institute','date','section','subsection','subsubsection'].includes(n.name)) {metadata[n.name]=n.args.at(-1)?.value||'';if(n.name==='subsection'){metadata.subsectionIndex=++subsectionCounter;metadata.subsubsection='';}if(['section','subsection','subsubsection'].includes(n.name)&&config.beamer[n.name]!=='hide')outside.push(n);continue;}
        if(n.type==='command'&&['documentclass','usepackage','RequirePackage','ProvidesPackage','usetikzlibrary','setbeamertemplate','usetheme','setcounter','setmode'].includes(n.name)){model.globalWarnings.push(warning(file.name,source,n.start,n.name,n.raw,'此设置不在正文执行；已保留在转换报告中。','图形依赖可填入本地编译前导代码。','info'));continue;}
        outside.push(n);
      }};scan(top.nodes);if(hasRenderableOutside(outside))frames.push({nodes:outside,title:metadata.title||'未分帧内容',start:outside[0]?.start||0});
       if(!frames.length&&source.trim())frames=[{nodes:[],title:metadata.title||'空白页面',start:0}];
       const selectedFrames=config.frameSelection?.[file.name];
       if(Array.isArray(selectedFrames))frames=frames.filter((_,index)=>selectedFrames.includes(index));
       if(frames.some(frame=>frame.title!=='未分帧内容'))frames=frames.filter(frame=>frame.title!=='未分帧内容');
      for(const frame of frames) {
        const frameId=++frameCount,warnings=[];
        const warn=(n,reason,suggestion,severity)=>{const w=warning(file.name,source,n.start,n.name||n.type,n.raw,reason,suggestion,severity);warnings.push(w);return w;};
        const nested=(text,base)=>{const p=parse(text,file.name,base,source);warnings.push(...p.warnings);return p.nodes;};
        const reserved=new Set(['pp','pause',...modes,...Object.keys(config.colors)]),inlineAssets=[];
        const inlineAsset=block=>{inlineAssets.push(block);return `<!--tex2html-slot:${block.id}-->`;};
        function unknown(n,reason='尚未实现此命令或环境') {
          const rule=config.unknown[n.name];
          if(rule?.mode==='text')return esc(rule.value ?? n.raw);
          if(rule?.mode==='unwrap')return (n.args||[]).map(a=>inlineNodes(nested(a.value,a.inner))).join('')||(n.inner?inlineNodes(nested(n.inner,n.innerStart)):esc(n.raw));
          warn(n,reason);return `<code class="tex-unresolved" title="${esc(reason)}">${esc(n.raw)}</code>`;
        }
        function math(tex,n,display=false) {
          const cleanPauses=value=>{let out='';for(let i=0;i<value.length;){const c=value[i]==='\\'?command(value,i):null;if(!c){out+=value[i++];continue;}if(['pp','pause'].includes(c.name)&&config[c.name]==='ignore'){i=group(value,c.end,'[',']')?.end||c.end;}else {out+=value.slice(i,c.end);i=c.end;}}return out;};
          const expanded=cleanPauses(expand(cleanPauses(tex),macros,'math',(name,raw,reason)=>warn({...n,name,raw},reason)));
          const unsupported=[...new Set([...expanded.matchAll(/\\([A-Za-z@]+)/g)].map(m=>m[1]).filter(name=>!standardMath.has(name)))];
          unsupported.forEach(name=>warn({...n,name,raw:tex},`数学命令 \\${name} 未转换；原公式完整保留。`));
          return `${unsupported.length?'<span class="tex-math-warning" title="存在未解析数学命令">⚠</span>':''}${display?'\\[':'\\('}${esc(expanded)}${display?'\\]':'\\)'}`;
        }
        function modeWrap(n,html) {
          const mode=config.beamer[n.name]||'show';
          if(mode==='hide'||mode==='delete'){warn(n,'用户规则已隐藏此内容','将该命令的显示规则改为“显示”可恢复。','info');return '';}
          if(mode==='preserve')return unknown(n,'用户选择保留原始命令');
          if(mode==='collapse')return `<details><summary>显示补充内容</summary>${html}</details>`;
          if(mode==='supplement')return `<aside class="tex-supplement">${html}</aside>`;
          return html;
        }
        function inline(n) {
          if(n.type==='text')return esc(n.value).replace(/~/g,'&nbsp;');
          if(n.type==='group')return inlineNodes(nested(n.inner,n.innerStart));
          if(n.type==='formula') {
            if(/\\(?:begin\{tikzpicture\}|xymatrix|xy\b)/.test(n.tex))return inlineAsset(makeFigure(n,/tikzpicture/.test(n.tex)?'tikz':'xypic',n.tex));
            return math(n.tex,n,n.display);
          }
          if(n.type==='environment'||n.type==='diagram')return blocks([n]).map(inlineAsset).join('');
          if(n.type!=='command')return unknown(n);
          const a=n.args||[],arg=index=>a[index]?inlineNodes(nested(a[index].value,a[index].inner)):'',name=n.name;
          if(name==='pp'||name==='pause') {if(config[name]==='ignore')return '';if(config[name]==='preserve')return unknown(n,'用户选择保留停顿命令');warn(n,'嵌套内容中的停顿不能安全分页，请在外层插入分隔线。','顶层停顿可按当前规则拆分。');return '<span class="tex-break-note">〔内容分界〕</span>';}
          if(macros[name]&&!reserved.has(name)&&macros[name].enabled!==false&&macros[name].scope!=='math'&&macros[name].scope!=='preserve') {let failed=false;const expanded=expand(n.raw,macros,'text',(name,raw,reason)=>{failed=true;warn({...n,name,raw},reason);});if(failed||expanded===n.raw)return unknown(n,'宏不能安全展开，保留原文');return inlineNodes(nested(expanded,n.start));}
          if(config.colors[name]||name==='textcolor') {const key=name==='textcolor'?a[0]?.value:name,rule=config.colors[key]||{mode:'color'},content=arg(name==='textcolor'?1:0);if(!config.colors[key])warn(n,'颜色未定义，正文已保留','在颜色管理器中添加此名称。');const tag=rule.mode==='bold'?'strong':rule.mode==='mark'?'mark':'span';return rule.mode==='plain'?content:`<${tag} class="tex-color-${safeName(key)}">${content}</${tag}>`;}
           if(name==='framebox'){const content=arg(0),size=String(n.frameboxSize||n.optional||'').split(',').map(v=>v.trim()),width=/^\d+(?:\.\d+)?$/.test(size[0]||'')?`${Number(size[0])}px`:'';return `<span class="tex-framebox"${width?` style="width:${width}"`:''}>${content}</span>`;}
           if(name==='makebox'){const width=String(n.optional||'').match(/^\s*([\d.]+)\s*(cm|mm|pt|em)?/i),style=width?` style="min-width:${width[1]}${width[2]||'px'};display:inline-block"`:'';return `<span class="tex-makebox"${style}>${arg(0)}</span>`;}
          const tags={textbf:'strong',emph:'em',textit:'em',underline:'u',alert:'strong',texttt:'code',textrm:'span',textnormal:'span',mbox:'span',fbox:'span',footnote:'small'};
          if(tags[name])return `<${tags[name]}${name==='footnote'?' class="tex-footnote"':''}>${arg(0)}</${tags[name]}>`+a.slice(1).map((_,i)=>arg(i+1)).join('');
          if(modes.includes(name)||['only','uncover','visible','onslide','alt'].includes(name)) {if(!a.length&&n.overlay)return unknown(n,'无参数的 overlay 开关需要手动确认作用范围');let html=a.map((_,i)=>arg(i)).join('');if(name==='alt'&&config.beamer[name]==='teacher')html=arg(0);else if(name==='alt'&&config.beamer[name]==='student')html=arg(1);else if(['teacher','student'].includes(config.beamer[name]))return unknown(n,'单分支 overlay 无法推断教师／学生语义，请使用显示或折叠规则');return modeWrap(n,html);}
          if(name==='titlepage')return modeWrap(n,`${config.beamer.title==='hide'?'':`<h2>${esc(titleText(metadata.title||frame.title))}</h2>`}${['author','institute','date'].filter(k=>metadata[k]&&config.beamer[k]!=='hide').map(k=>`<p>${esc(titleText(metadata[k]))}</p>`).join('')}`);
          if(['title','author','date','institute','section','subsection','subsubsection','frametitle','framesubtitle'].includes(name))return modeWrap(n,`<h3>${arg(0)}</h3>`);
          if(name==='href'){const href=a[0]?.value||'';if(!/^(https?:\/\/|mailto:|#)/i.test(href))return unknown(n,'链接协议未允许');return `<a href="${esc(href)}" rel="noopener">${arg(1)}</a>`;}
          if(name==='url'){const href=a[0]?.value||'';return /^(https?:\/\/)/i.test(href)?`<a href="${esc(href)}">${esc(href)}</a>`:unknown(n,'链接协议未允许');}
          if(name==='includegraphics')return inlineAsset(makeImage(n));
          if(name==='xymatrix')return inlineAsset(makeFigure(n,'xypic'));
          if(name==='\\'||name==='newline'||name==='linebreak')return '<br>';
          if(['quad','qquad','enspace',' ',';',',',':'].includes(name))return ' ';
          if(['%','&','_','#','$','{','}'].includes(name))return esc(name);
          if(name==='par')return '<br><br>';
          const texSizes={tiny:'0.7em',scriptsize:'0.78em',footnotesize:'0.85em',small:'0.9em',normalsize:'1em',large:'1.15em',Large:'1.3em',LARGE:'1.5em',huge:'1.8em',Huge:'2.1em'};
          if(texSizes[name])return `<span class="tex-size-${name}">${a.length?arg(0):''}</span>`;
           if(['centering','raggedright','noindent','hfill','vfill','hspace','vspace','medskip','bigskip','smallskip','setlength','setcounter'].includes(name)){return a.filter((_,i)=>!['hspace','vspace'].includes(name)||i>0).map((_,i)=>arg(i)).join('');}
           if(name==='gray')return `<span class="tex-gray">${arg(0)}</span>`;
           if(name==='CJKunderdot')return `<span class="tex-underdot">${arg(0)}</span>`;
          if(name==='label')return `<span class="tex-label" data-tex-label="${esc(a[0]?.value)}"></span>`;
          if(standardMath.has(name))return math(n.raw,n);
          return unknown(n);
        }
        function inlineNodes(nodes){return nodes.map(inline).join('');}
        const create=(type,n,extra={})=>({id:'b'+(++blockCount),type,file:file.name,sourceStart:n.start,sourceEnd:n.end,sourceStartLine:lineAt(source,n.start),sourceEndLine:lineAt(source,Math.max(n.start,n.end-1)),raw:n.raw,...extra});
        function makeFigure(n,kind,raw=n.raw) {
          const id=figureKey(raw),replacement=config.figure.replacements[id];let svg=null,darkSvg=null,error='';
          if(replacement){svg=replacement.svg||null;darkSvg=replacement.darkSvg||null;}
          else if(!config.figure[kind])error='已关闭图形转换；原始代码保留';
          else if(kind==='tikz'&&config.figure.engine==='browser'){try {svg=simpleTikz(raw,config.figure,false);if(config.figure.dark)darkSvg=simpleTikz(raw,config.figure,true);}catch(e){error=e.message;}}
          else error=config.figure.engine==='local'?'等待本地编译；点击“编译待处理图形”':'XY-pic 需要本地编译或上传 SVG';
          if(error)warn(n,error,'在图形面板中执行本地编译、上传 SVG 或指定站内 SVG 路径。');
          return create('figure',n,{figureId:id,kind,raw,svg,darkSvg,error,path:replacement?.path||'',caption:replacement?.caption||`${kind==='tikz'?'TikZ':'XY-pic'} 图形`,width:replacement?.width||config.figure.width});
        }
        function makeImage(n){const path=n.args?.[0]?.value||'',base=path.replace(/\\/g,'/').split('/').pop();const asset=assets[path]||assets[base]||Object.values(assets).find(a=>a.name?.replace(/\.[^.]+$/,'')===base);if(!asset)warn(n,'图片路径不存在或图片未导入','导入此图片，或在内容块编辑器指定站内路径。');return create('image',n,{imagePath:path,asset:asset?{name:asset.name,data:asset.data}:null,caption:base,error:asset?'':'图片未导入'});}
        let blockDepth=0;
        function blocks(nodes) {
          blockDepth++;
          const result=[];let pending=[];
          const flush=()=>{if(!pending.length)return;const first=pending[0],last=pending.at(-1),attachmentStart=inlineAssets.length,html=inlineNodes(pending),attachments=inlineAssets.splice(attachmentStart);if(html.trim())result.push(create('text',{...first,end:last.end,raw:source.slice(first.start,last.end)},{html:`<div class="tex-paragraph">${html.trim()}</div>`,...(attachments.length?{attachments}:{})}));pending=[];};
          for(const n of nodes) {
            if(n.type==='command'&&['pp','pause',config.separator.replace(/^\\/,'')].includes(n.name)) {let policy=n.name==='pp'?config.pp:n.name==='pause'?config.pause:'page';if(policy==='ignore')continue;if(policy==='preserve'){pending.push(n);continue;}if(policy==='page'&&blockDepth>1){warn(n,'分隔线位于嵌套环境内，已保留为知识块边界','将分隔线移到环境外即可安全分页。');policy='block';}flush();result.push(create('boundary',n,{policy}));continue;}
            if(n.type==='text'&&/\n\s*\n/.test(n.value)) {const parts=n.value.split(/(\n\s*\n)/);let offset=n.start;for(const p of parts){if(/^\n\s*\n$/.test(p))flush();else if(p)pending.push({...n,start:offset,end:offset+p.length,raw:p,value:p});offset+=p.length;}continue;}
          if(n.type==='formula'&&(n.display||/\\(?:begin\{tikzpicture\}|xymatrix|xy\b)/.test(n.tex))) {flush();if(/\\(?:begin\{tikzpicture\}|xymatrix|xy\b)/.test(n.tex))result.push(makeFigure(n,/tikzpicture/.test(n.tex)?'tikz':'xypic',n.tex));else result.push(create('formula',n,{tex:n.tex,html:`<div class="tex-display">${math(n.tex,n,true)}</div>`}));continue;}
            if(n.type==='diagram'||(n.type==='command'&&['includegraphics','xymatrix'].includes(n.name))) {flush();result.push(n.name==='includegraphics'?makeImage(n):makeFigure(n,'xypic'));continue;}
            if(n.type!=='environment'){pending.push(n);continue;}flush();const name=n.name;
            if(name==='tikzpicture'||name==='xy'){result.push(makeFigure(n,name==='tikzpicture'?'tikz':'xypic'));continue;}
            if(mathEnvs.has(name)) {if(/\\(?:begin\{tikzpicture\}|xymatrix|xy\b)/.test(n.inner)){result.push(...blocks(nested(n.inner,n.innerStart)));}else {const tex=['equation','equation*','displaymath','math'].includes(name)?n.inner:`\\begin{${name}}${n.inner}\\end{${name}}`;result.push(create('formula',n,{tex,html:`<div class="tex-display">${math(tex,n,true)}</div>`}));}continue;}
            if(Object.hasOwn(config.environments,name)||['block','alertblock','exampleblock'].includes(name)) {
              let title='',p=0;const option=group(n.inner,0,['block','alertblock','exampleblock'].includes(name)?'{':'[',['block','alertblock','exampleblock'].includes(name)?'}':']');if(option){title=titleText(option.value);p=option.end;}
              const environment=config.environments[name]?name:name==='exampleblock'?'example':'remark',style=config.environments[environment];envCounts[environment]=(envCounts[environment]||0)+1;
              const children=blocks(nested(n.inner.slice(p),n.innerStart+p));result.push(create(environment,n,{environment,title,label:style.label,number:`${model.section}.${envCounts[environment]}`,children}));continue;
            }
            if(['itemize','enumerate','description'].includes(name)) {
              const children=nested(n.inner,n.innerStart);const items=[];let curr=[];for(const child of children){if(child.type==='command'&&child.name==='item'){if(curr.length)items.push(curr);curr=[];if(child.optional)curr.push({type:'text',value:child.optional+'：',raw:child.optional,start:child.start,end:child.end});for(const a of child.args)curr.push(...nested(a.value,a.inner));}else curr.push(child);}if(curr.length)items.push(curr);
              const tag=name==='enumerate'?'ol':'ul';result.push(create('list',n,{tag,children:items.filter(list=>list.some(n=>n.type!=='text'||n.value.trim())).map(list=>create('list-item',list[0],{children:blocks(list)}))}));continue;
            }
            if(modes.includes(name)){const children=blocks(nested(n.inner,n.innerStart));if(['hide','delete','preserve'].includes(config.beamer[name]))result.push(create('mode',n,{html:modeWrap(n,children.map(b=>renderBlock(b,config)).join(''))}));else result.push(create('container',n,{mode:config.beamer[name],children}));continue;}
            if(['center','flushleft','flushright','quote','quotation','figure','columns','column','multicols'].includes(name)) {
              let text=n.inner,base=n.innerStart;if(['column','multicols'].includes(name)){const a=group(text,0);if(a){base+=a.end;text=text.slice(a.end);}}else {const a=group(text,0,'[',']');if(a){base+=a.end;text=text.slice(a.end);}}
              let children=nested(text,base);if(name==='columns'){children=children.map(c=>c.type==='command'&&c.name==='column'?{...c,type:'text',value:'\n\n',raw:c.raw}:c);warn(n,'columns 已按原始顺序转为单栏','第一阶段保留阅读顺序；精确多栏布局暂未实现。','info');}
              const childBlocks=blocks(children);if(['columns','column'].includes(name)&&['hide','delete','preserve'].includes(config.beamer[name]))result.push(create('container',n,{html:modeWrap(n,childBlocks.map(b=>renderBlock(b,config)).join(''))}));else result.push(create('container',n,{center:name==='center',mode:config.beamer[name],children:childBlocks}));continue;
            }
            result.push(create('unresolved',n,{html:`<pre class="tex-unresolved">${unknown(n)}</pre>`}));
          }flush();blockDepth--;return result;
        }
        let bs=blocks(frame.nodes);
        if(config.beamer.frame==='hide'||config.beamer.frame==='delete'){model.globalWarnings.push(warning(file.name,source,frame.start,'frame',frame.raw,'用户规则已隐藏整个 frame','将 frame 规则改为显示即可恢复。','info'));continue;}
        if(config.beamer.frame==='preserve')bs=[create('unresolved',{start:frame.start,end:frame.start+(frame.raw||'').length,raw:frame.raw||''},{html:`<pre class="tex-unresolved">${esc(frame.raw)}</pre>`})];
        const title=config.cleanTitle?titleText(frame.title):frame.title,subtitle=config.subtitle==='none'?'':titleText(frame.subtitle||'');
        const record={id:frameId,file:file.name,line:lineAt(source,frame.start),title,sectionTitle:frame.sectionTitle||'',subsectionTitle:frame.subsectionTitle||'',subsectionIndex:frame.subsectionIndex||0,subsubsectionTitle:frame.subsubsectionTitle||'',blocks:clone(bs)};model.frames.push(record);if(frame.nodes.length&&frame.nodes.every(n=>(n.type==='text'&&!n.value.trim())||(n.type==='command'&&n.name==='titlepage')))continue;
        const groups=[[]];for(const b of bs){if(b.type==='boundary'&&b.policy==='page'){if(groups.at(-1).length)groups.push([]);}else if(b.environment===config.splitEnvironment&&groups.at(-1).length){groups.push([b]);}else groups.at(-1).push(b);}
        for(const [part,blocks] of groups.filter(g=>g.length).entries()){const knowledgeKey=frame.subsubsectionTitle?`${file.name}::${frame.sectionTitle||''}::${frame.subsectionTitle||''}::${frame.subsubsectionTitle}`:'';const existing=knowledgeKey&&part===0?model.pages.find(p=>p.knowledgeKey===knowledgeKey):null;if(existing){existing.blocks.push(...blocks);existing.sourceFrames.push(frameId);existing.warnings.push(...clone(warnings));continue;}const index=model.pages.length+Number(config.start),subsectionNo=frame.subsectionIndex||0,pageOrdinal=subsectionNo?model.pages.filter(p=>p.subsectionIndex===subsectionNo).length+1:index,number=subsectionNo?`${config.chapter}.${subsectionNo}.${pageOrdinal}`:`${model.section}.${index}`,pageTitle=frame.subsubsectionTitle||title+(part?' · '+(part+1):'');model.pages.push({id:'p'+frameId+'-'+part,knowledgeKey,number,subsectionIndex:subsectionNo,slug:config.slugMode==='chinese'?safeName(pageTitle):`lesson-${number.replace(/\./g,'-')}`,title:pageTitle,subtitle,sectionTitle:frame.sectionTitle||'',subsectionTitle:frame.subsectionTitle||'',knowledgeTitle:frame.subsubsectionTitle||title,description:config.description==='title'?pageTitle:'',sourceFrames:[frameId],blocks,figures:[],warnings:clone(warnings),rules:{}});}
      }
    }
    model.log.push(`读取 ${files.length} 个 TeX、${styleFiles.length} 个样式文件`,`识别 ${Object.keys(macros).length} 个自定义命令、${model.frames.length} 个 frame`,`生成 ${model.pages.length} 个正文片段`);
    model.registry.macros=macros;refresh(model);return model;
  }
  function walkBlocks(blocks,callback){for(const b of blocks){callback(b);if(b.children)walkBlocks(b.children,callback);if(b.attachments)walkBlocks(b.attachments,callback);}}
  function renderBlock(b,config) {
    if(b.deleted)return '';
    if(b.type==='boundary')return '';
    if(b.children&&!b.environment){const body=renderBlocks(b.children,config);if(b.type==='list')return `<${b.tag==='ol'?'ol':'ul'}>${body}</${b.tag==='ol'?'ol':'ul'}>`;if(b.type==='list-item')return `<li>${body}</li>`;if(b.mode==='collapse')return `<details><summary>显示补充内容</summary>${body}</details>`;return `<div class="tex-container${b.center?' tex-center':''}${b.mode==='supplement'?' tex-supplement':''}">${body}</div>`;}
    if(b.type==='figure') {
      const opts=config.figure,directory=String(opts.directory).split('/').map(safeName).join('/'),stem=safeName(opts.prefix)+'-'+b.figureId;
      const light=b.svg&&opts.light!==false,dark=b.darkSvg&&opts.dark!==false,path=b.path||((light||dark)?`{{root}}${directory}/${stem}${!light&&dark?'-dark':''}.svg`:'');
      const image=path?`<img src="${esc(path)}"${dark&&light?` class="tex-figure-light"`:''} alt="${esc(b.caption)}" width="${num(b.width,80,3000,640)}">${dark&&light?`<img class="tex-figure-dark" src="{{root}}${directory}/${stem}-dark.svg" alt="${esc(b.caption)}" width="${num(b.width,80,3000,640)}">`:''}`:`<div class="tex-figure-placeholder"><strong>${esc(b.kind)} 图形待处理</strong><p>${esc(b.error||'未提供 SVG')}</p><details><summary>原始图形代码</summary><pre>${esc(b.raw)}</pre></details></div>`;
      return `<figure class="tex-figure">${image}${opts.caption?`<figcaption>${esc(b.caption)}</figcaption>`:''}</figure>`;
    }
    if(b.type==='image'){const path=b.asset?`{{root}}assets/imported/${safeAssetName(b.asset.name)}`:b.path;return `<figure class="tex-image">${path?`<img src="${esc(path)}" alt="${esc(b.caption)}">`:`<div class="tex-figure-placeholder">图片未导入：<code>${esc(b.imagePath)}</code></div>`}${config.image.caption?`<figcaption>${esc(b.caption)}</figcaption>`:''}</figure>`;}
    if(b.environment){const style=config.environments[b.environment]||config.environments.theorem,collapsed=b.collapsed??style.collapsed;const heading=`${style.icon?'◆ ':''}<span class="math-block-label">${esc(style.label)}</span>${style.numbered?` <span class="math-block-number">${esc(b.number)}</span>`:''}${b.title?` <span class="math-block-title">${esc(b.title)}</span>`:''}`;const body=renderBlocks(b.children||[],config),cls=`math-block math-block-${safeName(b.environment)}`;
      if(collapsed||b.environment==='proof')return `<details class="${cls}${b.environment==='proof'?' lecture-proof':''}"${!collapsed?' open':''}><summary class="math-block-heading">${heading}</summary><div class="math-block-body">${body}</div></details>`;
      return `<section class="${cls}"><div class="math-block-heading">${heading}</div><div class="math-block-body">${body}</div></section>`;
    }
    let html=b.html||'';for(const item of b.attachments||[])html=html.replace(`<!--tex2html-slot:${item.id}-->`,renderBlock(item,config));return html;
  }
  function renderBlocks(blocks,config){let html='',pending='',policy=blocks.some(b=>b.type==='boundary'&&b.policy==='block')?'block':null;const flush=()=>{if(pending){html+=policy==='collapse'?`<details class="lesson-step"><summary>显示补充内容</summary>${pending}</details>`:policy==='block'?`<div class="lesson-step">${pending}</div>`:pending;pending='';}};for(const b of blocks){if(b.type==='boundary'){flush();policy=b.policy;}else pending+=renderBlock(b,config);}flush();return html;}
  function pageCSS(config,scope='.tex-converted') {
    const formatCSS=source=>{let out='',depth=0,quote='';for(const ch of source){if(quote){out+=ch;if(ch===quote)quote='';continue;}if(ch==='"'||ch==="'"){quote=ch;out+=ch;continue;}if(ch==='{'){out=out.trimEnd()+' {\n'+'  '.repeat(++depth);continue;}if(ch==='}'){out=out.trimEnd()+'\n'+'  '.repeat(Math.max(0,--depth))+'}\n'+'  '.repeat(depth);continue;}if(ch===';'){out=out.trimEnd()+';\n'+'  '.repeat(depth);continue;}out+=ch;}return out.replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();};
    const base=`${scope}{line-height:1.8;overflow-wrap:anywhere}${scope} .tex-paragraph{margin:.8em 0;white-space:pre-line}${scope} .tex-display{overflow-x:auto;margin:1em 0}${scope} .tex-unresolved{white-space:pre-wrap;overflow-wrap:anywhere;background:#fff1ce;color:#7c3400;padding:3px 6px;border-radius:4px}${scope} .tex-math-warning{color:#b45309}${scope} .tex-framebox{display:inline-block;box-sizing:border-box;border:1px solid currentColor;padding:.25em .5em;vertical-align:middle;min-width:2em;text-align:center}${scope} .tex-size-tiny{font-size:.7em}${scope} .tex-size-scriptsize{font-size:.78em}${scope} .tex-size-footnotesize{font-size:.85em}${scope} .tex-size-small{font-size:.9em}${scope} .tex-size-normalsize{font-size:1em}${scope} .tex-size-large{font-size:1.15em}${scope} .tex-size-Large{font-size:1.3em}${scope} .tex-size-LARGE{font-size:1.5em}${scope} .tex-size-huge{font-size:1.8em}${scope} .tex-size-Huge{font-size:2.1em}${scope} .math-block{margin:1.1em 0;border-left:4px solid}${scope} .math-block-heading{font-weight:700;cursor:pointer}${scope} .math-block-body>:last-child{margin-bottom:0}${scope} .tex-figure,${scope} .tex-image{margin:1em 0;text-align:center;${config.figure.scroll?'overflow-x:auto;':''}}${scope} img{height:${config.figure.aspect?'auto':'300px'};max-width:${num(config.figure.maxWidth,10,200,100)}%}${scope} .tex-image img{max-width:${num(config.image.maxWidth,10,100,100)}%}${scope} .tex-figure-dark{display:none}${scope} .tex-center{text-align:center}${scope} .tex-figure-placeholder{border:1px dashed #a5adbd;padding:18px;text-align:left}${scope} pre{white-space:pre-wrap;overflow-wrap:anywhere}${scope} .lesson-step{border-top:1px solid #a5adbd55;margin-top:16px;padding-top:12px}${scope} .tex-footnote{display:inline;color:inherit}${scope} .tex-footnote:before{content:'〔'}${scope} .tex-footnote:after{content:'〕'}`;
    const rules=[`/* Base layout, text, formulas, images and inline TeX sizes */\n${formatCSS(base)}`];
    rules.push(`/* Inline layout helpers */\n${formatCSS(`${scope} .tex-makebox{display:inline-block;vertical-align:middle}${scope} .tex-gray{color:#6b7280}${scope} .tex-underdot{text-decoration:underline dotted;text-underline-offset:0.2em}`)}`);
    const dark=`:is([data-theme="dark"],.dark) ${scope}`;
    rules.push(`/* Dark mode overrides */\n${formatCSS(`${dark} .tex-figure-light{display:none}${dark} .tex-figure-dark{display:inline}${dark} .tex-unresolved{background:#503414;color:#fde68a}`)}`);
    for(const [name,e] of Object.entries(config.environments)){const selector=`${scope} .math-block-${safeName(name)}`,source=`${selector}{color:${color(e.light)};background:${color(e.background,'#eff6ff')};border-color:${color(e.border)};padding:${num(e.padding,0,60,16)}px;border-radius:${num(e.radius,0,40,10)}px;font-size:${num(e.bodySize,10,32,16)}px}${selector} .math-block-heading{font-size:${num(e.headingSize,12,36,17)}px}${dark} .math-block-${safeName(name)}{color:${color(e.dark)};background:${color(e.darkBackground)};border-color:${color(e.darkBorder)}}@media print{${selector}{${e.printBackground?'print-color-adjust:exact':'background:transparent!important;color:#111!important'}}}`;rules.push(`/* Math environment: ${name} */\n${formatCSS(source)}`);}
    for(const [name,c] of Object.entries(config.colors)){if(c.mode==='color')rules.push(`/* TeX color command: ${name} */\n${formatCSS(`${scope} .tex-color-${safeName(name)}{color:${color(c.light)}}${dark} .tex-color-${safeName(name)}{color:${color(c.dark)}}`)}`);}
    return rules.join('\n\n');
  }
  function pageConfig(model,page){return mergeConfig({...model.config,...page.rules});}
  function pageScope(page){return 'tex-page-'+safeName(page.number)+'-'+safeName(page.slug);}
  function compactHTML(html){return String(html||'').replace(/<!--[^]*?-->/g,'').replace(/>\s+</g,'><').trim();}
  function renderPage(page,config) {
    const scope=pageScope(page),number=config.bodyNumber?`${config.sectionSign?'§':''}${page.number} `:'',hierarchy=[page.sectionTitle,page.subsectionTitle].filter(Boolean).join(' / '),hierarchyHtml=hierarchy?`<p class="tex-hierarchy">${esc(hierarchy)}</p>`:'';
    const heading=config.bodyTitle?`<h2>${esc(number+page.title)}</h2>`:config.bodyNumber?`<p class="tex-page-number">${esc(number)}</p>`:'';
    return compactHTML(`<link rel="stylesheet" href="/assets/tex2html.css">\n<div class="tex-converted ${scope}">\n${hierarchyHtml}${heading}${page.subtitle?`<p class="tex-subtitle">${esc(page.subtitle)}</p>`:''}${renderBlocks(page.blocks,config)}\n</div>`);
  }
  function refresh(model) {const used=new Set();for(const page of model.pages){const base=safeName(page.slug);let slug=base,n=2;while(used.has(slug))slug=base+'-'+n++;used.add(slug);page.slug=slug;page.figures=[];walkBlocks(page.blocks,b=>{if(b.type==='figure')page.figures.push(b);});page.html=renderPage(page,pageConfig(model,page));}return model;}
  const safeAssetName = name => {const pos=name.lastIndexOf('.');return pos<0?safeName(name):safeName(name.slice(0,pos))+'.'+name.slice(pos+1).replace(/[^a-z0-9]/gi,'').toLowerCase();};
  function exportFiles(model) {
    refresh(model);const entries=[],config=model.config,chapter='chapter'+String(num(config.chapter,1,99,1)).padStart(2,'0'),section='section'+String(num(config.section,1,99,1)).padStart(2,'0'),seen=new Set();
    const add=(path,text,data)=>{if(!seen.has(path)){entries.push({path,text,data});seen.add(path);}};
    const manifest={version:1,chapter,section,number:model.section,pages:[]};
    add('assets/tex2html.css',model.cssText||pageCSS(config,'.tex-converted'));
    for(const page of model.pages){const path=`content/${chapter}/${section}/${page.slug}.html`;add(path,page.html);manifest.pages.push({number:page.number,slug:page.slug,title:page.title,htmlTitle:config.htmlTitleNumber?page.number+' '+page.title:page.title,description:page.description,subtitle:page.subtitle,sourceFrames:page.sourceFrames,path});walkBlocks(page.blocks,b=>{if(b.type==='figure'){const c=pageConfig(model,page).figure,dir=c.directory.split('/').map(safeName).join('/'),stem=safeName(c.prefix)+'-'+b.figureId;if(b.svg&&c.light!==false)add(`${dir}/${stem}.svg`,b.svg);if(b.darkSvg&&c.dark!==false)add(`${dir}/${stem}-dark.svg`,b.darkSvg);if(!b.svg&&!b.path)add(`${dir}/${stem}.tex`,b.raw);}if(b.type==='image'&&b.asset)add('assets/imported/'+safeAssetName(b.asset.name),null,b.asset.data);});}
    add('manifest.json',JSON.stringify(manifest,null,2));add('course-pages.json',JSON.stringify(manifest.pages.map(p=>({slug:p.slug,title:p.title,description:p.description})),null,2));add('conversion-report.json',JSON.stringify({globalWarnings:model.globalWarnings,pages:model.pages.map(p=>({slug:p.slug,warnings:p.warnings})),log:model.log},null,2));add('conversion-config.json',JSON.stringify(model.config,null,2));return entries;
  }
  function usages(files,name){const matches=[];for(const file of files){const s=uncomment(file.text);const re=new RegExp('\\\\'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![A-Za-z@])','g');for(const m of s.matchAll(re))matches.push({file:file.name,line:lineAt(file.text,m.index),offset:m.index});}return matches;}
  return {defaults,mergeConfig,parseStyles,parse,convert,expand,uncomment,group,esc,safeName,safeAssetName,renderBlock,renderPage,pageCSS,pageConfig,pageScope,refresh,exportFiles,walkBlocks,usages,simpleTikz,figureKey,clone,labels};
});
