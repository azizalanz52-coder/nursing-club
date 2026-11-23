'use client';

import React from 'react';
import GameScreen from '../../components/games/GameScreen';
import MinuteQuiz from '../../components/games/MinuteQuiz';

export default function QuizGamePage() {
  return (
    <GameScreen title="دقيقة إسعاف" game="quiz" loginNext="/games/quiz">
      {(player, onPlayed) => (
        <div className="rounded-[2rem] bg-[#fff6d6] p-5 text-[#1a0208]">
          <MinuteQuiz phone={player.phone} name={player.name} onPlayed={onPlayed} />
        </div>
      )}
    </GameScreen>
  );
}
