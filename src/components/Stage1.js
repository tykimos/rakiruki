// src/components/Stage1.js
import React, { useState, useEffect, useRef } from 'react';

const GRID_SIZE = 19;
const GAME_WIDTH = typeof window !== 'undefined' ? window.innerWidth : 800;
const GAME_HEIGHT = typeof window !== 'undefined' ? window.innerHeight : 600;
const CELL = Math.min(GAME_WIDTH, GAME_HEIGHT) / (GRID_SIZE + 1); // 화면 크기에 맞게 셀 크기 조정
const ANIMALS = 4;
const INTERVAL = 200;
const DIRS = [
  [0, -1], // Up
  [0, 1],  // Down
  [-1, 0], // Left
  [1, 0],  // Right
];
const TYPES = ['mouse', 'fox', 'dog', 'rabbit', 'alien'];
const COLORS = [
  '#90EE90', // cell == 0
  '#228B22', // cell == 1
  '#006400', // cell == 2
  '#4169E1', // cell == 3
  '#8B4513', // cell == 4 (poop color 등으로 활용)
];

// SVG Sprites
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
};

// 맵(2D 배열) 생성
const createMap = () => [
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,0,1,1,3,3,3,1,1,0,1,1,3,3,3,1,1,0,2],
  [2,0,0,0,3,0,0,0,0,0,0,0,0,0,3,0,0,0,2],
  [2,1,1,0,3,0,1,1,1,0,1,1,1,0,3,0,1,1,2],
  [2,0,0,0,3,0,1,3,3,0,3,3,1,0,3,0,0,0,2],
  [2,0,1,1,3,0,1,3,0,0,0,3,1,0,3,1,1,0,2],
  [0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0],
  [2,0,1,1,3,0,1,3,0,0,0,3,1,0,3,1,1,0,2],
  [2,0,0,0,3,0,1,3,3,0,3,3,1,0,3,0,0,0,2],
  [2,1,1,0,3,0,1,1,1,0,1,1,1,0,3,0,1,1,2],
  [2,0,0,0,3,0,0,0,0,0,0,0,0,0,3,0,0,0,2],
  [2,0,1,1,3,3,3,1,1,0,1,1,3,3,3,1,1,0,2],
  [2,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,2],
  [2,1,0,1,0,1,0,1,1,0,1,1,0,1,0,1,0,1,2],
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2]
];

const Stage1 = ({
  score, setScore,  // 상위에서 전달받은 점수
  lives, setLives,  // 상위에서 전달받은 생명
  onStageEnd        // 스테이지 종료 시 호출 (true=클리어, false=실패)
}) => {
  // 스크롤 방지 (컴포넌트 로드시)
  useEffect(() => {
    // body에 overflow:hidden 설정
    document.body.style.overflow = 'hidden';

    // 나갈 때는 원상복귀
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // 게임 상태(점수, 생명은 props로 관리하므로 제외)
  const [state, setState] = useState(() => {
    const map = createMap();
    const getRandomPosition = () => {
      let x, y;
      do {
        x = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
        y = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
      } while (map[y][x] !== 0);
      return { x, y };
    };

    // 똥(poops)은 맵 상에서 cell === 0인 자리에 생성하는 예시
    const poops = map.flatMap((row, y) =>
      row.map((cell, x) => cell === 0 ? { x, y } : null).filter(Boolean)
    );

    return {
      map,
      player: getRandomPosition(),
      animals: Array(ANIMALS).fill(null).map(() => ({
        ...getRandomPosition(),
        type: TYPES[Math.floor(Math.random() * 4)] // mouse, fox, dog, rabbit 중 랜덤
      })),
      poops,
      gameOver: false
    };
  });

  const canvasRef = useRef(null);
  const imgCache = useRef({});

  // SVG 이미지를 로드해서 imgCache에 저장
  useEffect(() => {
    Object.entries(SVG).forEach(([key, svg]) => {
      const img = new Image();
      img.src = `data:image/svg+xml,${encodeURIComponent(`
        <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
          ${svg.split('|').map(p => {
            const [x, y, w, h, f] = p.split(',');
            return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"/>`;
          }).join('')}
        </svg>
      `)}`;
      imgCache.current[key] = img;
    });
  }, []);

  // 키보드 이동 처리, 동물 이동 타이머
  useEffect(() => {
    if (state.gameOver) return;

    // 플레이어 이동
    const handleKey = e => {
      // 방향키 스크롤 방지
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }

      if (state.gameOver) return;
      const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      const idx = arrowKeys.indexOf(e.key);
      if (idx === -1) return;
      const [dx, dy] = DIRS[idx];

      setState(s => {
        const { map, player, poops, animals, gameOver } = s;
        if (gameOver) return s;

        const newX = player.x + dx;
        const newY = player.y + dy;

        // 벽(0이 아닌 지형) 체크
        if (map[newY][newX] !== 0) return s;

        // 똥 먹기 체크
        const newPoops = poops.filter(p => p.x !== newX || p.y !== newY);
        const scoreGain = poops.length - newPoops.length;
        if (scoreGain > 0) {
          setScore(prev => prev + scoreGain);
        }

        // 동물 충돌 체크
        const collided = animals.some(a => a.x === newX && a.y === newY);
        if (collided) {
          // 생명 깎기
          setLives(prev => {
            const nextLives = prev - 1;
            if (nextLives <= 0) {
              onStageEnd(false); // Stage1 패배
              return 0;
            }
            return nextLives;
          });
        }

        return {
          ...s,
          player: { x: newX, y: newY },
          poops: newPoops
        };
      });
    };

    window.addEventListener('keydown', handleKey);

    // 동물 움직임
    const moveAnimals = setInterval(() => {
      setState(s => {
        const { map, player, animals, gameOver } = s;
        if (gameOver) return s;

        const newAnimals = animals.map(a => {
          const possibleMoves = DIRS.filter(([dx, dy]) =>
            map[a.y + dy]?.[a.x + dx] === 0
          );
          if (possibleMoves.length === 0) return a;
          const [dx, dy] = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
          return { ...a, x: a.x + dx, y: a.y + dy };
        });

        // 움직인 뒤 플레이어 충돌 체크
        const collided = newAnimals.some(a => a.x === player.x && a.y === player.y);
        if (collided) {
          setLives(prev => {
            const nextLives = prev - 1;
            if (nextLives <= 0) {
              onStageEnd(false);
              return 0;
            }
            return nextLives;
          });
        }

        return {
          ...s,
          animals: newAnimals
        };
      });
    }, INTERVAL);

    return () => {
      window.removeEventListener('keydown', handleKey);
      clearInterval(moveAnimals);
    };
  }, [state.gameOver, onStageEnd, setLives, setScore]);

  // 캔버스에 그리기
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const drawGame = () => {
      ctx.clearRect(0, 0, GRID_SIZE * CELL, GRID_SIZE * CELL);

      // 맵 그리기
      state.map.forEach((row, y) => {
        row.forEach((cell, x) => {
          ctx.fillStyle = COLORS[cell];
          ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
        });
      });

      // 똥 그리기
      ctx.fillStyle = COLORS[4]; // 예: '#8B4513'
      state.poops.forEach(p => {
        ctx.beginPath();
        ctx.arc((p.x + 0.5) * CELL, (p.y + 0.5) * CELL, CELL / 6, 0, Math.PI * 2);
        ctx.fill();
      });

      // 스프라이트(이미지) 그리는 함수
      const drawImg = (key, x, y) => {
        const img = imgCache.current[key];
        if (img && img.complete) {
          ctx.drawImage(img, x * CELL, y * CELL, CELL, CELL);
        }
      };

      // 플레이어(aliens) 그리기
      drawImg('alien', state.player.x, state.player.y);

      // 동물 그리기
      state.animals.forEach(a => {
        drawImg(a.type, a.x, a.y);
      });
    };

    drawGame();
    
    // 모든 똥을 먹었는지 확인 → 클리어 조건
    if (!state.gameOver && state.poops.length === 0) {
      // 똥을 전부 수집했으므로 스테이지 클리어
      setState(s => ({ ...s, gameOver: true }));
      onStageEnd(true);
    }
  }, [state, onStageEnd]);

  return (
    <div style={{ 
      position: 'relative',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden'
    }}>
      <canvas
        ref={canvasRef}
        width={GRID_SIZE * CELL}
        height={GRID_SIZE * CELL}
        style={{ 
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          border: '1px solid #000'
        }}
      />
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        color: '#000',
        padding: '10px',
        background: 'rgba(255, 255, 255, 0.7)',
        borderRadius: '5px'
      }}>
        <h2>Stage 1</h2>
        <p>Score: {score}</p>
        <p>Lives: {lives}</p>
      </div>
    </div>
  );
};

export default Stage1;
