import React from 'react';
import { LucideIcon, Layers, Calendar, BookOpen, Briefcase, Users, FileText, CheckSquare, BarChart3, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface SectionPlaceholderProps {
  title: string;
  description: string;
  phase: string;
  icon?: LucideIcon;
  features: string[];
}

export const SectionPlaceholder: React.FC<SectionPlaceholderProps> = ({
  title,
  description,
  phase,
  icon: Icon = Layers,
  features,
}) => {
  const { workspace } = useAuth();

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-legal-50 border border-legal-200 text-legal-900">
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{title}</h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-legal-100 text-legal-800 border border-legal-200">
                {phase}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{description}</p>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Module Architecture & Capabilities in this Workspace ({workspace?.name})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {features.map((feat, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2.5"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-legal-700 mt-1.5 flex-shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

