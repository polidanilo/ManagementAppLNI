import React, { createContext, useState, useContext, type ReactNode } from 'react';
import type { Season, Shift, User } from '../types';

interface AppContextType {
  selectedSeason: Season | null;
  setSelectedSeason: (season: Season | null) => void;
  selectedShift: Shift | null;
  setSelectedShift: (shift: Shift | null) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const getFromStorage = <T,>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const [selectedSeason, setSelectedSeason] = useState<Season | null>(() =>
    getFromStorage<Season | null>('selectedSeason', null)
  );
  const [selectedShift, setSelectedShift] = useState<Shift | null>(() =>
    getFromStorage<Shift | null>('selectedShift', null)
  );
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('token')
  );
  const [currentUser, setCurrentUser] = useState<User | null>(() =>
    getFromStorage<User | null>('currentUser', null)
  );

  const handleSetSelectedSeason = (season: Season | null) => {
    setSelectedSeason(season);
    if (season) {
      localStorage.setItem('selectedSeason', JSON.stringify(season));
    } else {
      localStorage.removeItem('selectedSeason');
    }
  };

  const handleSetSelectedShift = (shift: Shift | null) => {
    setSelectedShift(shift);
    if (shift) {
      localStorage.setItem('selectedShift', JSON.stringify(shift));
    } else {
      localStorage.removeItem('selectedShift');
    }
  };

  const handleSetToken = (newToken: string | null) => {
    setToken(newToken);
    if (newToken) {
      localStorage.setItem('token', newToken);
    } else {
      localStorage.removeItem('token');
      setCurrentUser(null);
      localStorage.removeItem('currentUser');
    }
  };

  const handleSetCurrentUser = (user: User | null) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('currentUser');
    }
  };

  return (
    <AppContext.Provider
      value={{
        selectedSeason,
        setSelectedSeason: handleSetSelectedSeason,
        selectedShift,
        setSelectedShift: handleSetSelectedShift,
        token,
        setToken: handleSetToken,
        currentUser,
        setCurrentUser: handleSetCurrentUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext deve essere usato dentro AppProvider');
  }
  return context;
};