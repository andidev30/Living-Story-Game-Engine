
export interface StoryState {
  genre: string;
  tone: string;
  playerRole: string;
  history: { role: 'user' | 'model'; content: string }[];
  currentScene?: string;
  currentActions?: string;
  currentChoices?: string[];
  visualUrl?: string;
  isInitialSetup: boolean;
  isLoading: boolean;
}

export enum AppStatus {
  SETUP = 'SETUP',
  PLAYING = 'PLAYING',
  VOICE_MODE = 'VOICE_MODE',
}

export interface GroundingSource {
  title: string;
  uri: string;
}
