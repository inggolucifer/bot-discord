'use client';

import { useState } from 'react';
import GlobalChat from './GlobalChat';
import PlayerProfileModal from './PlayerProfileModal';

export default function GlobalChatWrapper() {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  return (
    <>
      <GlobalChat onPlayerClick={(id) => setSelectedPlayerId(id)} />
      {selectedPlayerId && (
        <PlayerProfileModal
            discordId={selectedPlayerId}
            onClose={() => setSelectedPlayerId(null)}
        />
      )}
    </>
  );
}
