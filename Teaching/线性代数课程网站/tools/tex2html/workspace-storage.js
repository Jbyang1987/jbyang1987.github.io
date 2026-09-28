/* Large workspaces use IndexedDB; legacy localStorage is read only. */
(function(root){
  function createWorkspaceStorage(indexedDB,legacy){
    let database,queue=Promise.resolve();
    function open(){
      if(!database)database=new Promise((resolve,reject)=>{
        if(!indexedDB){reject(new Error('浏览器不支持工作区数据库'));return;}
        const request=indexedDB.open('tex2html-workspace',1);
        request.onupgradeneeded=()=>request.result.createObjectStore('workspaces');
        request.onsuccess=()=>resolve(request.result);
        request.onerror=()=>reject(request.error);
        request.onblocked=()=>reject(new Error('工作区数据库被其他页面占用'));
      });
      return database;
    }
    async function transact(mode,value){
      const db=await open();
      return new Promise((resolve,reject)=>{
        const tx=db.transaction('workspaces',mode),store=tx.objectStore('workspaces');
        const request=mode==='readonly'?store.get('current'):store.put(value,'current');
        tx.oncomplete=()=>resolve(request.result);
        tx.onabort=()=>reject(tx.error||new Error('工作区保存已中止'));
        tx.onerror=()=>reject(tx.error||request.error||new Error('工作区数据库操作失败'));
      });
    }
    return {
      async load(){const saved=await transact('readonly');if(saved)return saved;const old=legacy?.getItem('tex2html-workspace-v1');return old?JSON.parse(old):null;},
      save(value){
        // Snapshot before queuing so later edits cannot change an earlier save.
        const snapshot=JSON.parse(JSON.stringify(value));
        const result=queue.catch(()=>{}).then(()=>transact('readwrite',snapshot));
        queue=result;return result;
      }
    };
  }
  if(typeof module==='object'&&module.exports)module.exports={createWorkspaceStorage};
  else root.createWorkspaceStorage=createWorkspaceStorage;
})(typeof globalThis==='undefined'?this:globalThis);
