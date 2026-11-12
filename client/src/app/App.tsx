import { FreePlayProvider } from '../features/free-play/FreePlay';
import { IdentityProvider } from '../features/identity/Identity';
import { PreferencesProvider } from '../features/preferences/Preferences';
import { ProfileProvider } from '../features/profile/Profile';
import { TimedDailyProvider } from '../features/timed-daily/TimedDaily';
import { ZenDailyProvider } from '../features/zen/ZenDaily';
import { RunActivityProvider } from '../platform/lifecycle/RunActivity';
import '../ui/theme.css';
import { AppShell } from './AppShell';
import { FreshnessCoordinator } from './FreshnessCoordinator';
import { AppRoutes } from './Routes';

export default function App() {
  return (
    <IdentityProvider>
      <PreferencesProvider>
        <ProfileProvider>
          <RunActivityProvider>
            <TimedDailyProvider>
              <ZenDailyProvider>
                <FreePlayProvider>
                  <FreshnessCoordinator />
                  <AppShell><AppRoutes /></AppShell>
                </FreePlayProvider>
              </ZenDailyProvider>
            </TimedDailyProvider>
          </RunActivityProvider>
        </ProfileProvider>
      </PreferencesProvider>
    </IdentityProvider>
  );
}
