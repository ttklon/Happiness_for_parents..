/* Route 58: built on Phaser 3.90 (Arcade Physics, tweens, Scenes, keyboard/touch input). */
(() => {
  'use strict';
  const W=960,H=540,STORY_CHAPTERS=8,STOPS=10,ENDLESS_STOPS=12,SAVE_KEY='route58-phaser-v3';
  const scenes={menu:'menu',driver:'driver',follow:'follow',cabin:'cabinDrive',stop:'cabin'};
  const allEvents=window.ROUTE58_EVENTS||[];
  let language='ru',ysdk=null,player=null,game=null,activeScene='MenuScene',pauseSource=null;
  const run={chapter:1,unlocked:1,best:0,bank:0,trust:50,tension:20,safety:85,respect:0,mode:'story',stopIndex:0,totalStops:STOPS,shiftScore:0,shiftTickets:0,shiftRespect:0,routeActive:false,storyDone:false,started:false,usedEvents:[],rng:1,routeName:0,history:[],relationships:{nina:0,arman:0,dispatcher:0},view:0,sound:true};

  const ui={
    ru:{title:'МАРШРУТ 58',subtitle:'ГЕЛОДИ НА ЛИНИИ',tagline:'Городская история о выборе, ответственности и людях в салоне.',start:'ПРОДОЛЖИТЬ ИСТОРИЮ',new:'НАЧАТЬ СНАЧАЛА',endless:'ДОЛГИЙ СЛУЧАЙНЫЙ РЕЙС',chapter:'ГЛАВА',stop:'ОСТАНОВКА',score:'ОЧКИ',tickets:'БИЛЕТЫ',trust:'ДОВЕРИЕ',tension:'НАПРЯЖЕНИЕ',safety:'БЕЗОПАСНОСТЬ',views:['ВИД ВОДИТЕЛЯ','СЛЕДЯЩАЯ КАМЕРА','САЛОН'],view:'КАМЕРА  ·  V',pause:'ПАУЗА',resume:'ПРОДОЛЖИТЬ',menu:'В МЕНЮ',controls:'A / D или ← / → — полоса   ·   V — ракурс   ·   P — пауза',mobile:'Пробел / F — убрать телефон   ·   На телефоне — кнопки ◀ ▶',phone:'УВЕДОМЛЕНИЕ — НЕ ОТВЛЕКАЙСЯ',phoneKey:'ПРОБЕЛ / F — убрать до остановки',boarding:'ПАССАЖИР ЗАХОДИТ',listen:'НАЖМИ ENTER ИЛИ КОСНИСЬ, ЧТОБЫ ВЫСЛУШАТЬ',talk:'РАЗГОВОР НА ОСТАНОВКЕ',choice:'ВЫБЕРИ ОТВЕТ',reply:'ПОСЛЕ ТВОИХ СЛОВ',continue:'ДАЛЬШЕ',shiftDone:'СМЕНА ЗАВЕРШЕНА',record:'НОВЫЙ РЕКОРД',next:'СЛЕДУЮЩАЯ ГЛАВА',replay:'ЕЩЁ ОДИН РЕЙС',seasonDone:'СЕЗОН ЗАВЕРШЁН',goodEnd:'На планёрке пассажиры и водитель смогли договорить. Диспетчер меняет правила связи: только на остановке.',midEnd:'День закончился без драки, но недосказанность осталась. Завтра будет ещё один шанс выслушать друг друга.',lowEnd:'Диспетчер назначает встречу: сначала безопасность, затем спокойные объяснения.',endlessEnd:'Длинный рейс завершён. Новый маршрут соберёт другие ситуации.',sound:'ЗВУК',on:'ВКЛ',off:'ВЫКЛ',loading:'ЗАГРУЗКА МАРШРУТА…',chapterNames:['Первый рейс: сообщение на панели','Маршрут, которого нет на карте','Обрывок записи','Последний автобус для школьника','Тихий стук у заднего колеса','Дождь и длинная очередь','Разговор без камеры','Город слушает'],badge:'УВАЖЕНИЕ',pauseTitle:'КОРОТКАЯ ПАУЗА',pauseTip:'На ходу телефон остаётся в стороне.',menuTitle:'ВЫЙТИ В МЕНЮ',credits:'Пиксельная история. Сцены и пассажиры вымышлены.'},
    en:{title:'ROUTE 58',subtitle:'GELODI ON THE LINE',tagline:'A city story about choices, responsibility, and the people on board.',start:'CONTINUE STORY',new:'START OVER',endless:'LONG RANDOM ROUTE',chapter:'CHAPTER',stop:'STOP',score:'SCORE',tickets:'TICKETS',trust:'TRUST',tension:'TENSION',safety:'SAFETY',views:['DRIVER VIEW','FOLLOW CAMERA','CABIN'],view:'CAMERA  ·  V',pause:'PAUSE',resume:'RESUME',menu:'TO MENU',controls:'A / D or ← / →: lane   ·   V: view   ·   P: pause',mobile:'SPACE / F: dismiss phone   ·   Tap ◀ ▶ on mobile',phone:'MESSAGE — KEEP YOUR EYES ON THE ROAD',phoneKey:'SPACE / F — dismiss until the stop',boarding:'PASSENGER BOARDING',listen:'PRESS ENTER OR TAP TO HEAR THEM OUT',talk:'A TALK AT THE STOP',choice:'CHOOSE A RESPONSE',reply:'AFTER YOUR WORDS',continue:'CONTINUE',shiftDone:'SHIFT COMPLETE',record:'NEW RECORD',next:'NEXT CHAPTER',replay:'ANOTHER RIDE',seasonDone:'SEASON COMPLETE',goodEnd:'At the briefing, passengers and driver manage to talk. Dispatch changes the rule: messages only at stops.',midEnd:'The day ends without violence, but things remain unsaid. Tomorrow is another chance to listen.',lowEnd:'Dispatch schedules a meeting: safety first, calm explanations next.',endlessEnd:'The long route is done. A new run will shuffle the encounters.',sound:'SOUND',on:'ON',off:'OFF',loading:'LOADING ROUTE…',chapterNames:['First route: a message on the dash','A route missing from the map','A clip without context','The last bus for a student','A faint knock by the rear wheel','Rain and a long queue','A talk without a camera','The city listens'],badge:'RESPECT',pauseTitle:'QUICK BREAK',pauseTip:'Keep the phone aside while the bus is moving.',menuTitle:'TO MAIN MENU',credits:'Pixel story. Characters and scenes are fictional.'}
  };
  const T=()=>ui[language]||ui.ru;
  const word=(pair)=>Array.isArray(pair)?pair[language==='en'?1:0]:String(pair||'');
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const colorInt=(h)=>parseInt(String(h).replace('#',''),16);
  const seeded=()=>{run.rng=(Math.imul(run.rng,1664525)+1013904223)>>>0;return run.rng/4294967296;};
  const eventById=id=>allEvents.find(e=>e.id===id);

  function save(){
    const d={chapter:run.chapter,unlocked:run.unlocked,best:run.best,bank:run.bank,trust:run.trust,tension:run.tension,safety:run.safety,respect:run.respect,mode:run.mode,stopIndex:run.stopIndex,totalStops:run.totalStops,shiftScore:run.shiftScore,shiftTickets:run.shiftTickets,shiftRespect:run.shiftRespect,routeActive:run.routeActive,storyDone:run.storyDone,started:run.started,usedEvents:run.usedEvents,rng:run.rng,routeName:run.routeName,history:run.history.slice(-24),relationships:run.relationships,view:run.view,sound:run.sound};
    try{localStorage.setItem(SAVE_KEY,JSON.stringify(d));}catch(_){}
    if(player?.setData){try{player.setData({route58:d},true).catch(()=>{});}catch(_){}}
  }
  function applySave(d){if(!d||typeof d!=='object')return;for(const k of ['chapter','unlocked','best','bank','trust','tension','safety','respect','stopIndex','shiftScore','shiftTickets','shiftRespect','routeName','view'])if(Number.isFinite(+d[k]))run[k]=+d[k];run.chapter=clamp(run.chapter||1,1,STORY_CHAPTERS);run.unlocked=clamp(run.unlocked||1,1,STORY_CHAPTERS);run.mode=d.mode==='endless'?'endless':'story';run.totalStops=run.mode==='story'?STOPS:ENDLESS_STOPS;run.routeActive=!!d.routeActive;run.storyDone=!!d.storyDone;run.started=!!d.started;run.usedEvents=Array.isArray(d.usedEvents)?d.usedEvents:[];run.rng=(+d.rng>>>0)||1;run.history=Array.isArray(d.history)?d.history.slice(-24):[];run.relationships=d.relationships||run.relationships;run.sound=d.sound!==false;}
  function loadLocal(){try{applySave(JSON.parse(localStorage.getItem(SAVE_KEY)||'null'));}catch(_){}}
  async function initPlatform(){if(!window.YaGames?.init)return;try{ysdk=await window.YaGames.init();language=String(ysdk.environment?.i18n?.lang||'ru').toLowerCase().startsWith('en')?'en':'ru';try{player=await ysdk.getPlayer({scopes:false});const d=await player.getData(['route58']);if(d?.route58){const localBest=run.best;applySave(d.route58);run.best=Math.max(run.best,localBest);}}catch(_){player=null;}}catch(e){console.info('Yandex SDK unavailable: guest/local mode.',e);}}
  function sdkReady(){try{ysdk?.features?.LoadingAPI?.ready?.();}catch(_){}}
  function gameplayStart(){try{ysdk?.features?.GameplayAPI?.start?.();}catch(_){}}
  function gameplayStop(){try{ysdk?.features?.GameplayAPI?.stop?.();}catch(_){}}
  function startScene(key,data){if(!game)return;const source=game.scene.getScene(activeScene);if(source?.scene?.isActive())source.scene.start(key,data);else game.scene.getScene('MenuScene').scene.start(key,data);}
  function pauseActive(){if(!game||game.scene.isActive('PauseScene'))return;const active=game.scene.getScenes(true).find(s=>s.scene.key!=='PauseScene');if(!active)return;pauseSource=active.scene.key;gameplayStop();active.scene.pause();active.scene.launch('PauseScene',{from:pauseSource});}
  function resumeActive(){if(!game||!pauseSource)return;const pause=game.scene.getScene('PauseScene'),source=game.scene.getScene(pauseSource);pause?.scene?.stop();source?.scene?.resume();gameplayStart();pauseSource=null;}

  function panel(scene,x,y,w,h,fill=0x071725,alpha=.94,stroke=0xf0c96f,r=18){const g=scene.add.graphics();g.fillStyle(fill,alpha).fillRoundedRect(x,y,w,h,r);if(stroke!==null){g.lineStyle(2,stroke,.95).strokeRoundedRect(x,y,w,h,r);}return g;}
  function label(scene,x,y,s,size=20,colour='#fff3da',originX=0,originY=0,weight='700'){return scene.add.text(x,y,s,{fontFamily:'system-ui, Arial, sans-serif',fontSize:`${size}px`,fontStyle:weight,color:colour,stroke:'#0a1420',strokeThickness:2,shadow:{offsetX:0,offsetY:2,color:'#000000',blur:3,fill:true}}).setOrigin(originX,originY);}
  function button(scene,x,y,w,h,title,action,fill=0xe8b955,opts={}){
    const g=scene.add.graphics();g.fillStyle(fill,opts.alpha??.97).fillRoundedRect(x,y,w,h,opts.radius||14);g.lineStyle(2,opts.stroke??0xffe7a8,.95).strokeRoundedRect(x,y,w,h,opts.radius||14);
    const txt=scene.add.text(x+w/2,y+h/2,title,{fontFamily:'system-ui, Arial, sans-serif',fontSize:`${opts.fontSize||19}px`,fontStyle:'700',color:opts.color||'#14243a',align:'center',wordWrap:{width:w-30},lineSpacing:1}).setOrigin(.5);
    const zone=scene.add.zone(x+w/2,y+h/2,w,h).setInteractive({useHandCursor:true});
    zone.on('pointerover',()=>scene.tweens.add({targets:[g,txt],scaleX:1.025,scaleY:1.045,duration:100,ease:'Sine.Out'}));
    zone.on('pointerout',()=>scene.tweens.add({targets:[g,txt],scaleX:1,scaleY:1,duration:100}));
    zone.on('pointerdown',action);return{g,txt,zone};
  }
  function choiceScenario(){
    const anchors={'1:1':'phone','1:4':'clip','2:3':'route','3:2':'clip','4:4':'late','5:5':'brake','6:4':'rain','7:6':'meeting','8:8':'meeting'};
    const force=run.mode==='story'?anchors[`${run.chapter}:${run.stopIndex}`]:null;
    if(force&&!run.usedEvents.includes(force)){run.usedEvents.push(force);return eventById(force)||allEvents[0];}
    const reserved=new Set();if(run.mode==='story')for(const [key,id] of Object.entries(anchors)){const [ch,st]=key.split(':').map(Number);if(ch===run.chapter&&st>run.stopIndex)reserved.add(id);}
    let pool=allEvents.filter(e=>!run.usedEvents.includes(e.id)&&!reserved.has(e.id));if(!pool.length)pool=allEvents.filter(e=>!run.usedEvents.includes(e.id));if(!pool.length){run.usedEvents=[];pool=allEvents.filter(e=>!reserved.has(e.id));}
    const ev=pool[Math.floor(seeded()*pool.length)]||allEvents[0];run.usedEvents.push(ev.id);return ev;
  }
  function newRoute(mode='story',resume=false){run.mode=mode;run.totalStops=mode==='story'?STOPS:ENDLESS_STOPS;if(mode==='story')run.started=true;if(!resume){run.stopIndex=0;run.shiftScore=0;run.shiftTickets=0;run.shiftRespect=0;run.usedEvents=[];run.rng=(Date.now()^Math.floor(Math.random()*0xffffffff))>>>0;run.rng=run.rng||1;run.routeName=Math.floor(seeded()*6);}run.routeActive=true;save();gameplayStart();startScene('RoadScene');}
  function newStory(){run.chapter=1;run.unlocked=1;run.best=run.best||0;run.trust=50;run.tension=20;run.safety=85;run.respect=0;run.started=true;run.storyDone=false;run.routeActive=false;run.mode='story';run.history=[];run.relationships={nina:0,arman:0,dispatcher:0};newRoute('story',false);}
  function continueStory(){if(run.routeActive){newRoute(run.mode,true);return;}if(run.mode==='endless'){newRoute('endless',false);return;}if(run.started&&!run.storyDone&&run.chapter<run.unlocked)run.chapter=run.unlocked;if(run.storyDone){newStory();return;}newRoute('story',false);}
  function advanceChapter(){if(run.mode==='story'&&run.chapter<STORY_CHAPTERS){run.chapter=Math.min(STORY_CHAPTERS,run.chapter+1);run.unlocked=Math.max(run.unlocked,run.chapter);save();const launch=()=>newRoute('story',false);if(ysdk?.adv?.showFullscreenAdv&&run.chapter%3===0){gameplayStop();try{ysdk.adv.showFullscreenAdv({callbacks:{onClose:launch,onError:launch}});}catch(_){launch();}}else launch();}else if(run.mode==='story'){run.storyDone=true;run.routeActive=false;save();game.scene.start('MenuScene');}else newRoute('endless',false);}

  function buildTextures(scene){
    const g=scene.make.graphics({x:0,y:0,add:false});
    g.fillStyle(0x14253a,1).fillEllipse(38,88,62,15);g.fillStyle(0xf2c66b,1).fillRoundedRect(15,7,46,76,8);g.lineStyle(3,0xffedb0,1).strokeRoundedRect(15,7,46,76,8);g.fillStyle(0x15374a,1).fillRoundedRect(21,13,34,25,3);g.fillStyle(0x235c6a,1).fillRoundedRect(23,43,30,27,2);g.fillStyle(0xffdf83,1).fillRect(21,73,7,5).fillRect(48,73,7,5);g.generateTexture('bus-rear',76,100);g.clear();
    g.fillStyle(0xffd66f,1).fillRoundedRect(3,7,42,28,4);g.lineStyle(2,0xfff3bd,1).strokeRoundedRect(3,7,42,28,4);g.fillStyle(0xa66045,1).fillRect(10,18,19,3);g.fillStyle(0xfff0b6,1).fillCircle(37,12,3);g.generateTexture('ticket',48,42);g.clear();
    g.fillStyle(0xf18261,1).fillTriangle(24,2,45,45,3,45);g.fillStyle(0xffe4b3,1).fillRect(12,28,24,5);g.fillStyle(0x9e4f45,1).fillRect(5,43,38,5);g.generateTexture('cone',48,52);g.clear();
    g.fillStyle(0x548a99,1).fillEllipse(30,18,56,24);g.fillStyle(0xa5e1d4,1).fillEllipse(30,15,35,9);g.generateTexture('puddle',60,36);g.clear();
    g.fillStyle(0x14253a,1).fillRoundedRect(8,2,38,62,7);g.lineStyle(3,0xf2c46c,1).strokeRoundedRect(8,2,38,62,7);g.fillStyle(0x74ddc6,1).fillRoundedRect(13,9,28,47,4);g.fillStyle(0x17334a,1).fillCircle(27,51,2);g.generateTexture('phone-icon',54,68);g.destroy();
  }

  class BootScene extends Phaser.Scene{
    constructor(){super('BootScene');}
    preload(){
      const bg=this.add.rectangle(W/2,H/2,W,H,0x0b1727);const title=this.add.text(W/2,H/2-40,T().loading,{fontFamily:'system-ui,Arial',fontSize:'25px',fontStyle:'700',color:'#f3d681'}).setOrigin(.5);const bar=this.add.rectangle(W/2,H/2+18,1,8,0x48d6bb).setOrigin(.5);
      this.load.image('scene-menu','assets/scene-menu.jpg');this.load.image('scene-driver','assets/scene-driver.jpg');this.load.image('scene-follow','assets/scene-follow.jpg');this.load.image('scene-cabin-drive','assets/scene-cabin-drive.jpg');this.load.image('scene-cabin','assets/scene-cabin.jpg');this.load.image('driver-portrait','assets/driver-portrait.png');
      this.load.on('progress',v=>{bar.width=520*v;});this.load.on('loaderror',file=>console.error('Asset load failed:',file.key,file.src));this.events.once('shutdown',()=>{bg.destroy();title.destroy();bar.destroy();});
    }
    create(){buildTextures(this);sdkReady();this.scene.start('MenuScene');}
  }
  class MenuScene extends Phaser.Scene{
    constructor(){super('MenuScene');}
    create(){
      activeScene=this.scene.key;this.add.image(W/2,H/2,'scene-menu');this.add.rectangle(W/2,H/2,W,H,0x06101a,.24);
      const shade=this.add.graphics();shade.fillGradientStyle(0x06111d,0x06111d,0x06111d,0x06111d,.95,.95,.08,.08);shade.fillRect(0,0,560,H);
      panel(this,34,28,520,482,0x081827,.9,0xe2bd6d,24);
      this.add.text(66,62,T().title,{fontFamily:'system-ui,Arial',fontSize:'44px',fontStyle:'900',color:'#f6d77e',stroke:'#182234',strokeThickness:5}).setOrigin(0,0);
      this.add.text(69,118,T().subtitle,{fontFamily:'system-ui,Arial',fontSize:'20px',fontStyle:'800',color:'#8ee5d2'});
      this.add.text(69,158,T().tagline,{fontFamily:'system-ui,Arial',fontSize:'18px',color:'#f0eddc',wordWrap:{width:440},lineSpacing:5});
      const chapterName=T().chapterNames[clamp(run.chapter-1,0,STORY_CHAPTERS-1)];
      this.add.text(69,244,`${T().chapter} ${run.chapter} / ${STORY_CHAPTERS}   ·   ${chapterName}`,{fontFamily:'system-ui,Arial',fontSize:'18px',fontStyle:'700',color:'#91e3d3',wordWrap:{width:430}});
      this.add.text(69,291,`${T().trust}  ${Math.round(run.trust)}     ${T().tension}  ${Math.round(run.tension)}     ${T().tickets}  ${run.bank}`,{fontFamily:'system-ui,Arial',fontSize:'17px',fontStyle:'700',color:'#f1d58b'});
      this.add.text(69,324,`${T().score} ${run.best}     ${T().badge} ${run.respect}`,{fontFamily:'system-ui,Arial',fontSize:'17px',fontStyle:'700',color:'#cbe7d4'});
      const primary=run.started&&!run.storyDone?T().start:T().new;
      button(this,66,356,454,52,primary,()=>{if(run.started&&!run.storyDone)continueStory();else newStory();},0xe9b953,{fontSize:21});
      button(this,66,418,454,42,T().endless,()=>newRoute('endless',false),0x1d5261,{fontSize:17,color:'#f4efdd',stroke:0x83bfb0});
      button(this,790,28,132,38,`${T().sound}: ${run.sound===false?T().off:T().on}`,()=>{run.sound=run.sound===false;save();this.scene.restart();},0x132c40,{fontSize:13,color:'#d9ebdc',stroke:0x759b90});
      this.add.text(950,47,language.toUpperCase(),{fontFamily:'system-ui,Arial',fontSize:'17px',fontStyle:'700',color:'#fff0c0'}).setOrigin(1,.5).setInteractive({useHandCursor:true}).on('pointerdown',()=>{language=language==='ru'?'en':'ru';this.scene.restart();});
      this.add.text(69,466,T().controls,{fontFamily:'system-ui,Arial',fontSize:'11px',fontStyle:'700',color:'#f0ead8',stroke:'#1a2736',strokeThickness:3,wordWrap:{width:440}});
      this.add.text(69,482,T().mobile,{fontFamily:'system-ui,Arial',fontSize:'10px',fontStyle:'600',color:'#e0e3d5',stroke:'#1a2736',strokeThickness:2,wordWrap:{width:440}});
      this.add.text(69,497,T().credits,{fontFamily:'system-ui,Arial',fontSize:'9px',color:'#e0e3d5',stroke:'#1a2736',strokeThickness:2,wordWrap:{width:440}});
      this.cameras.main.fadeIn(350,8,18,28);
    }
  }
  class RoadScene extends Phaser.Scene{
    constructor(){super('RoadScene');}
    create(){
      activeScene=this.scene.key;gameplayStart();this.cameras.main.fadeIn(250,8,18,28);
      this.lanes=run.view===1?[292,480,668]:[350,480,610];
      this.bg=this.add.image(W/2,H/2,this.backgroundKey());this.bg.setDisplaySize(W,H).setDepth(0);
      this.roadTint=this.add.rectangle(W/2,H/2,W,H,0x071420,.06).setDepth(1);
      this.hazards=this.physics.add.group({allowGravity:false,immovable:true});
      this.playerBody=this.physics.add.image(this.lanes[1],424,'bus-rear').setScale(.78).setAlpha(run.view===1?1:.001).setDepth(8);
      this.playerBody.body.setAllowGravity(false);this.playerBody.body.setImmovable(true);this.playerBody.body.setSize(54,72).setOffset(11,17);
      this.physics.add.overlap(this.playerBody,this.hazards,(p,h)=>this.hitHazard(h),null,this);
      this.lane=1;this.bus=this.playerBody;this.bus.setVisible(run.view===1);
      this.hudBg=this.add.graphics().setDepth(30);this.hudBg.fillStyle(0x071522,.84).fillRoundedRect(18,16,924,60,16);this.hudBg.lineStyle(2,0x5c8990,.9).strokeRoundedRect(18,16,924,60,16);
      this.hudText=this.add.text(38,24,'',{fontFamily:'system-ui,Arial',fontSize:'15px',fontStyle:'700',color:'#f5efdd',lineSpacing:1}).setDepth(31);
      this.statusText=this.add.text(482,92,'',{fontFamily:'system-ui,Arial',fontSize:'15px',fontStyle:'700',color:'#fff0c7',align:'center'}).setOrigin(.5).setDepth(31);
      this.phonePanel=this.add.container(480,116).setDepth(32);const ph=this.add.rectangle(0,0,390,64,0x142940,.96).setStrokeStyle(2,0xf0c96f);const ptxt=this.add.text(0,-8,T().phone,{fontFamily:'system-ui,Arial',fontSize:'17px',fontStyle:'800',color:'#ffe18a'}).setOrigin(.5);const pkey=this.add.text(0,17,T().phoneKey,{fontFamily:'system-ui,Arial',fontSize:'14px',color:'#dbe8d8'}).setOrigin(.5);this.phonePanel.add([ph,ptxt,pkey]);this.phonePanel.setAlpha(0).setScale(.85);this.phoneShown=false;
      this.cameraButton=button(this,774,89,160,42,T().view,()=>this.switchView(),0x142e43,{fontSize:14,color:'#fff1d4',stroke:0x719d97});
      this.pauseButton=button(this,28,89,116,42,T().pause,()=>pauseActive(),0x142e43,{fontSize:14,color:'#fff1d4',stroke:0x719d97});
      this.leftButton=button(this,35,430,112,70,'◀',()=>this.changeLane(-1),0x122d40,{fontSize:38,color:'#ffe39a',stroke:0x79aaa0,alpha:.86});
      this.rightButton=button(this,813,430,112,70,'▶',()=>this.changeLane(1),0x122d40,{fontSize:38,color:'#ffe39a',stroke:0x79aaa0,alpha:.86});
      this.pointer=this.add.image(480,150,'ticket').setAlpha(0).setDepth(8);
      this.segmentElapsed=0;this.segmentDuration=11.8;this.spawnClock=0.7;this.phoneClock=3.2+seeded()*3;this.notifyTimer=0;this.resolved=0;
      this.input.keyboard?.addCapture(['LEFT','RIGHT','SPACE','UP','DOWN']);
      this.input.keyboard?.on('keydown',e=>this.onKey(e));
      this.input.on('pointerdown',p=>{if(p.y>410){if(p.x<W/2)this.changeLane(-1);else this.changeLane(1);}});
      this.time.addEvent({delay:780,loop:true,callback:()=>{if(this.segmentElapsed>1.1&&this.segmentElapsed<this.segmentDuration-1.3)this.spawnHazard();}});
      this.updateHud();
    }
    backgroundKey(){return run.view===0?'scene-driver':run.view===1?'scene-follow':'scene-cabin-drive';}
    onKey(e){const k=e.key.toLowerCase();if(k==='arrowleft'||k==='a')this.changeLane(-1);else if(k==='arrowright'||k==='d')this.changeLane(1);else if(k==='v')this.switchView();else if(k===' '||k==='f')this.dismissPhone();else if(k==='p'||k==='escape')pauseActive();}
    changeLane(dir){const next=clamp(this.lane+dir,0,2);if(next===this.lane)return;this.lane=next;this.tweens.add({targets:this.playerBody,x:this.lanes[next],duration:180,ease:'Cubic.Out'});this.cameras.main.shake(80,.0015);this.updateLanePulse();}
    updateLanePulse(){if(this.lanePulse)this.lanePulse.destroy();this.lanePulse=this.add.ellipse(this.lanes[this.lane],462,92,16,0x41d6bc,.35).setDepth(7);this.tweens.add({targets:this.lanePulse,alpha:.08,duration:450,yoyo:true,repeat:1});}
    switchView(){run.view=(run.view+1)%3;const key=this.backgroundKey();this.bg.setTexture(key);this.bus.setVisible(run.view===1);this.lanes=run.view===1?[292,480,668]:[350,480,610];this.tweens.add({targets:this.playerBody,x:this.lanes[this.lane],duration:220,ease:'Sine.Out'});this.cameraButton.txt.setText(T().view);this.updateHud();save();}
    spawnHazard(){const r=seeded();const kind=r<.25?'ticket':r<.64?'cone':'puddle';const lane=Math.floor(seeded()*3);const x=this.lanes[lane];const obj=this.hazards.create(x,166,kind);obj.kind=kind;obj.lane=lane;obj.resolved=false;obj.setDepth(9);obj.setScale(.42);obj.body.setAllowGravity(false);obj.body.setImmovable(true);obj.body.setSize(kind==='ticket'?38:46,kind==='puddle'?24:42);if(run.view!==1)obj.setAlpha(.95);this.tweens.add({targets:obj,y:455,scale:1.23,duration:4100,ease:'Linear',onComplete:()=>{if(obj.active){obj.destroy();}}});}
    hitHazard(obj){if(!obj?.active||obj.resolved)return;obj.resolved=true;if(obj.kind==='ticket'){run.shiftTickets++;run.bank++;run.shiftScore+=28;this.flashText('+ 1 '+T().tickets,0x63dfbf);this.soundPing(880);}else{run.safety=clamp(run.safety-9,0,100);run.tension=clamp(run.tension+4,0,100);run.shiftScore=Math.max(0,run.shiftScore-15);this.cameras.main.shake(200,.006);this.flashText('− '+T().safety,0xff907c);this.soundPing(150);}this.updateHud();save();obj.destroy();}
    flashText(s,color){const tx=this.add.text(480,185,s,{fontFamily:'system-ui,Arial',fontSize:'23px',fontStyle:'800',color:color===0xff907c?'#ff907c':'#7de7c5',stroke:'#132337',strokeThickness:5}).setOrigin(.5).setDepth(40);this.tweens.add({targets:tx,y:145,alpha:0,duration:950,ease:'Cubic.Out',onComplete:()=>tx.destroy()});}
    updateHud(){if(!this.hudText)return;this.hudText.setText(`${T().chapter} ${run.chapter}/${STORY_CHAPTERS}   ·   ${T().stop} ${run.stopIndex+1}/${run.totalStops}   ·   ${T().score} ${run.shiftScore}   ·   ${T().tickets} ${run.shiftTickets}\n${T().safety} ${Math.round(run.safety)}   ·   ${T().tension} ${Math.round(run.tension)}`);}
    showPhone(){if(this.phoneShown)return;this.phoneShown=true;this.phonePanel.setAlpha(1);this.tweens.add({targets:this.phonePanel,scale:1,duration:190,ease:'Back.Out'});this.tweens.add({targets:this.phonePanel,alpha:.5,duration:300,yoyo:true,repeat:2});this.notifyTimer=2.7;this.soundPing(740);}
    dismissPhone(){if(!this.phoneShown)return;this.phoneShown=false;this.notifyTimer=0;run.shiftScore+=10;run.safety=clamp(run.safety+2,0,100);this.tweens.add({targets:this.phonePanel,alpha:0,scale:.9,duration:160});this.flashText(T().phoneKey,0x63dfbf);this.updateHud();save();}
    soundPing(freq){if(run.sound===false)return;try{const C=window.AudioContext||window.webkitAudioContext;if(!this.audio)this.audio=new C();const o=this.audio.createOscillator(),g=this.audio.createGain();o.frequency.value=freq;g.gain.setValueAtTime(.025,this.audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,this.audio.currentTime+.07);o.connect(g);g.connect(this.audio.destination);o.start();o.stop(this.audio.currentTime+.07);}catch(_){}}
    update(time,delta){const dt=delta/1000;this.segmentElapsed+=dt;this.spawnClock-=dt;if(this.segmentElapsed>=this.phoneClock&&!this.phoneShown&&this.segmentElapsed<this.segmentDuration-2){this.showPhone();this.phoneClock=this.segmentDuration+10;}if(this.phoneShown){this.notifyTimer-=dt;if(this.notifyTimer<=0){this.phoneShown=false;this.tweens.add({targets:this.phonePanel,alpha:0,duration:140});}}
      if(this.segmentElapsed>this.segmentDuration-3)this.statusText.setText(`${T().stop} ${run.stopIndex+1}  ·  ${T().chapterNames[clamp(run.chapter-1,0,7)]}`);else this.statusText.setText('');
      this.bg.x=480+Math.sin(time/1250)*2.5;
      if(this.segmentElapsed>=this.segmentDuration)this.arrive();
    }
    arrive(){if(this.arrived)return;this.arrived=true;gameplayStop();const ev=choiceScenario();this.cameras.main.fadeOut(320,8,18,28);this.cameras.main.once('camerafadeoutcomplete',()=>this.scene.start('StopScene',{eventId:ev.id}));}
  }
  class StopScene extends Phaser.Scene{
    constructor(){super('StopScene');}
    init(data){this.ev=eventById(data.eventId)||allEvents[0];this.typing=false;this.choiceMade=false;}
    create(){
      activeScene=this.scene.key;gameplayStart();const bg=this.ev.id==='phone'?'scene-cabin':'scene-cabin-drive';this.background=this.add.image(W/2,H/2,bg).setDisplaySize(W,H);this.activeBgKey=bg;this.stopView=2;
      this.add.rectangle(W/2,H/2,W,H,0x06121d,.17);
      this.cameras.main.fadeIn(300,8,18,28);this.cameras.main.flash(130,255,218,142,.18);
      this.add.rectangle(W/2,286,W,110,0x0b1826,.18);
      this.stopTag=this.add.text(44,35,`${T().stop} ${run.stopIndex+1} / ${run.totalStops}     ·     ${word(this.ev.person)}`,{fontFamily:'system-ui,Arial',fontSize:'20px',fontStyle:'800',color:'#ffe08a',stroke:'#102037',strokeThickness:5}).setDepth(10);
      const viewkeys=['scene-driver','scene-follow','scene-cabin'];
      const vbtn=button(this,778,32,150,44,T().views[this.stopView],()=>{},0x122e44,{fontSize:14,color:'#fff0d0',stroke:0x81ada4});
      const cycleView=()=>{this.stopView=(this.stopView+1)%3;run.view=this.stopView;this.changeBackdrop(viewkeys[this.stopView]);vbtn.txt.setText(T().views[this.stopView]);save();};
      vbtn.zone.removeAllListeners('pointerdown');vbtn.zone.on('pointerdown',cycleView);
      this.panel=this.add.container(0,590).setDepth(20);
      const pg=this.add.graphics();pg.fillStyle(0x071624,.965).fillRoundedRect(28,0,904,226,22);pg.lineStyle(2,0xe4c06e,.95).strokeRoundedRect(28,0,904,226,22);this.panel.add(pg);
      this.heading=this.add.text(58,20,T().boarding,{fontFamily:'system-ui,Arial',fontSize:'19px',fontStyle:'800',color:'#8ee4d2'});this.panel.add(this.heading);
      this.introText=this.add.text(58,53,'',{fontFamily:'system-ui,Arial',fontSize:'21px',fontStyle:'600',color:'#fff4df',wordWrap:{width:835},lineSpacing:4,stroke:'#071321',strokeThickness:2});this.panel.add(this.introText);
      this.talkHint=this.add.text(58,190,T().listen,{fontFamily:'system-ui,Arial',fontSize:'16px',fontStyle:'700',color:'#c8dccf'});this.panel.add(this.talkHint);
      this.tweens.add({targets:this.panel,y:300,duration:520,ease:'Cubic.Out'});
      this.passengerToken=this.makePassengerToken();this.passengerToken.setPosition(1030,262).setDepth(15);
      this.tweens.add({targets:this.passengerToken,x:840,duration:760,ease:'Back.Out',onComplete:()=>{this.typeIntro();}});
      this.input.keyboard?.on('keydown',e=>{if(e.key==='Enter'||e.key===' '){if(this.typing)this.finishTyping();else if(this.choiceMade)this.continueAfterReply();}if(!this.typing&&!this.choiceMade&&['1','2','3'].includes(e.key))this.choose(Number(e.key)-1);if(e.key.toLowerCase()==='v')cycleView();if(e.key==='Escape'||e.key.toLowerCase()==='p')pauseActive();});
      this.input.on('pointerdown',p=>{if(this.typing&&p.y>285)this.finishTyping();});
    }
    changeBackdrop(key){this.background.setTexture(key);this.activeBgKey=key;}
    makePassengerToken(){const c=this.add.container(0,0);const g=this.add.graphics();g.fillStyle(0x082034,.92).fillCircle(0,0,44);g.lineStyle(3,0xf0c96f,1).strokeCircle(0,0,44);g.fillStyle(0xd79b78,1).fillCircle(0,-12,15);g.fillStyle(0x34536b,1).fillRoundedRect(-21,6,42,31,9);g.fillStyle(0x55d3b9,1).fillRoundedRect(18,7,13,21,3);c.add(g);c.setScale(.82);return c;}
    typeIntro(){if(this.typing)return;this.typing=true;this.talkHint.setText(T().talk);const text=word(this.ev.intro),chars=Array.from(text);let i=0;this.typeEvent=this.time.addEvent({delay:18,repeat:chars.length,callback:()=>{i++;this.introText.setText(chars.slice(0,i).join(''));if(i>=chars.length)this.finishTyping();}});}
    finishTyping(){if(!this.typing)return;this.typing=false;this.typeEvent?.remove();this.introText.setText(word(this.ev.intro));this.talkHint.setText(T().choice);this.makeChoices();}
    makeChoices(){if(this.choiceButtons)return;this.choiceButtons=[];this.ev.options.forEach((opt,i)=>{const x=49+i*292;const btn=button(this,x,422,276,102,`${i+1}.  ${word(opt.label)}`,()=>this.choose(i),0x18384b,{fontSize:16,color:'#fff2dc',stroke:0x69a99e,radius:14});btn.g.setDepth(21);btn.txt.setDepth(22);btn.zone.setDepth(23);btn.g.setAlpha(0);btn.txt.setAlpha(0);this.tweens.add({targets:[btn.g,btn.txt],alpha:1,y:'-=18',duration:280,delay:i*75,ease:'Back.Out'});this.choiceButtons.push(btn);});this.talkHint.setVisible(false);}
    choose(i){if(this.choiceMade)return;const opt=this.ev.options[i];this.choiceMade=true;const [tr,te,sa]=opt.eff;run.trust=clamp(run.trust+tr,0,100);run.tension=clamp(run.tension+te,0,100);run.safety=clamp(run.safety+sa,0,100);if(opt.rel)run.relationships[opt.rel]=clamp((run.relationships[opt.rel]||0)+Math.sign(tr||sa)*4,-100,100);run.shiftScore+=Math.max(0,40+tr*2+sa);run.shiftRespect+=Math.max(0,Math.round((tr+sa)/15));run.respect+=Math.max(0,Math.round((tr+sa)/15));const tickets=Math.max(0,Math.floor((tr+sa)/20));run.shiftTickets+=tickets;run.bank+=tickets;run.stopIndex++;save();
      for(const b of this.choiceButtons||[]){b.zone.disableInteractive();this.tweens.add({targets:[b.g,b.txt],alpha:.08,duration:170});}
      this.heading.setText(T().reply);this.heading.setColor('#f4d481');this.introText.setText(word(opt.reply));this.introText.setY(70);this.introText.setFontSize(24);this.talkHint.setVisible(true).setText(`${T().trust} ${Math.round(run.trust)}     ${T().tension} ${Math.round(run.tension)}     ${T().safety} ${Math.round(run.safety)}`);
      const effect=this.add.text(58,167,`${tr>=7?'+'+T().trust:''}   ${te<0?'−'+T().tension:''}   ${sa>0?'+'+T().safety:''}`,{fontFamily:'system-ui,Arial',fontSize:'18px',fontStyle:'800',color:te>8?'#ff9a7d':'#8ce4c6'});this.panel.add(effect);
      this.continueBtn=button(this,734,468,190,52,T().continue,()=>this.continueAfterReply(),0xe9b953,{fontSize:18});this.continueBtn.g.setDepth(26);this.continueBtn.txt.setDepth(27);this.continueBtn.zone.setDepth(28);this.tweens.add({targets:[this.continueBtn.g,this.continueBtn.txt],alpha:0,duration:0});this.tweens.add({targets:[this.continueBtn.g,this.continueBtn.txt],alpha:1,y:'-=12',duration:250,delay:150,ease:'Back.Out'});this.cameras.main.shake(110,.0012);}
    continueAfterReply(){if(!this.choiceMade)return;if(run.stopIndex>=run.totalStops){this.scene.start('ReportScene');}else{this.scene.start('RoadScene');}}
  }
  class ReportScene extends Phaser.Scene{
    constructor(){super('ReportScene');}
    create(){activeScene=this.scene.key;gameplayStop();run.routeActive=false;const newRecord=run.shiftScore>run.best;run.best=Math.max(run.best,run.shiftScore);run.history.push({chapter:run.chapter,mode:run.mode,score:run.shiftScore,trust:run.trust,tension:run.tension});run.history=run.history.slice(-24);if(run.mode==='story'&&run.chapter<STORY_CHAPTERS)run.unlocked=Math.max(run.unlocked,run.chapter+1);if(run.mode==='story'&&run.chapter>=STORY_CHAPTERS)run.storyDone=true;save();this.add.image(W/2,H/2,'scene-menu').setDisplaySize(W,H);this.add.rectangle(W/2,H/2,W,H,0x07111c,.42);panel(this,82,44,796,452,0x081827,.94,0xe9c36b,24);this.cameras.main.fadeIn(260,8,18,28);
      const complete=run.mode==='story'&&run.chapter>=STORY_CHAPTERS;this.add.text(W/2,77,complete?T().seasonDone:T().shiftDone,{fontFamily:'system-ui,Arial',fontSize:'32px',fontStyle:'900',color:'#f4d983',stroke:'#112034',strokeThickness:5}).setOrigin(.5);
      this.add.image(210,280,'driver-portrait').setDisplaySize(186,238).setCrop(0,0,256,319);
      this.add.text(348,143,`${T().chapter} ${run.chapter}   ·   ${T().score} ${run.shiftScore}`,{fontFamily:'system-ui,Arial',fontSize:'23px',fontStyle:'800',color:'#fff2d1'});
      this.add.text(348,189,`${T().tickets} ${run.shiftTickets}     ${T().badge} ${run.shiftRespect}`,{fontFamily:'system-ui,Arial',fontSize:'19px',fontStyle:'700',color:'#e9d18a'});
      this.add.text(348,232,`${T().trust} ${Math.round(run.trust)}     ${T().tension} ${Math.round(run.tension)}     ${T().safety} ${Math.round(run.safety)}`,{fontFamily:'system-ui,Arial',fontSize:'17px',fontStyle:'700',color:'#cbe9d5'});
      const ep=run.mode==='endless'?T().endlessEnd:run.trust>=65?T().goodEnd:(run.trust<35||run.tension>72?T().lowEnd:T().midEnd);
      this.add.text(348,285,ep,{fontFamily:'system-ui,Arial',fontSize:'18px',color:'#e6e9db',wordWrap:{width:460},lineSpacing:6});
      if(newRecord)this.add.text(348,355,T().record,{fontFamily:'system-ui,Arial',fontSize:'20px',fontStyle:'900',color:'#ff9c82'});
      button(this,117,422,345,54,complete?T().menu:run.mode==='story'?T().next:T().replay,()=>{if(complete){this.scene.start('MenuScene');}else if(run.mode==='story')advanceChapter();else newRoute('endless',false);},0xe9b953,{fontSize:18});
      button(this,497,422,345,54,T().replay,()=>newRoute('endless',false),0x24505e,{fontSize:18,color:'#fff0d6',stroke:0x86beb0});
    }
  }
  class PauseScene extends Phaser.Scene{
    constructor(){super('PauseScene');}
    init(data){this.from=data.from;}
    create(){this.add.rectangle(W/2,H/2,W,H,0x06101b,.82);panel(this,230,116,500,320,0x0c2034,.98,0xefc86d,22);this.add.text(W/2,172,T().pauseTitle,{fontFamily:'system-ui,Arial',fontSize:'32px',fontStyle:'900',color:'#f4d37c'}).setOrigin(.5);this.add.text(W/2,224,T().pauseTip,{fontFamily:'system-ui,Arial',fontSize:'20px',color:'#e5edde',align:'center',wordWrap:{width:410}}).setOrigin(.5);button(this,300,296,360,56,T().resume,()=>resumeActive(),0xe8b955,{fontSize:20});button(this,350,369,260,42,T().menu,()=>{gameplayStop();this.scene.stop('PauseScene');this.scene.stop(this.from);this.scene.start('MenuScene');},0x1d4b59,{fontSize:16,color:'#fff0d8',stroke:0x7cb5aa});this.input.keyboard?.on('keydown',e=>{if(e.key==='Escape'||e.key.toLowerCase()==='p')resumeActive();});}
  }

  function initGame(){
    const config={type:Phaser.AUTO,parent:'game-container',width:W,height:H,backgroundColor:'#0a1725',render:{antialias:false,pixelArt:true,roundPixels:true},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH,width:W,height:H},physics:{default:'arcade',arcade:{gravity:{y:0},debug:false}},input:{keyboard:{capture:['LEFT','RIGHT','SPACE','UP','DOWN']}},scene:[BootScene,MenuScene,RoadScene,StopScene,ReportScene,PauseScene]};
    game=new Phaser.Game(config);window.route58Game=game;
    ysdk?.on?.('game_api_pause',pauseActive);ysdk?.on?.('game_api_resume',resumeActive);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseActive();});window.addEventListener('blur',()=>{if(game?.scene.isActive('RoadScene'))pauseActive();});
  }
  async function start(){loadLocal();await initPlatform();if(ysdk?.environment?.i18n?.lang)language=String(ysdk.environment.i18n.lang).toLowerCase().startsWith('en')?'en':'ru';initGame();}
  if(!Array.isArray(allEvents)||allEvents.length<10){document.getElementById('game-container').textContent='Не загрузились игровые события. Перезагрузите игру.';throw new Error('ROUTE58_EVENTS missing');}
  start();
})();
