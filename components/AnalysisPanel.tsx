import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { BrainCircuit, Loader2, Sparkles, TrendingUp, AlertCircle } from "lucide-react";
import { AIAnalysisResult, NestingStats } from "../types";
import { Button } from "./ui/Button";

interface AnalysisPanelProps {
  stats: NestingStats | null;
  aiResult: AIAnalysisResult | null;
  loading: boolean;
  onAnalyze: () => void;
  hasApiKey: boolean;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ stats, aiResult, loading, onAnalyze, hasApiKey }) => {
  if (!stats) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 p-6 text-center">
        <TrendingUp size={48} className="mb-4 opacity-20" />
        <p>Run a nesting simulation to view analysis.</p>
      </div>
    );
  }

  const chartData = [
    { name: 'Used', value: stats.globalEfficiency, color: '#6366f1' },
    { name: 'Waste', value: 100 - stats.globalEfficiency, color: '#334155' },
  ];

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto pr-2">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
            <p className="text-xs text-slate-400 uppercase">Efficiency</p>
            <p className="text-2xl font-bold text-indigo-400">{stats.globalEfficiency.toFixed(1)}%</p>
        </div>
        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
            <p className="text-xs text-slate-400 uppercase">Sheets</p>
            <p className="text-2xl font-bold text-white">{stats.totalSheets}</p>
        </div>
        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 col-span-2">
            <p className="text-xs text-slate-400 uppercase">Parts Placed</p>
            <p className="text-xl font-bold text-white">{stats.placedParts} <span className="text-slate-500 text-sm font-normal">/ {stats.totalParts}</span></p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-48 w-full bg-slate-900/50 rounded-lg border border-slate-800 relative">
        <p className="absolute top-2 left-3 text-xs text-slate-500 font-medium">AREA UTILIZATION</p>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <RechartsTooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                itemStyle={{ color: '#f8fafc' }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center Text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xl font-bold text-white">{stats.globalEfficiency.toFixed(0)}%</span>
        </div>
      </div>

      {/* AI Section */}
      <div className="flex-1 bg-gradient-to-b from-slate-900 to-slate-900/50 rounded-xl border border-indigo-500/20 p-4 flex flex-col relative overflow-hidden">
        
        {/* Decorative sheen */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />

        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <BrainCircuit className="text-indigo-400" size={20} />
                <h3 className="font-semibold text-indigo-100">AI Insights</h3>
            </div>
            {aiResult && <div className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">SCORE: {aiResult.score}</div>}
        </div>

        {!aiResult ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
                <p className="text-sm text-slate-400 mb-4">
                    Generate an AI-powered report on material yield and optimization strategies.
                </p>
                {hasApiKey ? (
                    <Button onClick={onAnalyze} disabled={loading} className="w-full">
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" /> Generate Report
                            </>
                        )}
                    </Button>
                ) : (
                    <div className="flex flex-col items-center gap-2 p-3 bg-red-900/10 border border-red-900/30 rounded-lg w-full">
                        <AlertCircle className="text-red-400" size={20} />
                        <p className="text-xs text-red-300">API Key Required for AI</p>
                    </div>
                )}
            </div>
        ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 text-sm">
                <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-500 uppercase">Executive Summary</p>
                    <p className="text-slate-300 leading-relaxed">{aiResult.summary}</p>
                </div>

                <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase">Recommendations</p>
                    <ul className="space-y-2">
                        {aiResult.recommendations.map((rec, i) => (
                            <li key={i} className="flex gap-2 items-start text-slate-300 bg-slate-800/50 p-2 rounded">
                                <span className="text-indigo-400 font-bold mt-0.5">•</span>
                                <span>{rec}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                
                 <div className="pt-2 border-t border-slate-800">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">Material Grade Assessment</span>
                        <span className="text-xs text-emerald-400 font-medium">{aiResult.materialGrade}</span>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
