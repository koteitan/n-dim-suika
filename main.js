// nostr-------------------
var isRelayLoaded = false;
// fields--------------------
var gW; /* world coordinate */
//entry point--------------------
var printstatus=function(str){
  document.getElementById("debug").innerHTML=str;
}
var npubEncode = window.NostrTools.nip19.npubEncode;
window.onload = async function(){
  initHtml();

  printstatus("initialize nostr...");
  await initNostr();

  printstatus("initialize t-SNE...");
  await new Promise(resolve=>{setTimeout(()=>{
    initTsne();
    resolve();
  },0);});

  initDraw();
  initEvent(can);
  window.onresize(); //after loading maps
  setInterval(procAll, 0); //enter gameloop
}
//tsne-------------------
var A;
var color=[
  [255,0,0],
  [0,255,0],
  [0,0,255],
  [0,255,255],
  [255,0,255],
  [255,255,0],
  [0,127,255],
  [127,255,0],
  [255,0,127],
  [0,255,127],
];
var isTsneInit = false;
var tsne;
var initTsne=async function(){
  var scale=5;
  gW = new Geom(2,[[-scale,-scale],[scale,scale]]);
  var N;
  var D;
  if(true){
    N = nuser;
    A = digits.target.slice(0,N-1); //use scikit
    D = distance;
  }
  if(false){
    N = digits.data.length;
    A=digits.target.slice(0,N-1); //use scikit
    D = TSNE.data2distances(digits.data.slice(0,N-1)); //use scikit
  }
  tsne=new TSNE(D, 2);
  isTsneInit = true;

  //performance counter
  elapsehist=new Array(10);
  for(var i=0;i<elapsehist.length;i++){
    elapsehist[i]=frameInterval;
  }
};
var movfilter;
var procTsne=function(){
  var t0=(new Date).getTime()/1000;
  tsne.step();
  var t1=(new Date).getTime()/1000;
  var dt = t1-t0;
  elapsehist.shift();
  elapsehist.push(dt);
  var mean=elapsehist.mean();
  frameInterval = [mean/targetLoad, frameIntervalMin].max();
  document.getElementById("debug").innerHTML=
    "this frame: "+Math.floor(dt  *1000)+" [ms] "+
    "/average   : "+Math.floor(mean*1000)+" [ms] "+
    "/frame rate: "+Math.floor(1/frameInterval*100)/100+ " [fps]";
  isRequestedDraw = true;
}
//game loop ------------------
var procAll=function(){
  procEvent();
  procTsne();
  if(isRequestedDraw){
    procDraw();
    isRequestedDraw = false;
  }
}
var initHtml=function(){
  //debug = document.getElementById('debug');
  if(navigator.language=='ja'){
  }
}

// html ----------------------------
var debug;
window.onresize = function(){ //browser resize
  var wx,wy;
  var agent = navigator.userAgent;
  var wx= [(document.documentElement.clientWidth - 20)*0.98, 320].max();
  var wy= [(document.documentElement.clientHeight-250)     ,  20].max();
  document.getElementById("outcanvas").width = wx;
  document.getElementById("outcanvas").height= wy;
  renewgS();
  isRequestedDraw = true;
};
// graphics ------------------------
var ctx;
var can;
var gS;
var fontsize = 15;
var radius = 15;
var isRequestedDraw = true;
var isSheetLoaded = false;
var frameInterval    = 0.5;  //[sec]
var frameIntervalMin = 0.25; //[sec]
var targetLoad = 0.8; //1.0=100%
//init
var initDraw=function(){
  can = document.getElementById("outcanvas");
  ctx = can.getContext('2d');
  renewgS();
}
var renewgS=function(){
  var minwidth = [can.height, can.width].min();
  var s=[[0,minwidth],[minwidth,0]];
  gS = new Geom(2,s);
}
//proc
var procDraw = function(){

  //background
  ctx.fillStyle="white";
  ctx.fillRect(0,0,can.width, can.height);

  //grid line -----------------------
  //get screen in world coordinate
  var scr = [transPos([0,can.height], gS, gW), transPos([can.width,0], gS, gW)];
  var base=8;
  var L=Math.log10(scr[1][0]-scr[0][0])/Math.log10(base);
  var intL=Math.floor(L);
  var fracL=L-intL;
  var intL =Math.pow(base,intL);
  var fracL=Math.pow(base,fracL)/base;
  var depths = 3;
  //debug.innerHTML = "intL="+intL+"\n";
  //debug.innerHTML += "fracL="+fracL+"\n";
  for(var depth=depths-1;depth>=0;depth--){
    var qw = intL/Math.pow(base,depth);
    var c = Math.floor(((depth+fracL)/depths)*64+64+127);
    //debug.innerHTML += "c("+depth+") = "+c+"\n";
    ctx.lineWidth=1;
    ctx.strokeStyle='rgb('+c+','+c+','+c+')';
    for(var d=0;d<gW.dims;d++){
      var q0 = Math.floor((scr[0][d])/qw)*qw;
      var q1 = Math.ceil ((scr[1][d])/qw)*qw;

      for(var q=q0;q<q1;q+=qw){
        var wq = scr.clone();
        wq[0][d]=q;
        wq[1][d]=q;
        var sq = [transPosInt(wq[0],gW,gS), transPosInt(wq[1],gW,gS)];
        ctx.beginPath();
        ctx.moveTo(sq[0][0],sq[0][1]);
        ctx.lineTo(sq[1][0],sq[1][1]);
        ctx.stroke();
      }//q
    }//depth
  }//d

  if(isTsneInit){
    //Y nodes
    N=tsne.N;
    sY=new Array(N);
    for(var n=0;n<N;n++){
      sY[n]=transPosInt(tsne.Y[n],gW,gS);
    }
    ctx.lineWidth=0;
    if(A===undefined){
      for(var n=0;n<N;n++){
        ctx.fillStyle='rgb('+color[A[n]][0]+','+color[A[n]][1]+','+color[A[n]][2]+')';
        ctx.beginPath();
        ctx.arc(sY[n][0], sY[n][1], 2, 0, 2*Math.PI);
        ctx.fill();
      }
    }else{
      ctx.fillStyle='blue';
      for(var n=0;n<N;n++){
        ctx.beginPath();
        ctx.arc(sY[n][0], sY[n][1], 2, 0, 2*Math.PI);
        ctx.fill();
      }
    }
  }
}
//event---------------------
var downpos=[-1,-1];// start of drag
var movpos =[-1,-1];// while drag
var handleMouseDown = function(){
  downpos = transPos(mouseDownPos,gS,gW);
  movpos[0] = downpos[0];
  movpos[1] = downpos[1];
}
var handleMouseDragging = function(){
  movpos = transPos(mousePos,gS,gW);
  for(var i=0;i<2;i++){
    for(var d=0;d<2;d++){
      gW.w[i][d] -= movpos[d]-downpos[d];
    }
  }
  isRequestedDraw = true;
}
var handleMouseUp = function(){
  isRequestedDraw = true;
}
var handleMouseWheel = function(){
  var pos=transPos(mousePos,gS,gW);
  var oldw=gW.w.clone();
  for(var i=0;i<2;i++){
    for(var d=0;d<2;d++){
      gW.w[i][d] = (oldw[i][d]-pos[d])*Math.pow(1.1, -mouseWheel[1]/200)+pos[d];
    }
  }
  gW.recalc();
  isRequestedDraw = true;
}
//nostr------------------
var relayurl="wss://yabu.me";
var relay;
var maxuser = 10000;
var nuser   = 0;
var maxdepth = 5;
var pubkeylist; // pubkeylist[u] = hex pubkey of u-th user.
var fflist;     // fflist[a][i]  = b: B is i-th FF of A.
                // a = A's index u in pubkeylist[u]
                // b = A's index u in pubkeylist[u]
                // "A and B are FF" means A follows B or B follows A.
                // "A is a FF of B" means A follows B or B follows A.
var nfollowlist;// nfollowlist[u] = number of followers of i-th person
var path;       // path[a, b]     = strengh of connection between A and B.
var distance;   // distance[a, b] = distance of A and B. inverse of path.
var friendhist; // friendhist[n]  = number of accounts which has n friends.
var initNostr = async function(){
  //connect to relay
  relay = window.NostrTools.relayInit(relayurl);
  relay.on("error",()=>{console.log("error:relay.on for the relay "+relayurl);});
  await relay.connect();

  //relayurl -> fflist[], pubkeylist[], nfollowlist[]
  var filter = [{"kinds":[3],"limit":100}];
  sub = relay.sub(filter);
  pubkeylist = [];
  nfollowlist = [];
  fflist = [];
  printstatus("initializing nostr...analysing "+pubkeylist.length+" followers in the relay...");
  await (async ()=>{
    return new Promise((resolve)=>{
      setTimeout(()=>resolve(), 5000); //timeout
      sub.on("event",(ev)=>{
        console.log(ev);
        console.log("a: "+npubEncode(ev.pubkey));
        var a = pubkeylist.number(ev.pubkey);
        if(a>=fflist.length) fflist.push([]);
        var nb = ev.tags.length;
        nfollowlist[a] = nb; // store to nfollowlist[a]
        for(var ib=0;ib<nb;ib++){
          console.log("a["+a+"]  b: "+npubEncode(ev.tags[ib][1]));
          var b = pubkeylist.number(ev.tags[ib][1]);
          if(b>=fflist.length) fflist.push([]);
          fflist[a].push(b);
          fflist[b].push(a);
        }//for ib
        printstatus("initializing nostr...analysing "+fflist.length+" followers in the relay...");
        if(fflist.length >= maxuser){
          resolve();
        }
      });//sub.on("event",(ev)=>{
      sub.on("eose",()=>{
        resolve();
      });
    });//Promise(()=>{
  })();//await(async()=>{
  sub.unsub();
  nuser = pubkeylist.length;

  //fflist[] -> path[a,b], distance[a,b]
  //initialize
  var N = nuser;
  maxdepth = 5;
  path     = new Array(N);
  distance = new Array(N);
  for(var a=0;a<N;a++){
    distance[a] = new Array(N);
    for(var b=0;b<N;b++){
      distance[a][b]=1e+20;
    }
  }
  //make
  friendhist=new Array(10000);
  for(var i=0;i<friendhist.length;i++){
    friendhist[i]=0;
  }
  for(var a=0;a<N;a++){
    var n=fflist[a].length;
    if(n<friendhist.length){
      friendhist[n]++;
    }else{
      friendhist[friendhist.length-1]++;
    }
  }

  fflist2distance();
  /*
  for(var a=0;a<N;a++){
    var nb = fflist[a].length;
    for(var ib=0;ib<nb;ib++){
      distance[a][fflist[a][ib]]=1;
    }
  }
  */
}

var fflist2distance =function(){
  const N=nuser;
  //propagation from a
  for(var a=0;a<N;a++){
    /* state[i]==
        0:not yet
        1:pivots
        2:finished */
    var state = new Array(N);
    for(var i=0;i<N;i++)state[i]=0;
    state[a]=1;

    for(var d=0;d<maxdepth;d++){
      //propagate state[a1]=1;
      for(var a1=0;a1<N;a1++){
        if(state[a1]==1){
          //found
          var nb = fflist[a1].length;
          for(var ib=0;ib<nb;ib++){
            var b=fflist[a1][ib];
            distance[a1][b] += 1/nb;
            if(state[b]==0){
              state[b]=1;
            }
          }
          state[a1]=2;
        }//if(state[a1]==1)
      }//for a1
    }//for d
  }
  for(var a=0;a<N;a++){
    for(var b=0;b<N;b++){
      if(a!=b){
        distance[a][b] = 1/distance[a][b];
      }else{
        distance[a][b] = 0;
      }
    }
  }
}
