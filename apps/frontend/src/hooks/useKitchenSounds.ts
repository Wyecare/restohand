import { useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface SoundConfig {
  newOrder: string;
  urgent: string;
  completed: string;
  notification: string;
}

const defaultSounds: SoundConfig = {
  // Using data URLs for built-in browser sounds
  newOrder:
    'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhCjmY4Ly6gVkSCjSH3ve4jEkJElW57sSvYCUINpjN6rtmJFkFQZLM3qhjHhI2jdPw2G4jDFWvws/NkCkFKnbL3tdwJhU+ltLh0YdwDgUnc93Q0iYGOYzBxjyehQAKIW1m',
  urgent:
    'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhCjmY4Ly6gVkSCjSH3ve4jEkJElW57sSvYCUINpjN6rtmJFkFQZLM3qhjHhI2jdPw2G4jDFWvws/NkCkFKnbL3tdwJhU+ltLh0YdwDgUnc93Q0iYGOYzBxjyehQAKIW1m',
  completed:
    'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhCjmY4Ly6gVkSCjSH3ve4jEkJElW57sSvYCUINpjN6rtmJFkFQZLM3qhjHhI2jdPw2G4jDFWvws/NkCkFKnbL3tdwJhU+ltLh0YdwDgUnc93Q0iYGOYzBxjyehQAKIW1m',
  notification:
    'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhCjmY4Ly6gVkSCjSH3ve4jEkJElW57sSvYCUINpjN6rtmJFkFQZLM3qhjHhI2jdPw2G4jDFWvws/NkCkFKnbL3tdwJhU+ltLh0YdwDgUnc93Q0iYGOYzBxjyehQAKIW1m',
};

type SoundType = keyof SoundConfig;

export interface KitchenSoundsConfig {
  enabled: boolean;
  volume: number;
  sounds: SoundConfig;
}

export function useKitchenSounds(initialConfig?: Partial<KitchenSoundsConfig>) {
  const { toast } = useToast();
  const [config, setConfig] = useState<KitchenSoundsConfig>({
    enabled: true,
    volume: 0.7,
    sounds: defaultSounds,
    ...initialConfig,
  });

  const [isSupported, setIsSupported] = useState(false);
  const audioRefs = useRef<Map<SoundType, HTMLAudioElement>>(new Map());

  // Initialize audio support check
  useEffect(() => {
    const checkAudioSupport = () => {
      try {
        const audio = new Audio();
        const canPlay = typeof audio.play === 'function';
        setIsSupported(canPlay);
        return canPlay;
      } catch {
        setIsSupported(false);
        return false;
      }
    };

    checkAudioSupport();
  }, []);

  // Initialize audio elements
  useEffect(() => {
    if (!isSupported) return;

    // Clean up existing audio elements
    audioRefs.current.forEach((audio) => {
      audio.pause();
      audio.src = '';
    });
    audioRefs.current.clear();

    // Create new audio elements
    Object.entries(config.sounds).forEach(([type, src]) => {
      try {
        const audio = new Audio(src);
        audio.volume = config.volume;
        audio.preload = 'auto';

        // Handle audio errors
        audio.addEventListener('error', (e) => {
          console.warn(`Failed to load ${type} sound:`, e);
        });

        audioRefs.current.set(type as SoundType, audio);
      } catch (error) {
        console.warn(`Failed to create ${type} audio element:`, error);
      }
    });

    return () => {
      audioRefs.current.forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
      audioRefs.current.clear();
    };
  }, [config.sounds, config.volume, isSupported]);

  // Update volume when config changes
  useEffect(() => {
    audioRefs.current.forEach((audio) => {
      audio.volume = config.volume;
    });
  }, [config.volume]);

  const playSound = useCallback(
    async (type: SoundType, options?: { force?: boolean }) => {
      if (!config.enabled && !options?.force) return;
      if (!isSupported) return;

      const audio = audioRefs.current.get(type);
      if (!audio) return;

      try {
        // Reset audio to beginning
        audio.currentTime = 0;

        // Play the sound
        const playPromise = audio.play();

        if (playPromise !== undefined) {
          await playPromise;
        }
      } catch (error) {
        // Handle autoplay restrictions
        if (error instanceof Error && error.name === 'NotAllowedError') {
          toast({
            title: 'Audio blocked',
            description: 'Please enable audio permissions for sound alerts.',
            variant: 'default',
          });
        } else {
          console.warn(`Failed to play ${type} sound:`, error);
        }
      }
    },
    [config.enabled, isSupported, toast]
  );

  const updateConfig = useCallback((updates: Partial<KitchenSoundsConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const toggleEnabled = useCallback(() => {
    setConfig((prev) => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    setConfig((prev) => ({ ...prev, volume: clampedVolume }));
  }, []);

  const testSound = useCallback(
    (type: SoundType) => {
      playSound(type, { force: true });
    },
    [playSound]
  );

  return {
    config,
    isSupported,
    playSound,
    updateConfig,
    toggleEnabled,
    setVolume,
    testSound,
    sounds: {
      newOrder: () => playSound('newOrder'),
      urgent: () => playSound('urgent'),
      completed: () => playSound('completed'),
      notification: () => playSound('notification'),
    },
  };
}
