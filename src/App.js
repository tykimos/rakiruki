import React, { useState, useEffect, useRef } from 'react';

const GRID_SIZE = 19, CELL = 30, ANIMALS = 4, INTERVAL = 200, MAX_LIVES = 3;
const DIRS = [[0,-1], [0,1], [-1,0], [1,0]];
const TYPES = ['mouse', 'fox', 'dog', 'rabbit', 'alien'];
const COLORS = ['#90EE90', '#228B22', '#006400', '#4169E1', '#8B4513'];
const SVG = {
  alien: "3,4,6,5,#0F0|3,2,6,6,#32CD32|4,4,1,2,#000|7,4,1,2,#000|5,6,2,1,#F0F|3,9,2,1,#0F0|7,9,2,1,#0F0|3,1,1,1,#0F0|8,1,1,1,#0F0",
  mouse: "3,4,6,5,#b0b0b0|3,2,6,6,#d3d3d3|2,1,2,2,#d3d3d3|8,1,2,2,#d3d3d3|4,4,1,1,#000|7,4,1,1,#000|5,6,2,1,#f00|3,9,2,1,#b0b0b0|7,9,2,1,#b0b0b0|9,6,1,1,#b0b0b0|10,5,1,1,#b0b0b0",
  fox: "3,4,6,5,#FFA500|3,2,6,6,#FFD700|2,1,2,2,#FFA500|8,1,2,2,#FFA500|4,4,1,2,#000|7,4,1,2,#000|5,6,2,1,#FFC0CB|2,6,2,1,#000|8,6,2,1,#000|3,9,2,1,#FFA500|7,9,2,1,#FFA500|9,6,1,3,#FFA500",
  dog: "3,4,6,5,#8B4513|3,2,6,6,#D2691E|2,2,2,3,#8B4513|8,2,2,3,#8B4513|4,4,1,1,#000|7,4,1,1,#000|5,6,2,1,#000|5,7,2,1,#FF69B4|3,9,2,1,#8B4513|7,9,2,1,#8B4513|9,5,1,3,#8B4513",
  rabbit: "3,4,6,5,#FFFFFF|3,2,6,6,#FFFFFF|2,0,2,3,#FFFFFF|8,0,2,3,#FFFFFF|4,4,1,1,#FF0000|7,4,1,1,#FF0000|5,5,2,1,#FFC0CB|3,9,2,1,#FFFFFF|7,9,2,1,#FFFFFF|9,7,1,1,#FFFFFF"
};

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

const Game = () => {
  const [state, setState] = useState(() => {
    const map = createMap();
    const getRandomPosition = () => {
      let x, y;
      do { x = Math.floor(Math.random() * (GRID_SIZE-2)) + 1; y = Math.floor(Math.random() * (GRID_SIZE-2)) + 1; } while (map[y][x] !== 0);
      return {x, y};
    };
    return {
      map,
      player: getRandomPosition(),
      animals: Array(ANIMALS).fill().map(() => ({ ...getRandomPosition(), type: TYPES[Math.floor(Math.random() * 4)] })),
      poops: map.flatMap((row, y) => row.map((cell, x) => cell === 0 ? {x, y} : null).filter(Boolean)),
      score: 0,
      lives: MAX_LIVES,
      gameOver: false
    };
  });

  const canvasRef = useRef(null);
  const imgCache = useRef({});

  useEffect(() => {
    Object.entries(SVG).forEach(([key, svg]) => {
      const img = new Image();
      img.src = `data:image/svg+xml,${encodeURIComponent(`<svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">${svg.split('|').map(p => {const [x,y,w,h,f]=p.split(',');return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"/>`}).join('')}</svg>`)}`;
      imgCache.current[key] = img;
    });

    const handleKey = e => setState(s => {
      if (s.gameOver) return s;
      const dir = DIRS[['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.key)];
      if (!dir) return s;
      const [dx, dy] = dir, newX = s.player.x + dx, newY = s.player.y + dy;
      if (s.map[newY][newX] !== 0) return s;
      const newPoops = s.poops.filter(p => p.x !== newX || p.y !== newY);
      const score = s.score + (s.poops.length - newPoops.length);
      const collision = s.animals.some(a => a.x === newX && a.y === newY);
      if (collision) {
        const lives = s.lives - 1;
        return { ...s, player: {x: newX, y: newY}, poops: newPoops, score, lives, gameOver: lives <= 0 };
      }
      return { ...s, player: {x: newX, y: newY}, poops: newPoops, score, gameOver: newPoops.length === 0 };
    });

    window.addEventListener('keydown', handleKey);
    const moveAnimals = setInterval(() => setState(s => {
      const newAnimals = s.animals.map(a => {
        const moves = DIRS.filter(([dx, dy]) => s.map[a.y + dy]?.[a.x + dx] === 0);
        if (moves.length === 0) return a;
        const [dx, dy] = moves[Math.floor(Math.random() * moves.length)];
        return { ...a, x: a.x + dx, y: a.y + dy };
      });
      const collision = newAnimals.some(a => a.x === s.player.x && a.y === s.player.y);
      if (collision) {
        const lives = s.lives - 1;
        return { ...s, animals: newAnimals, lives, gameOver: lives <= 0 };
      }
      return { ...s, animals: newAnimals };
    }), INTERVAL);

    return () => { window.removeEventListener('keydown', handleKey); clearInterval(moveAnimals); };
  }, []);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const drawGame = () => {
      ctx.clearRect(0, 0, GRID_SIZE * CELL, GRID_SIZE * CELL);
      state.map.forEach((row, y) => row.forEach((cell, x) => { ctx.fillStyle = COLORS[cell]; ctx.fillRect(x * CELL, y * CELL, CELL, CELL); }));
      ctx.fillStyle = COLORS[4];
      state.poops.forEach(p => { ctx.beginPath(); ctx.arc((p.x + 0.5) * CELL, (p.y + 0.5) * CELL, CELL / 6, 0, 2 * Math.PI); ctx.fill(); });
      const drawImg = (key, x, y) => { const img = imgCache.current[key]; if (img?.complete) ctx.drawImage(img, x * CELL, y * CELL, CELL, CELL); };
      drawImg('alien', state.player.x, state.player.y);
      state.animals.forEach(a => drawImg(a.type, a.x, a.y));
      if (state.gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, GRID_SIZE * CELL, GRID_SIZE * CELL);
        ctx.fillStyle = '#FFF';
        ctx.font = '30px Arial';
        ctx.fillText(state.lives > 0 ? 'You Win!' : 'Game Over', GRID_SIZE * CELL / 2 - 70, GRID_SIZE * CELL / 2);
      }
    };
    drawGame();
    if (!state.gameOver) requestAnimationFrame(drawGame);
  }, [state]);

  return (
    <div style={{display: 'flex', justifyContent: 'center', alignItems: 'start', padding: '20px', fontFamily: 'Comic Sans MS, cursive'}}>
      <canvas ref={canvasRef} width={GRID_SIZE * CELL} height={GRID_SIZE * CELL} />
      <div style={{marginLeft: '20px', padding: '20px', background: 'linear-gradient(145deg, #FFD700, #FFA500)', borderRadius: '15px', boxShadow: '0 8px 16px rgba(0,0,0,0.2)', color: '#006400'}}>
        <h2 style={{margin: '0 0 15px', textAlign: 'center', textShadow: '2px 2px 4px rgba(0,0,0,0.2)'}}>라키루키의 똥 수집</h2>
        <p style={{fontSize: '24px', fontWeight: 'bold', textAlign: 'center', margin: '10px 0'}}>점수: {state.score}</p>
        <div style={{display: 'flex', justifyContent: 'center', gap: '5px', margin: '15px 0'}}>
          {[...Array(state.lives)].map((_, i) => (
            <div key={i} dangerouslySetInnerHTML={{__html: `<svg viewBox="0 0 12 12" width="30" height="30">${SVG.alien.split('|').map(p => {const [x,y,w,h,f]=p.split(',');return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"/>`}).join('')}</svg>`}} />
          ))}
        </div>
        {state.gameOver && <button onClick={() => window.location.reload()} style={{display: 'block', width: '100%', padding: '10px', fontSize: '18px', fontWeight: 'bold', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', transition: 'background 0.3s'}} onMouseOver={e => e.target.style.background = '#45a049'} onMouseOut={e => e.target.style.background = '#4CAF50'}>다시 시작</button>}
      </div>
    </div>
  );
};

export default Game;