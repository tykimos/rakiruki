// src/components/Stage3.js
import React, { useState, useEffect, useRef, useCallback } from 'react';

// ========[ 전체 화면 크기 ]========
const GAME_WIDTH = typeof window !== 'undefined' ? window.innerWidth : 800;
const GAME_HEIGHT = typeof window !== 'undefined' ? window.innerHeight : 600;

// 로켓, 라키루키 크기
const ROCKET_WIDTH = 70;
const ROCKET_HEIGHT = 100;
const LAKILUKI_WIDTH = 35;
const LAKILUKI_HEIGHT = 35;

// 행성, 고향 행성
const PLANET_BASE_SIZE = 60;
const HOME_PLANET_SIZE = 150;

// 총알
const BULLET_WIDTH = 10;
const BULLET_HEIGHT = 20;
const BULLET_SPEED = 8;

// 게임 진행
const TOTAL_DISTANCE = 5000;   
const BASE_SPEED = 2;         
const DISTANCE_FOR_MAX_SPEED = 6000;  
const MAX_SPEED_FACTOR = 2.5;  
const COMBO_RESET_TIME = 2000; 

//
// ===========[ SVG 스프라이트: circle 이용해 울퉁불퉁 원 ]===========
//
// 예: "circle,6,6,5,#AAA|circle,6,6,4,#CCC|circle,7,7,2,#FFF" 처럼
// 여러 circle을 겹쳐 "울퉁불퉁" 느낌을 낼 수 있음.

// 행성 (울퉁불퉁 원)
const PLANET_SVG = `
  circle,6,6,5,#AAA|circle,6,6,4,#CCC|circle,7,5,2,#FFF
`;

// 고향 행성
const HOME_PLANET_SVG = `
  circle,6,6,6,#6A5ACD|circle,5,6,4,#7B68EE|circle,6,7,3,#FFD700
`;

// 로켓 (직사각형)
const ROCKET_SVG = `
  rect,4,0,4,10,#999999|rect,3,10,6,10,#DDDDDD|rect,5,20,2,4,#FF0000|
  rect,2,24,8,2,#FF8C00|rect,3,26,6,2,#FFA500
`;

// 별(배경)
const STAR_SVG = `
  circle,6,6,3,#FFFFFF|circle,4,4,2,#FFFFFF|circle,8,8,1,#FFFFFF
`;

// 총알
const BULLET_SVG = `
  rect,3,0,4,10,#FF0000|rect,2,2,6,6,#FFA500
`;

// 폭발 (3프레임 예시)
const EXPLOSION_FRAMES = [
  `circle,6,6,3,#FF4500|circle,6,6,4,#FF8C00`,
  `circle,6,6,5,#FFA500|circle,5,6,4,#FFD700`,
  `circle,6,6,6,#F0E68C`
];

// 라키루키(원본 35×35)
const LAKILUKI_SVG = `
  rect,4,4,4,4,#FF69B4|rect,3,3,6,6,#FFC0CB|rect,5,5,2,2,#000
`;

//
// =====================[ Stage3 Component ]=====================
//
const Stage3 = ({
  score,
  setScore,
  lives,
  setLives,
  onStageEnd
}) => {

  // ====================[ 게임 상태 ]====================
  const [gameState, setGameState] = useState({
    isStarted: false,
    isGameOver: false,

    rocketX: GAME_WIDTH/2 - ROCKET_WIDTH/2,
    rocketY: GAME_HEIGHT - ROCKET_HEIGHT - 10,
    distance: 0,

    bullets: [],
    planets: [],
    homePlanetSpawned: false,

    explosions: [],
    stars: [],

    combo: 0,
    comboTimestamp: 0
  });
  const gameStateRef = useRef(gameState);

  // 이미지 로딩
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // canvas
  const canvasRef = useRef(null);
  const lastFrameTimeRef = useRef(performance.now());
  const fpsRef = useRef(0);

  const imagesRef = useRef({
    rocket: null,
    planet: null,
    homePlanet: null,
    bullet: null,
    star: null,
    explosionFrames: [],
    lakiluki: null
  });

  //
  // ===========[ useEffect: 전체 화면 + 스크롤 제거 ]===========
  //
  useEffect(() => {
    // 1) 스크롤 없애기
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';
    document.body.style.padding = '0';

    // 2) 리턴 시 복원(선택)
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.margin = '';
      document.body.style.padding = '';
    };
  }, []);

  //
  // ===========[ SVG 파싱: rect, circle ]===========
  //
  const createImageFromSVG = useCallback((svgData) => {
    // 예: "circle,6,6,5,#AAA|rect,2,2,8,8,#CCC"
    const items = svgData.split('|').map(s => s.trim());
    let shapes = '';

    items.forEach(item => {
      const tokens = item.split(',').map(t => t.trim());
      const shapeType = tokens[0];

      if(shapeType === 'rect'){
        // rect,x,y,w,h,#color
        // ex) rect,3,0,4,10,#FF0000
        const x = tokens[1], y = tokens[2], w = tokens[3], h = tokens[4], fill = tokens[5];
        shapes += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
      } else if(shapeType === 'circle'){
        // circle,cx,cy,r,#color
        const cx = tokens[1], cy = tokens[2], r = tokens[3], fill = tokens[4];
        shapes += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;
      }
    });

    const svgStr = `<svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">${shapes}</svg>`;
    const img = new Image();
    img.src = `data:image/svg+xml;utf8,${encodeURIComponent(svgStr)}`;
    return img;
  },[]);

  //
  // ===========[ 이미지 로드 ]===========
  //
  useEffect(() => {
    const toLoad = [];

    // rocket, planet, homePlanet, bullet, star
    const rocketImg = createImageFromSVG(ROCKET_SVG);
    imagesRef.current.rocket = rocketImg; 
    toLoad.push(rocketImg);

    const planetImg = createImageFromSVG(PLANET_SVG);
    imagesRef.current.planet = planetImg; 
    toLoad.push(planetImg);

    const homeImg = createImageFromSVG(HOME_PLANET_SVG);
    imagesRef.current.homePlanet = homeImg; 
    toLoad.push(homeImg);

    const bulletImg = createImageFromSVG(BULLET_SVG);
    imagesRef.current.bullet = bulletImg; 
    toLoad.push(bulletImg);

    const starImg = createImageFromSVG(STAR_SVG);
    imagesRef.current.star = starImg; 
    toLoad.push(starImg);

    // 폭발 (배열)
    const exImgs = EXPLOSION_FRAMES.map((frameStr) => createImageFromSVG(frameStr));
    imagesRef.current.explosionFrames = exImgs;
    toLoad.push(...exImgs);

    // 라키루키
    const lukiImg = createImageFromSVG(LAKILUKI_SVG);
    imagesRef.current.lakiluki = lukiImg;
    toLoad.push(lukiImg);

    let loadedCount = 0;
    const totalCount = toLoad.length;

    const handleLoad = () => {
      loadedCount++;
      if(loadedCount >= totalCount){
        setImagesLoaded(true);
      }
    };
    const handleError = (e) => {
      console.error("SVG load error:", e.target.src);
      loadedCount++;
      if(loadedCount >= totalCount){
        setImagesLoaded(true);
      }
    };

    toLoad.forEach((img) => {
      img.onload = handleLoad;
      img.onerror = handleError;
    });
  }, [createImageFromSVG]);

  //
  // ===========[ 별(배경) 초기화 ]===========
  //
  const initStars = useCallback(() => {
    const arr = [];
    for(let i=0; i<60; i++){
      arr.push({
        x: Math.random()*GAME_WIDTH,
        y: Math.random()*GAME_HEIGHT,
        speed: 0.5 + Math.random()*0.5
      });
    }
    return arr;
  },[]);

  //
  // ===========[ 시작/재시작 ]===========
  //
  const startOrRestartGame = useCallback(() => {
    setGameState({
      isStarted: true,
      isGameOver: false,

      rocketX: GAME_WIDTH/2 - ROCKET_WIDTH/2,
      rocketY: GAME_HEIGHT - ROCKET_HEIGHT - 10,
      distance: 0,

      bullets: [],
      planets: [],
      homePlanetSpawned: false,

      explosions: [],
      stars: initStars(),

      combo: 0,
      comboTimestamp: 0
    });
  }, [initStars]);

  //
  // ===========[ 키 이벤트 (스크롤 방지) ]===========
  //
  useEffect(() => {
    const handleKeyboard = (e) => {
      if (!gameStateRef.current.isStarted || gameStateRef.current.isGameOver) return;
      
      if (e.code === 'Space') {
        shootBullet();
      }
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        moveRocket(e.code === 'ArrowLeft' ? -1 : 1);
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [moveRocket, shootBullet]);

  //
  // ===========[ 로켓 이동 ]===========
  //
  const moveRocket = useCallback((dx) => {
    setGameState((prev) => {
      if(!prev.isStarted || prev.isGameOver) return prev;
      let newX = prev.rocketX + dx;
      if(newX<0) newX=0;
      if(newX>GAME_WIDTH-ROCKET_WIDTH) newX=GAME_WIDTH-ROCKET_WIDTH;
      return { ...prev, rocketX:newX };
    });
  },[]);

  //
  // ===========[ 총알 발사 ]===========
  //
  const shootBullet = useCallback(() => {
    setGameState((prev)=>{
      if(!prev.isStarted||prev.isGameOver) return prev;
      const bx = prev.rocketX + ROCKET_WIDTH/2 - BULLET_WIDTH/2;
      const by = prev.rocketY;
      return {
        ...prev,
        bullets:[...prev.bullets, {x:bx,y:by}]
      };
    });
  },[]);

  //
  // ===========[ 폭발 생성 ]===========
  //
  const createExplosion = useCallback((x,y)=>{
    setGameState((prev)=>({
      ...prev,
      explosions:[...prev.explosions,{x,y,frameIndex:0}]
    }));
  },[]);

  //
  // ===========[ 콤보 증가 ]===========
  //
  const increaseCombo = useCallback(()=>{
    setGameState((prev)=>{
      const now = performance.now();
      let newCombo = prev.combo;
      if(now - prev.comboTimestamp < COMBO_RESET_TIME){
        newCombo++;
      } else {
        newCombo = 1;
      }
      return { ...prev, combo:newCombo, comboTimestamp:now };
    });
  },[]);

  //
  // ===========[ 매 프레임 업데이트 ]===========
  //
  const updateGameState = useCallback((prev)=>{
    if(!prev.isStarted || prev.isGameOver) return prev;
    const newState = { ...prev };

    // 1) distance (이동 거리)
    newState.distance += 1;
    // speedFactor: 거리 많아질수록 가속
    const distRatio = Math.min(1, newState.distance / 6000);
    const speedFactor = 1 + (MAX_SPEED_FACTOR -1)*distRatio;

    // 2) 별 이동
    const updatedStars = newState.stars.map(star=>{
      let ny = star.y + star.speed*speedFactor;
      if(ny>GAME_HEIGHT) ny=0;
      return { ...star, y:ny };
    });
    newState.stars = updatedStars;

    // 3) 행성 이동
    let updatedPlanets = newState.planets.map(p => {
      const ny = p.y + p.speedY*speedFactor;
      const nx = p.x + p.speedX*speedFactor;
      return { ...p, x:nx, y:ny };
    });
    // 화면 밖 제거
    updatedPlanets = updatedPlanets.filter(p=> p.y<GAME_HEIGHT+300 && p.x>-300 && p.x<GAME_WIDTH+300);

    // 스폰 (고향 행성 & 일반 행성)
    if(!newState.homePlanetSpawned && newState.distance>=TOTAL_DISTANCE){
      updatedPlanets.push({
        x: Math.random()*(GAME_WIDTH-HOME_PLANET_SIZE),
        y: -HOME_PLANET_SIZE,
        size: HOME_PLANET_SIZE,
        isHome: true,
        speedX: (Math.random()*2-1)*0.3,
        speedY: 1.5 + Math.random()*1
      });
      newState.homePlanetSpawned=true;
    } else {
      if(Math.random()<0.03){
        const px = Math.random()*(GAME_WIDTH-PLANET_BASE_SIZE);
        const py = -PLANET_BASE_SIZE;
        const size = PLANET_BASE_SIZE + Math.random()*20;
        const spx = (Math.random()*2 -1)*0.6;
        const spy = 1.5 + Math.random()*1.5;
        updatedPlanets.push({
          x:px, y:py, size, isHome:false,
          speedX: spx, speedY: spy
        });
      }
    }
    newState.planets = updatedPlanets;

    // 4) 총알
    let updatedBullets = newState.bullets.map(b=>{
      return { ...b, y: b.y - BULLET_SPEED };
    });
    updatedBullets = updatedBullets.filter(b=>b.y>-BULLET_HEIGHT);

    // 5) 폭발
    let updatedExps = newState.explosions.map(ex=>{
      return {...ex, frameIndex: ex.frameIndex+1};
    });
    updatedExps=updatedExps.filter(ex=> ex.frameIndex< imagesRef.current.explosionFrames.length);

    // 충돌
    const rocketBox={ x:newState.rocketX, y:newState.rocketY, width:ROCKET_WIDTH, height:ROCKET_HEIGHT };
    let collisionDetected=false;

    // (A) 총알 vs 행성
    for(let i=updatedPlanets.length-1; i>=0; i--){
      const p= updatedPlanets[i];
      const pBox={ x:p.x, y:p.y, width:p.size, height:p.size };
      for(let j=updatedBullets.length-1; j>=0; j--){
        const b= updatedBullets[j];
        const bBox={ x:b.x, y:b.y, width:BULLET_WIDTH, height:BULLET_HEIGHT };
        const overlap=(
          bBox.x< pBox.x+pBox.width &&
          bBox.x+bBox.width> pBox.x &&
          bBox.y< pBox.y+pBox.height &&
          bBox.y+bBox.height> pBox.y
        );
        if(overlap){
          if(!p.isHome){
            // 행성 파괴
            updatedPlanets.splice(i,1);
            createExplosion(p.x,p.y);
            // 콤보/점수
            increaseCombo();
            const addScore= 10 + newState.combo*5;
            setScore(prev=>prev+addScore);
          }
          updatedBullets.splice(j,1);
          break;
        }
      }
    }

    // (B) 로켓 vs 행성
    updatedPlanets.forEach(p=>{
      const pBox= { x:p.x, y:p.y, width:p.size, height:p.size };
      const overlap=(
        rocketBox.x< pBox.x+pBox.width &&
        rocketBox.x+rocketBox.width> pBox.x &&
        rocketBox.y< pBox.y+pBox.height &&
        rocketBox.y+rocketBox.height> pBox.y
      );
      if(overlap){
        if(p.isHome){
          // 클리어
          newState.isGameOver=true;
          setScore(prev=>prev+Math.floor(newState.distance/10));
          onStageEnd(true);
        } else {
          collisionDetected=true;
        }
      }
    });
    if(collisionDetected){
      newState.isGameOver=true;
      setLives(prev=>{
        const nxt=prev-1;
        if(nxt<=0) onStageEnd(false);
        return Math.max(0,nxt);
      });
    }

    newState.bullets=updatedBullets;
    newState.explosions=updatedExps;
    return newState;
  },[createExplosion,increaseCombo,onStageEnd,setScore,setLives]);

  //
  // ===========[ 그리기 ]===========
  //
  const drawScene = useCallback((ctx, state)=>{
    ctx.clearRect(0,0, GAME_WIDTH, GAME_HEIGHT);

    // 로딩 중
    if(!imagesLoaded){
      ctx.fillStyle='#000';
      ctx.fillRect(0,0,GAME_WIDTH,GAME_HEIGHT);
      ctx.fillStyle='#fff';
      ctx.font='24px Arial';
      ctx.fillText('Loading SVGs...', GAME_WIDTH/2-60, GAME_HEIGHT/2);
      return;
    }

    // 배경
    ctx.fillStyle='#000';
    ctx.fillRect(0,0,GAME_WIDTH,GAME_HEIGHT);

    // 별
    const starImg= imagesRef.current.star;
    if(starImg){
      state.stars.forEach(star=>{
        ctx.drawImage(starImg, star.x, star.y, 12,12);
      });
    }

    // 행성
    const planetImg= imagesRef.current.planet;
    const homeImg= imagesRef.current.homePlanet;
    state.planets.forEach(p=>{
      if(p.isHome){
        if(homeImg){
          ctx.drawImage(homeImg, p.x, p.y, p.size, p.size);
        }
      } else {
        if(planetImg){
          ctx.drawImage(planetImg, p.x, p.y, p.size, p.size);
        }
      }
    });

    // 총알
    const bulletImg= imagesRef.current.bullet;
    if(bulletImg){
      state.bullets.forEach(b=>{
        ctx.drawImage(bulletImg, b.x,b.y, BULLET_WIDTH,BULLET_HEIGHT);
      });
    }

    // 폭발
    const exFrames= imagesRef.current.explosionFrames;
    state.explosions.forEach(ex=>{
      const frIdx= ex.frameIndex;
      if(exFrames[frIdx]){
        ctx.drawImage(exFrames[frIdx], ex.x,ex.y, 50,50);
      }
    });

    // 로켓
    const rocketImg= imagesRef.current.rocket;
    if(rocketImg){
      ctx.drawImage(rocketImg, state.rocketX, state.rocketY, ROCKET_WIDTH,ROCKET_HEIGHT);
    }

    // 라키루키
    const lukiImg= imagesRef.current.lakiluki;
    if(lukiImg){
      const lx= state.rocketX + (ROCKET_WIDTH/2 - LAKILUKI_WIDTH/2);
      const ly= state.rocketY + 5;
      ctx.drawImage(lukiImg, lx, ly);
    }

    // 정보(FPS, Distance, Combo)
    ctx.fillStyle='#fff';
    ctx.font='16px Arial';
    ctx.fillText(`Distance: ${Math.floor(state.distance)}`, 10,20);
    ctx.fillText(`FPS: ${Math.round(fpsRef.current)}`, 10,40);
    ctx.fillText(`Combo: x${state.combo}`, 10,60);

    // 오버레이 (시작 전/게임 오버)
    if(!state.isStarted || state.isGameOver){
      ctx.fillStyle='rgba(0,0,0,0.6)';
      ctx.fillRect(0,0,GAME_WIDTH,GAME_HEIGHT);

      ctx.fillStyle='#fff';
      ctx.font='28px Arial';
      ctx.textAlign='center';

      if(!state.isStarted){
        ctx.fillText('Press SPACE to Start', GAME_WIDTH/2, GAME_HEIGHT/2);
        ctx.fillText('Arrows=Move, Z=Shoot', GAME_WIDTH/2, GAME_HEIGHT/2+40);
      } else {
        // Game Over
        ctx.fillText('Game Over!', GAME_WIDTH/2, GAME_HEIGHT/2-20);
        ctx.fillText(`Distance: ${Math.floor(state.distance)}`, GAME_WIDTH/2, GAME_HEIGHT/2+20);
        ctx.fillText('Press SPACE to Restart', GAME_WIDTH/2, GAME_HEIGHT/2+60);
      }
      ctx.textAlign='start';
    }
  },[imagesLoaded]);

  //
  // ===========[ 메인 루프 ]===========
  //
  useEffect(()=>{
    const ctx= canvasRef.current?.getContext('2d');
    if(!ctx)return;

    let frameId;
    const gameLoop=()=>{
      const now= performance.now();
      const delta= now-lastFrameTimeRef.current;
      lastFrameTimeRef.current= now;
      if(delta>0){
        fpsRef.current= 1000/delta;
      }

      setGameState(prev=>{
        const next= updateGameState(prev);
        gameStateRef.current= next;
        return next;
      });

      drawScene(ctx, gameStateRef.current);
      frameId= requestAnimationFrame(gameLoop);
    };
    frameId= requestAnimationFrame(gameLoop);

    return ()=> cancelAnimationFrame(frameId);
  },[updateGameState, drawScene]);

  // ========[ 렌더(UI) ]========
  return (
    <div 
      style={{ 
        position:'fixed', 
        top:0, left:0, 
        width:'100vw', 
        height:'100vh', 
        overflow:'hidden'
      }}
    >
      <canvas
        ref={canvasRef}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        style={{ 
          background:'#000',
          display:'block'
        }}
      />
      <div 
        style={{ 
          position:'absolute', 
          top:10, 
          left:10, 
          color:'#fff'
        }}
      >
        <h2>Stage 3 - Planet Dodge</h2>
        <p>Score: {score}</p>
        <p>Lives: {lives}</p>
      </div>
    </div>
  );
};

export default Stage3;
