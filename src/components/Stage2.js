// src/components/Stage2.js

import React, { useState, useEffect, useRef, useCallback } from 'react';

//
// =====================[ 설정 상수들 ]=====================
const GAME_WIDTH = typeof window !== 'undefined' ? window.innerWidth : 800;
const GAME_HEIGHT = typeof window !== 'undefined' ? window.innerHeight : 600;
const GROUND_HEIGHT = GAME_HEIGHT / 8;         // 땅의 높이를 화면 높이에 비례하게 조정
const PLAYER_SIZE = Math.min(GAME_WIDTH, GAME_HEIGHT) / 20;           // 플레이어 캐릭터 크기를 화면 크기에 맞게 조정
const OBSTACLE_SIZE = Math.min(GAME_WIDTH, GAME_HEIGHT) / 20;         // 장애물 크기를 화면 크기에 맞게 조정
const ROCKET_WIDTH = Math.min(GAME_WIDTH, GAME_HEIGHT) / 10;          // 로켓 폭을 화면 크기에 맞게 조정
const ROCKET_HEIGHT = Math.min(GAME_WIDTH, GAME_HEIGHT) / 8;        // 로켓 높이를 화면 크기에 맞게 조정

// 게임 속도/물리
const BASE_SPEED = 5;             // 장애물이 왼쪽으로 이동하는 속도(px/frame)
const GRAVITY = 0.6;              // 매 프레임마다 중력으로 플레이어 속도 증가
const JUMP_INITIAL_VELOCITY = -12;// 점프시 위로 발사되는 초기 속도(px/frame)

// 목표 거리(도달하면 클리어 직전)
const TOTAL_DISTANCE = 15000;      // 5배로 늘림

// SVG 스프라이트
const SVG = {
  alien: `3,4,6,5,#0F0|3,2,6,6,#32CD32|4,4,1,2,#000|7,4,1,2,#000|
    5,6,2,1,#F0F|3,9,2,1,#0F0|7,9,2,1,#0F0`,
  mouse: `3,4,6,5,#b0b0b0|3,2,6,6,#d3d3d3|2,1,2,2,#d3d3d3|8,1,2,2,#d3d3d3|
      4,4,1,1,#000|7,4,1,1,#000|5,6,2,1,#f00|3,9,2,1,#b0b0b0|
      7,9,2,1,#b0b0b0|9,6,1,1,#b0b0b0|10,5,1,1,#b0b0b0`,
  fox: `3,4,6,5,#FFA500|3,2,6,6,#FFD700|2,1,2,2,#FFA500|8,1,2,2,#FFA500|
    4,4,1,2,#000|7,4,1,2,#000|5,6,2,1,#FFC0CB|2,6,2,1,#000|
    8,6,2,1,#000|3,9,2,1,#FFA500|7,9,2,1,#FFA500|9,6,1,3,#FFA500`,
  dog: `3,4,6,5,#8B4513|3,2,6,6,#D2691E|2,2,2,3,#8B4513|8,2,2,3,#8B4513|
    4,4,1,1,#000|7,4,1,1,#000|5,6,2,1,#000|5,7,2,1,#FF69B4|
    3,9,2,1,#8B4513|7,9,2,1,#8B4513|9,5,1,3,#8B4513`,
  rabbit: `3,4,6,5,#FFFFFF|3,2,6,6,#FFFFFF|2,0,2,3,#FFFFFF|8,0,2,3,#FFFFFF|
      4,4,1,1,#FF0000|7,4,1,1,#FF0000|5,5,2,1,#FFC0CB|3,9,2,1,#FFFFFF|
      7,9,2,1,#FFFFFF|9,7,1,1,#FFFFFF`,
  tree: `5,8,2,4,#8B4513|3,3,6,5,#228B22|1,5,10,3,#228B22|2,1,8,4,#228B22`,
  cloud: `2,2,8,2,#FFFFFF|1,3,10,3,#FFFFFF|2,6,8,2,#FFFFFF`,
  // rocket (기존 spaceship SVG 그대로 사용)
  rocket: `1,33,10,3,#C0C0C0|2,30,8,3,#C0C0C0|3,27,6,3,#C0C0C0|3,15,6,12,#C0C0C0|
    4,9,4,6,#C0C0C0|5,3,2,6,#FF0000|1,21,2,6,#00FFFF|9,21,2,6,#00FFFF`
};

//
// =====================[ Stage2 컴포넌트 ]=====================
const Stage2 = ({
  score,
  setScore,      // 상위(부모)에서 전달받은 점수
  lives,
  setLives,      // 상위(부모)에서 전달받은 생명
  onStageEnd     // 스테이지 종료 시 호출 (true=클리어, false=실패)
}) => {

  //
  // ===========[ 내부 State 및 Ref ]===========
  //
  const [gameState, setGameState] = useState({
    isStarted: false,
    isGameOver: false,
    isAscending: false,       // 로켓 탑승 중인지 (상승 애니메이션)
    ascendFrame: 0,           // 로켓 발사 연출 프레임
    rocketInFlight: false,    // 로켓이 실제로 발사되었는지 (장애물 배열에서 제외)
    rocketX: 0,
    rocketY: 0,

    playerY: GAME_HEIGHT - GROUND_HEIGHT - PLAYER_SIZE,
    playerVelocity: 0,
    isJumping: false,
    jumpCount: 0,             // 더블점프까지 가능

    obstacles: [],
    clouds: [],
    distance: 0,              // 달린 거리(px)
    rocketSpawned: false,     // 로켓이 생성되었는지 여부
  });

  // 매 프레임 최신 state를 즉시 참조하기 위한 ref
  const gameStateRef = useRef(gameState);

  // canvas, images
  const canvasRef = useRef(null);
  const imagesRef = useRef({});

  // animationFrame ID
  const animationRef = useRef(null);

  // FPS 계산용
  const lastFrameTimeRef = useRef(performance.now());
  const fpsRef = useRef(0);

  //
  // ===========[ SVG 이미지 로딩 ]===========
  //
  useEffect(() => {
    Object.entries(SVG).forEach(([key, svg]) => {
      const img = new Image();
      img.src = `data:image/svg+xml,${encodeURIComponent(`
        <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
          ${svg
            .split('|')
            .map((p) => {
              const [x, y, w, h, f] = p.split(',');
              return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"/>`;
            })
            .join('')}
        </svg>
      `)}`;
      imagesRef.current[key] = img;
    });
  }, []);

  //
  // ===========[ 시작/재시작 로직 ]===========
  //
  const startOrRestartGame = useCallback(() => {
    setGameState({
      isStarted: true,
      isGameOver: false,
      isAscending: false,
      ascendFrame: 0,
      rocketInFlight: false,
      rocketX: 0,
      rocketY: 0,

      playerY: GAME_HEIGHT - GROUND_HEIGHT - PLAYER_SIZE,
      playerVelocity: 0,
      isJumping: false,
      jumpCount: 0,

      obstacles: [],
      clouds: [],
      distance: 0,
      rocketSpawned: false,
    });
  }, []);

  //
  // ===========[ 점프(키보드/터치) ]===========
  //
  const jump = useCallback(() => {
    setGameState((prev) => {
      if (prev.jumpCount >= 2 || prev.isAscending) return prev;
      return {
        ...prev,
        isJumping: true,
        jumpCount: prev.jumpCount + 1,
        playerVelocity: JUMP_INITIAL_VELOCITY,
      };
    });
  }, []);

  // 키보드/터치 이벤트
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        if (!gameStateRef.current.isStarted || gameStateRef.current.isGameOver) {
          startOrRestartGame();
        } else {
          jump();
        }
      }
    };

    const handleTouch = () => {
      if (!gameStateRef.current.isStarted || gameStateRef.current.isGameOver) {
        startOrRestartGame();
      } else {
        jump();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    canvasRef.current?.addEventListener('touchstart', handleTouch);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      canvasRef.current?.removeEventListener('touchstart', handleTouch);
    };
  }, [jump, startOrRestartGame]);

  //
  // ===========[ 매 프레임 상태 업데이트(1) - 이동/충돌 등 ]===========
  //
  const updateGameState = useCallback((prev) => {
    if (!prev.isStarted || prev.isGameOver || prev.isAscending) {
      return prev;
    }

    const newState = { ...prev };

    // 1) 이동 거리 증가
    newState.distance += BASE_SPEED;

    // 2) 중력/점프
    const groundY = GAME_HEIGHT - GROUND_HEIGHT - PLAYER_SIZE;
    if (newState.playerY < groundY || newState.isJumping) {
      newState.playerVelocity += GRAVITY;
    }
    newState.playerY += newState.playerVelocity;

    if (newState.playerY >= groundY) {
      newState.playerY = groundY;
      newState.playerVelocity = 0;
      newState.isJumping = false;
      newState.jumpCount = 0;
    }

    // 3) 장애물 이동/생성
    const updatedObstacles = newState.obstacles
      .map((obs) => ({ ...obs, x: obs.x - obs.speed }))
      .filter((obs) => obs.x > -200);

    // 로켓 등장 조건
    if (newState.distance >= TOTAL_DISTANCE - 2000 && !newState.rocketSpawned) {
      updatedObstacles.push({
        x: GAME_WIDTH + 20,
        type: 'rocket',
        speed: BASE_SPEED,
      });
      newState.rocketSpawned = true;
    } else {
      // 일반 장애물
      const lastObs = updatedObstacles[updatedObstacles.length - 1];
      if (
        !newState.rocketSpawned &&
        (updatedObstacles.length === 0 || (lastObs && lastObs.x < GAME_WIDTH - 300))
      ) {
        const isAnimal = Math.random() < 0.5;
        let type = 'tree';
        let speed = BASE_SPEED;

        if (isAnimal) {
          const animals = ['mouse', 'fox', 'dog', 'rabbit'];
          type = animals[Math.floor(Math.random() * animals.length)];
          speed = BASE_SPEED * (0.8 + Math.random() * 0.4);
        }
        updatedObstacles.push({ x: GAME_WIDTH, type, speed });
      }
    }

    newState.obstacles = updatedObstacles;

    // 4) 구름 이동/생성
    const updatedClouds = newState.clouds
      .map((cloud) => ({ ...cloud, x: cloud.x - BASE_SPEED * 0.3 }))
      .filter((cloud) => cloud.x > -100);

    const lastCloud = updatedClouds[updatedClouds.length - 1];
    if (!lastCloud || lastCloud.x < GAME_WIDTH - 200) {
      updatedClouds.push({
        x: GAME_WIDTH,
        y: Math.random() * (GAME_HEIGHT / 2),
        size: 50 + Math.random() * 50,
      });
    }
    newState.clouds = updatedClouds;

    // 5) 충돌 판정
    const playerHitbox = {
      x: GAME_WIDTH / 3 + 5,
      y: newState.playerY + 5,
      width: PLAYER_SIZE - 10,
      height: PLAYER_SIZE - 10,
    };

    let collidedRocketObj = null;
    let normalCollision = false;

    // 장애물 충돌 검사
    updatedObstacles.forEach((obs) => {
      let obstacleY = GAME_HEIGHT - GROUND_HEIGHT - OBSTACLE_SIZE;
      let obstacleW = OBSTACLE_SIZE;
      let obstacleH = OBSTACLE_SIZE;

      if (obs.type === 'rocket') {
        obstacleW = ROCKET_WIDTH;
        obstacleH = ROCKET_HEIGHT;
        obstacleY = GAME_HEIGHT - GROUND_HEIGHT - ROCKET_HEIGHT;
      }

      const overlap =
        playerHitbox.x < obs.x + obstacleW &&
        playerHitbox.x + playerHitbox.width > obs.x &&
        playerHitbox.y < obstacleY + obstacleH &&
        playerHitbox.y + playerHitbox.height > obstacleY;

      if (overlap) {
        if (obs.type === 'rocket') {
          collidedRocketObj = obs;
        } else {
          normalCollision = true;
        }
      }
    });

    if (collidedRocketObj) {
      // 로켓 충돌 => 로켓 탑승
      newState.isAscending = true;
      newState.rocketInFlight = true;
      newState.rocketX = collidedRocketObj.x;
      newState.rocketY = GAME_HEIGHT - GROUND_HEIGHT - ROCKET_HEIGHT;

      // 장애물 배열에서 로켓 제거 (이미 탑승했으니)
      newState.obstacles = updatedObstacles.filter(
        (o) => o !== collidedRocketObj
      );
    } else if (normalCollision) {
      // 일반 장애물 충돌 => GameOver
      newState.isGameOver = true;
      setLives((prevLives) => {
        const next = prevLives - 1;
        if (next <= 0) {
          onStageEnd(false);
        }
        return Math.max(0, next);
      });
    }

    return newState;
  }, [onStageEnd, setLives]);

  //
  // ===========[ 매 프레임 상태 업데이트(2) - 로켓 탑승/발사 애니메이션 ]===========
  //
  const updateAscending = useCallback((prev) => {
    if (!prev.isAscending || !prev.rocketInFlight) return prev;

    const newState = { ...prev };
    newState.ascendFrame += 1;

    // 로켓과 플레이어 동시 상승
    newState.rocketY -= 2; // 로켓이 위로
    // 플레이어는 로켓 상단에 붙어 있다고 가정
    newState.playerY = newState.rocketY + (ROCKET_HEIGHT - PLAYER_SIZE);

    // 일정 프레임 뒤 발사 완료 => Stage 이동
    if (newState.ascendFrame > 200) {
      newState.isGameOver = true;
      // 로켓 탑승에 성공했으므로 거리 점수 반영
      setScore((prevScore) => prevScore + Math.floor(newState.distance / 10));
      onStageEnd(true);
    }

    return newState;
  }, [onStageEnd, setScore]);

  //
  // ===========[ 실제 Canvas에 그리는 함수 ]===========
  //
  const drawScene = useCallback((ctx, state) => {
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 배경 (하늘)
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT - GROUND_HEIGHT);

    // 구름
    state.clouds.forEach((cloud) => {
      const img = imagesRef.current.cloud;
      if (img && img.complete) {
        ctx.drawImage(img, cloud.x, cloud.y, cloud.size, cloud.size * 0.5);
      }
    });

    // 땅
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, GAME_HEIGHT - GROUND_HEIGHT, GAME_WIDTH, GROUND_HEIGHT);

    // 플레이어 (alien)
    const alienImg = imagesRef.current.alien;
    if (alienImg && alienImg.complete) {
      ctx.drawImage(
        alienImg,
        GAME_WIDTH / 3,
        state.playerY,
        PLAYER_SIZE,
        PLAYER_SIZE
      );
    }

    // 장애물 (나무/동물)
    state.obstacles.forEach((obs) => {
      const obsImg = imagesRef.current[obs.type];
      if (!obsImg || !obsImg.complete) return;

      if (obs.type === 'rocket') {
        // 만약 '탑승하지 않은 로켓'이 화면에 남아있다면 이쪽에서 그림
        // (그렇지만 예제에서는 탑승 시 배열에서 제거했으므로 실제로는 안 그려질 것)
        const drawY = GAME_HEIGHT - GROUND_HEIGHT - ROCKET_HEIGHT;
        ctx.drawImage(obsImg, obs.x, drawY, ROCKET_WIDTH, ROCKET_HEIGHT);
      } else {
        // 나무/동물
        let drawY = GAME_HEIGHT - GROUND_HEIGHT - OBSTACLE_SIZE;
        ctx.drawImage(obsImg, obs.x, drawY, OBSTACLE_SIZE, OBSTACLE_SIZE);
      }
    });

    // 로켓 발사(탑승) 중이면, 별도로 로켓을 그림
    if (state.rocketInFlight) {
      const rocketImg = imagesRef.current.rocket;
      if (rocketImg && rocketImg.complete) {
        ctx.drawImage(
          rocketImg,
          state.rocketX,
          state.rocketY,
          ROCKET_WIDTH,
          ROCKET_HEIGHT
        );

        // 간단한 불꽃(Flame) 효과 (아래쪽)
        ctx.save();
        // 불꽃 크기를 간단히 애니메이션
        const flameOsc = 10 * Math.sin(state.ascendFrame / 5);
        const flameWidth = 20 + flameOsc;
        const flameHeight = 30 + flameOsc;

        ctx.fillStyle = '#FF4500';
        ctx.beginPath();
        // 로켓 중심 아래쪽
        const flameX = state.rocketX + ROCKET_WIDTH / 2 - flameWidth / 2;
        const flameY = state.rocketY + ROCKET_HEIGHT;
        ctx.ellipse(
          flameX + flameWidth / 2, // cx
          flameY + flameHeight / 2, // cy
          flameWidth / 2, // rx
          flameHeight / 2, // ry
          0, 0, 2 * Math.PI
        );
        ctx.fill();
        ctx.restore();
      }
    }

    // 오버레이 (시작 전 / 게임 오버 / Ascending 중)
    if (!state.isStarted || state.isGameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      ctx.fillStyle = '#FFF';
      ctx.font = '30px Arial';

      if (!state.isStarted) {
        // 시작 전
        ctx.fillText(
          'Press Space or Touch to Start',
          GAME_WIDTH / 2 - 180,
          GAME_HEIGHT / 2
        );
      } else {
        if (!state.isAscending) {
          // 일반 Game Over
          ctx.fillText('Game Over!', GAME_WIDTH / 2 - 70, GAME_HEIGHT / 2 - 30);
          ctx.fillText(
            `Distance: ${Math.floor(state.distance)}px`,
            GAME_WIDTH / 2 - 70,
            GAME_HEIGHT / 2 + 20
          );
          ctx.fillText(
            'Press Space or Touch to Restart',
            GAME_WIDTH / 2 - 180,
            GAME_HEIGHT / 2 + 70
          );
        } else {
          // 로켓 탑승 & 발사 중
          ctx.fillText('Taking off...', GAME_WIDTH / 2 - 70, GAME_HEIGHT / 2);
        }
      }
    } else {
      // 진행 중 (거리, FPS)
      ctx.fillStyle = '#000';
      ctx.font = '20px Arial';
      ctx.fillText(`Distance: ${Math.floor(state.distance)}px`, 10, 30);
      ctx.fillText(`FPS: ${Math.round(fpsRef.current)}`, 10, 60);
    }
  }, []);

  //
  // ===========[ 게임 루프 (requestAnimationFrame) ]===========
  //
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    let frameId;

    const gameLoop = () => {
      const now = performance.now();
      const delta = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      if (delta > 0) {
        fpsRef.current = 1000 / delta;
      }

      // 업데이트
      setGameState((prev) => {
        let nextState = updateGameState(prev);
        nextState = updateAscending(nextState);
        gameStateRef.current = nextState;
        return nextState;
      });

      // 그리기
      drawScene(ctx, gameStateRef.current);

      frameId = requestAnimationFrame(gameLoop);
    };

    frameId = requestAnimationFrame(gameLoop);

    return () => cancelAnimationFrame(frameId);
  }, [updateGameState, updateAscending, drawScene]);

  //
  // ===========[ 렌더: Canvas + UI ]===========
  //
  return (
    <div style={{ 
      position: 'relative',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden'
    }}>
      <canvas
        ref={canvasRef}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        style={{
          position: 'absolute',
          top: '0',
          left: '0',
          backgroundColor: '#000',
        }}
      />
      {/* 상단 고정 UI (점수, 생명 등) */}
      <div style={{ 
        position: 'absolute', 
        top: '10px', 
        left: '10px', 
        color: '#fff',
        padding: '10px',
        background: 'rgba(0, 0, 0, 0.5)',
        borderRadius: '5px'
      }}>
        <h2>Stage 2</h2>
        <p>Score: {score}</p>
        <p>Lives: {lives}</p>
      </div>
    </div>
  );
};

export default Stage2;
