import React, { useState, useEffect } from "react";
import { X, Key, Lock, Cpu, CheckCircle } from "lucide-react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  setApiKey: (key: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, apiKey, setApiKey }) => {
  const [tempKey, setTempKey] = useState(apiKey);
  const [provider, setProvider] = useState("gemini");

  useEffect(() => {
    setTempKey(apiKey);
  }, [apiKey]);

  const handleSave = () => {
    setApiKey(tempKey);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
            <Cpu className="text-indigo-400" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">System Configuration</h2>
            <p className="text-sm text-slate-400">AI Provider & Credentials</p>
          </div>
        </div>

        <div className="space-y-6">
          
          {/* Provider Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">AI Provider</label>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => setProvider("gemini")}
                className={`relative flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                  provider === "gemini" 
                    ? "bg-indigo-600/10 border-indigo-500 text-indigo-300" 
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                }`}
              >
                {provider === "gemini" && <CheckCircle size={14} className="absolute top-2 right-2 text-indigo-400" />}
                <span className="font-semibold text-sm">Google Gemini</span>
              </button>
              
              <button 
                disabled
                className="flex items-center justify-center gap-2 p-3 rounded-lg border border-slate-800 bg-slate-900/50 text-slate-600 cursor-not-allowed opacity-50"
              >
                <span className="font-semibold text-sm">OpenAI (Pro)</span>
              </button>
            </div>
          </div>

          {/* API Key Input */}
          <div className="space-y-2">
            <Input
              label="Google Gemini API Key"
              type="password"
              placeholder="AIzaSy..."
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
            />
            <div className="bg-slate-800/50 p-3 rounded border border-slate-700/50 flex gap-2">
              <Lock size={14} className="text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Your key is stored locally in your browser session. It is used directly to communicate with the Gemini API and is never sent to our servers.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} className="flex-1">Save Configuration</Button>
          </div>
          
          <div className="text-center">
             <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:underline">
               Get a Gemini API Key &rarr;
             </a>
          </div>
        </div>
      </div>
    </div>
  );
};