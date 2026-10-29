const http=require('http'),fs=require('fs'),path=require('path');
const PORT=process.env.PORT||3000;
const S=new Map();
const ok=c=>/^[A-Za-z0-9]{4,12}$/.test(c);
function sess(c){if(!S.has(c))S.set(c,{data:null,cl:new Set(),t:Date.now()});return S.get(c)}
function file(res,f){
  fs.readFile(path.join(__dirname,f),(e,b)=>{
    if(e){res.writeHead(500);return res.end('error')}
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(b);
  });
}
http.createServer((req,res)=>{
  const u=req.url.split('?')[0],m=u.split('/');
  if(u==='/')return file(res,'dashboard.html');
  if(m[1]==='p'&&ok(m[2]||''))return file(res,'tester.html');
  if(m[1]==='events'&&ok(m[2]||'')){
    const s=sess(m[2]);
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache',Connection:'keep-alive'});
    res.write('retry: 2000\n\n');
    if(s.data)res.write('data: '+JSON.stringify(s.data)+'\n\n');
    s.cl.add(res);
    const ping=setInterval(()=>res.write(': ping\n\n'),20000);
    req.on('close',()=>{clearInterval(ping);s.cl.delete(res)});
    return;
  }
  if(m[1]==='api'&&ok(m[2]||'')&&req.method==='POST'){
    let body='';
    req.on('data',d=>{body+=d;if(body.length>100000)req.destroy()});
    req.on('end',()=>{
      try{
        const s=sess(m[2]);s.data=JSON.parse(body);s.data.at=Date.now();s.t=Date.now();
        const msg='data: '+JSON.stringify(s.data)+'\n\n';
        s.cl.forEach(c=>c.write(msg));
        res.writeHead(200);res.end('ok');
      }catch(e){res.writeHead(400);res.end('bad')}
    });
    return;
  }
  res.writeHead(404);res.end('not found');
}).listen(PORT,()=>console.log('Phone Lab running on port '+PORT));
setInterval(()=>{const now=Date.now();S.forEach((s,k)=>{if(now-s.t>12*3600e3&&!s.cl.size)S.delete(k)})},3600e3);
