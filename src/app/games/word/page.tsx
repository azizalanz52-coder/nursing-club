'use client';

import React from 'react';
import GameScreen from '../../components/games/GameScreen';
import WordChallenge from '../../components/games/WordChallenge';

export default function WordGamePage() {
  return (
    <GameScreen title="تحدي الكلمة" subtitle="في المجال الصحي" game="word" loginNext="/games/word">
      {(player, onPlayed) => <WordChallenge phone={player.phone} name={player.name} onPlayed={onPlayed} />}
    </GameScreen>
  );
}
