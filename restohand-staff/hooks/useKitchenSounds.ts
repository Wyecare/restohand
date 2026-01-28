import { useState, useCallback } from 'react';
import SoundPlayer from 'react-native-sound-player';

interface SoundConfig {
  enabled: boolean;
  volume: number;
}

interface KitchenSounds {
  newOrder: () => void;
  urgent: () => void;
  notification: () => void;
}

export const useKitchenSounds = () => {
  const [config, setConfig] = useState<SoundConfig>({
    enabled: true,
    volume: 0.8,
  });

  const playSound = useCallback((soundName: string) => {
    if (!config.enabled) return;

    try {
      // In a real app, you would have actual sound files
      // For demo purposes, we'll use the system notification sound
      SoundPlayer.playSoundFile('default', 'mp3');
    } catch (error) {
      console.log('Sound playback failed:', error);
    }
  }, [config.enabled]);

  const sounds: KitchenSounds = {
    newOrder: () => playSound('new-order'),
    urgent: () => playSound('urgent'),
    notification: () => playSound('notification'),
  };

  const toggleEnabled = useCallback(() => {
    setConfig(prev => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    setConfig(prev => ({ ...prev, volume: Math.max(0, Math.min(1, volume)) }));
  }, []);

  return {
    config,
    sounds,
    toggleEnabled,
    setVolume,
  };
};