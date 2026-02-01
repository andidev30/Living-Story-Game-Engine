
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppStatus, StoryState } from './types';
import * as gemini from './geminiService';
import { decodeAudioData, decode } from './audioUtils';

// Sub-components
const LoadingOverlay: React.FC<{ message: string }> = ({ message }) => (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
    <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
    <p className="text-amber-200 font-cinzel text-xl animate-pulse">{message}</p>
  </div>
);

const ChoiceButton: React.FC<{ choice: string; onClick: () => void; disabled: boolean }> = ({ choice, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="group relative w-full p-4 mb-3 text-left transition-all duration-300 glass-panel hover:bg-amber-500/10 border border-white/10 hover:border-amber-500/50 rounded-lg group disabled:opacity-50"
  >
    <div className="flex items-center space-x-4">
      <span className="text-amber-500 font-cinzel text-lg">›</span>
      <span className="text-slate-200 group-hover:text-amber-100">{choice}</span>
    </div>
  </button>
);

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.SETUP);
  const [state, setState] = useState<StoryState>({
    genre: '',
    tone: '',
    playerRole: '',
    history: [],
    isInitialSetup: true,
    isLoading: false,
  });
  const [loadingMessage, setLoadingMessage] = useState('Initializing Engine...');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState(prev => ({ ...prev, isLoading: true }));
    setLoadingMessage('Weaving the threads of destiny...');
    
    const initialPrompt = `Initialize a new game. Genre: ${state.genre}. Tone: ${state.tone}. My role: ${state.playerRole}. Start the first scene.`;
    
    try {
      const storyText = await gemini.generateStoryContent(initialPrompt, []);
      parseAndSetStory(storyText || "", []);
      setStatus(AppStatus.PLAYING);
    } catch (error) {
      console.error(error);
      alert("Error starting game. Check console.");
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const parseAndSetStory = async (text: string, newHistory: any[]) => {
    const sceneMatch = text.match(/\[SCENE\]([\s\S]*?)(?=\[CHARACTER ACTIONS\]|\[CHOICES\]|$)/);
    const actionsMatch = text.match(/\[CHARACTER ACTIONS\]([\s\S]*?)(?=\[CHOICES\]|$)/);
    const choicesMatch = text.match(/\[CHOICES\]([\s\S]*?)$/);

    const scene = sceneMatch ? sceneMatch[1].trim() : "The void stretches before you.";
    const actions = actionsMatch ? actionsMatch[1].trim() : "";
    const choices = choicesMatch 
      ? choicesMatch[1].trim().split('\n').filter(c => c.trim().length > 0).map(c => c.replace(/^\d+\.\s*/, '').trim())
      : ["Search for meaning...", "Call out to the darkness..."];

    setState(prev => ({
      ...prev,
      currentScene: scene,
      currentActions: actions,
      currentChoices: choices,
      history: [...newHistory, { role: 'model', content: text }],
    }));

    // Generate visuals asynchronously
    gemini.generateSceneImage(scene).then(url => {
      if (url) setState(prev => ({ ...prev, visualUrl: url }));
    });
  };

  const handleChoice = async (choice: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    setLoadingMessage('Calculating ripples in the timeline...');
    setVideoUrl(null);

    const newHistory = [...state.history, { role: 'user', content: choice }];
    
    try {
      const response = await gemini.generateStoryContent(choice, newHistory);
      await parseAndSetStory(response || "", newHistory);
    } catch (error) {
      console.error(error);
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const playNarration = async () => {
    if (!state.currentScene) return;
    initAudio();
    setState(prev => ({ ...prev, isLoading: true }));
    setLoadingMessage('Summoning the narrator...');
    try {
        const audioData = await gemini.generateNarration(state.currentScene);
        if (audioData && audioContextRef.current) {
            const buffer = await decodeAudioData(decode(audioData), audioContextRef.current, 24000, 1);
            const source = audioContextRef.current.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContextRef.current.destination);
            source.start();
        }
    } catch (e) {
        console.error(e);
    } finally {
        setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const createVideoMemory = async () => {
      if (!state.currentScene) return;
      setState(prev => ({ ...prev, isLoading: true }));
      setLoadingMessage('Rendering cinematic memory (this may take a minute)...');
      try {
          const url = await gemini.generateVideoMemory(state.currentScene);
          if (url) setVideoUrl(url);
      } catch (e) {
          console.error(e);
          alert("Video generation failed. Ensure your API key has Veo access.");
      } finally {
          setState(prev => ({ ...prev, isLoading: false }));
      }
  };

  if (status === AppStatus.SETUP) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-black to-black">
        <div className="max-w-xl w-full glass-panel p-8 rounded-2xl border-amber-500/20 shadow-2xl fade-in">
          <h1 className="text-4xl font-cinzel text-center text-amber-500 mb-2 tracking-widest">CHRONICLE</h1>
          <p className="text-slate-400 text-center mb-8 italic">The Living Story Engine</p>
          
          <form onSubmit={handleSetupSubmit} className="space-y-6">
            <div>
              <label className="block text-amber-200/70 text-sm font-cinzel mb-2">Preferred Genre</label>
              <input 
                type="text" 
                placeholder="e.g. Cyberpunk Noir, High Fantasy, Space Opera"
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 focus:outline-none focus:border-amber-500/50 transition-colors"
                value={state.genre}
                onChange={e => setState({...state, genre: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-amber-200/70 text-sm font-cinzel mb-2">Narrative Tone</label>
              <select 
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 focus:outline-none focus:border-amber-500/50 transition-colors"
                value={state.tone}
                onChange={e => setState({...state, tone: e.target.value})}
                required
              >
                <option value="">Select Tone...</option>
                <option value="Hopeful & Heroic">Hopeful & Heroic</option>
                <option value="Dark & Gritty">Dark & Gritty</option>
                <option value="Mysterious & Eerie">Mysterious & Eerie</option>
                <option value="Tragic & Poetic">Tragic & Poetic</option>
                <option value="Whimsical & Strange">Whimsical & Strange</option>
              </select>
            </div>
            <div>
              <label className="block text-amber-200/70 text-sm font-cinzel mb-2">Your Identity</label>
              <input 
                type="text" 
                placeholder="e.g. A disgraced royal, A rogue AI, A lonely cartographer"
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 focus:outline-none focus:border-amber-500/50 transition-colors"
                value={state.playerRole}
                onChange={e => setState({...state, playerRole: e.target.value})}
                required
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-cinzel py-4 rounded-lg transition-all shadow-lg hover:shadow-amber-500/20 active:scale-95"
            >
              Begin Your Chronicle
            </button>
          </form>
        </div>
        {state.isLoading && <LoadingOverlay message={loadingMessage} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col md:flex-row overflow-hidden">
      {state.isLoading && <LoadingOverlay message={loadingMessage} />}

      {/* Visual Side */}
      <div className="w-full md:w-1/2 h-[40vh] md:h-screen relative overflow-hidden group">
        {videoUrl ? (
            <video 
                src={videoUrl} 
                autoPlay 
                loop 
                className="absolute inset-0 w-full h-full object-cover"
            />
        ) : (
            <img 
                src={state.visualUrl || 'https://picsum.photos/1920/1080?blur=5'} 
                alt="Scene" 
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ${state.isLoading ? 'scale-110 blur-sm' : 'scale-100 blur-0'}`}
            />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30 pointer-events-none" />
        
        <div className="absolute bottom-8 left-8 right-8 flex gap-4">
            <button 
                onClick={playNarration}
                className="bg-black/40 hover:bg-amber-500/80 backdrop-blur-md text-white p-3 rounded-full border border-white/20 transition-all hover:scale-110"
                title="Narration"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
            </button>
            <button 
                onClick={createVideoMemory}
                className="bg-black/40 hover:bg-amber-500/80 backdrop-blur-md text-white px-6 py-2 rounded-full border border-white/20 transition-all hover:scale-105 flex items-center gap-2 font-cinzel"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                Visualize Memory
            </button>
        </div>
      </div>

      {/* Story Side */}
      <div className="w-full md:w-1/2 h-[60vh] md:h-screen flex flex-col p-6 md:p-12 overflow-y-auto bg-zinc-950">
        <div className="max-w-2xl mx-auto w-full mb-12 fade-in">
          <div className="mb-8">
            <h2 className="text-xs font-cinzel text-amber-500/70 tracking-[0.3em] mb-4">THE SCENE</h2>
            <div className="font-playfair text-xl md:text-2xl leading-relaxed text-slate-100 first-letter:text-5xl first-letter:font-cinzel first-letter:mr-3 first-letter:float-left first-letter:text-amber-500">
              {state.currentScene}
            </div>
          </div>

          {state.currentActions && (
            <div className="mb-8 p-6 border-l-2 border-amber-500/30 bg-amber-500/5 italic text-slate-400 leading-relaxed">
              <h3 className="text-xs font-cinzel text-amber-500/50 tracking-widest mb-2 not-italic">REACTIONS</h3>
              {state.currentActions}
            </div>
          )}

          <div className="mt-auto pt-8 border-t border-white/5">
            <h3 className="text-xs font-cinzel text-slate-500 tracking-[0.2em] mb-6">WHAT DO YOU DO?</h3>
            <div className="space-y-4">
              {state.currentChoices?.map((choice, i) => (
                <ChoiceButton 
                  key={i} 
                  choice={choice} 
                  onClick={() => handleChoice(choice)} 
                  disabled={state.isLoading}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
