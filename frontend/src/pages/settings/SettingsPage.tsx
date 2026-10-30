import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { SettingsLayout } from './SettingsLayout';
import { ProfileSettings } from './ProfileSettings';
import { AccountSettings } from './AccountSettings';
import { WorkspaceSettings } from './WorkspaceSettings';
import { AppearanceSettings } from './AppearanceSettings';
import { RegionalSettings } from './RegionalSettings';
import { SecuritySettings } from './SecuritySettings';
import { SessionSettings } from './SessionSettings';
import { DataPrivacySettings } from './DataPrivacySettings';

export const SettingsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'profile';

  const handleSelectTab = (tabId: string) => {
    setSearchParams({ tab: tabId }, { replace: true });
  };

  return (
    <SettingsLayout activeTab={currentTab} onSelectTab={handleSelectTab}>
      {currentTab === 'profile' && <ProfileSettings />}
      {currentTab === 'account' && <AccountSettings />}
      {currentTab === 'workspace' && <WorkspaceSettings />}
      {currentTab === 'appearance' && <AppearanceSettings />}
      {currentTab === 'regional' && <RegionalSettings />}
      {currentTab === 'security' && (
        <SecuritySettings onNavigateToTab={handleSelectTab} />
      )}
      {currentTab === 'sessions' && <SessionSettings />}
      {currentTab === 'privacy' && <DataPrivacySettings />}
    </SettingsLayout>
  );
};

