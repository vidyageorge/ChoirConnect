import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CurrentUser } from '../types';

const STORAGE_KEY = 'choirmate_current_user';

function loadStored(): CurrentUser {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CurrentUser;
      if (parsed.role === 'admin' || parsed.role === 'member') {
        return {
          role: parsed.role,
          memberId: parsed.memberId != null ? Number(parsed.memberId) : undefined,
        };
      }
    }
  } catch {
    // ignore
  }
  return { role: 'admin' };
}

type SetCurrentUser = (user: CurrentUser) => void;

const CurrentUserContext = createContext<{ currentUser: CurrentUser; setCurrentUser: SetCurrentUser } | null>(null);

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setState] = useState<CurrentUser>(loadStored);

  const setCurrentUser = useCallback((user: CurrentUser) => {
    setState(user);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch {
      // ignore
    }
  }, []);

  return (
    <CurrentUserContext.Provider value={{ currentUser, setCurrentUser }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    throw new Error('useCurrentUser must be used within CurrentUserProvider');
  }
  return ctx;
}
