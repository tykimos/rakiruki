// src/components/MultiStageGame.js
import React, { useState } from 'react';
import Stage1 from './Stage1';
import Stage2 from './Stage2';
import Stage3 from './Stage3';

const MultiStageGame = () => {
  // 스테이지 구분 (1, 2, 3)
  const [stage, setStage] = useState(1);

  // 공통 상태
  const [score, setScore] = useState(0);    // 점수
  const [lives, setLives] = useState(10);    // 생명

  // 첫 번째 스테이지가 끝날 때 호출
  const handleStage1End = (didWin) => {
    if (didWin) {
      setStage(2);
    } else {
      alert('첫 번째 스테이지에서 패배하였습니다. 게임오버!');
      resetGame();
    }
  };

  // 두 번째 스테이지가 끝날 때 호출
  const handleStage2End = (didWin) => {
    if (didWin) {
      setStage(3);
    } else {
      alert('두 번째 스테이지에서 패배하였습니다. 게임오버!');
      resetGame();
    }
  };

  // 세 번째 스테이지가 끝날 때 호출
  const handleStage3End = (didWin) => {
    if (didWin) {
      alert('세 번째 스테이지까지 클리어! 축하합니다!');
    } else {
      alert('세 번째 스테이지에서 패배하였습니다. 게임오버!');
    }
    resetGame();
  };

  // 게임 리셋 (처음 상태로 돌리기)
  const resetGame = () => {
    setStage(1);
    setScore(0);
    setLives(3);
  };

  return (
    <div>
      {stage === 1 && (
        <Stage1
          score={score}
          setScore={setScore}
          lives={lives}
          setLives={setLives}
          onStageEnd={handleStage1End}
        />
      )}
      {stage === 2 && (
        <Stage2
          score={score}
          setScore={setScore}
          lives={lives}
          setLives={setLives}
          onStageEnd={handleStage2End}
        />
      )}
      {stage === 3 && (
        <Stage3
          score={score}
          setScore={setScore}
          lives={lives}
          setLives={setLives}
          onStageEnd={handleStage3End}
        />
      )}
    </div>
  );
};

export default MultiStageGame;
