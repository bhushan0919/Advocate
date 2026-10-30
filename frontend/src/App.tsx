import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n/index.ts';
import { AuthProvider } from './context/AuthContext.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { AppLayout } from './components/layout/AppLayout.tsx';
import { Login } from './pages/auth/Login.tsx';
import { RegisterAdvocate } from './pages/auth/RegisterAdvocate.tsx';
import { AcceptInvitation } from './pages/auth/AcceptInvitation.tsx';
import { Dashboard } from './pages/dashboard/Dashboard.tsx';
import { StaffManagement } from './pages/staff/StaffManagement.tsx';
import { CasesRegister } from './pages/cases/CasesRegister.tsx';
import { CaseProfile } from './pages/cases/CaseProfile.tsx';
import { ClientsList } from './pages/clients/ClientsList.tsx';
import { ClientProfile } from './pages/clients/ClientProfile.tsx';
import { DailyCourtDiary } from './pages/diary/DailyCourtDiary.tsx';
import { HearingHistory } from './pages/hearings/HearingHistory.tsx';
import { HearingCalendar } from './pages/calendar/HearingCalendar.tsx';
import { TaskManagement } from './pages/tasks/TaskManagement.tsx';
import { ReminderManagement } from './pages/reminders/ReminderManagement.tsx';
import { NotificationCenter } from './pages/notifications/NotificationCenter.tsx';
import { SettingsPage } from './pages/settings/SettingsPage.tsx';
import { DocumentsPage } from './pages/documents/DocumentsPage.tsx';
import { ReportsPage } from './pages/reports/ReportsPage.tsx';
import { SectionPlaceholder } from './pages/placeholder/SectionPlaceholder.tsx';
import {
  BookOpen,
  Briefcase,
  Users,
  Calendar as CalendarIcon,
  History,
  FileText,
  CheckSquare,
  BarChart3,
  Settings as SettingsIcon,
} from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <BrowserRouter>
              <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<RegisterAdvocate />} />
              <Route path="/invite/accept" element={<AcceptInvitation />} />

              {/* Authenticated Workspace Scoped Routes */}
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/staff" element={<StaffManagement />} />
                <Route path="/diary" element={<DailyCourtDiary />} />
                <Route path="/cases" element={<CasesRegister />} />
                <Route path="/cases/:id" element={<CaseProfile />} />
                <Route path="/clients" element={<ClientsList />} />
                <Route path="/clients/:id" element={<ClientProfile />} />
                <Route path="/calendar" element={<HearingCalendar />} />
                <Route path="/hearings" element={<HearingHistory />} />
                <Route path="/tasks" element={<TaskManagement />} />
                <Route path="/reminders" element={<ReminderManagement />} />
                <Route path="/notifications" element={<NotificationCenter />} />
                <Route path="/documents" element={<DocumentsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
    </I18nextProvider>
  );
};

export default App;

