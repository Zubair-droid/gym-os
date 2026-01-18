import { useState, useEffect } from 'react';

const STORAGE_KEY = 'gym_app_db_v2'; // Changed key version

export const useGymStorage = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [allUsers, setAllUsers] = useState({});

  // Load DB on startup
  useEffect(() => {
    const db = localStorage.getItem(STORAGE_KEY);
    if (db) {
      setAllUsers(JSON.parse(db));
    }
  }, []);

  // --- LOGIN ---
  const login = (username) => {
    if (allUsers[username]) {
      setCurrentUser(allUsers[username]);
      return true;
    }
    return false; // User not found
  };

  // --- LOGOUT ---
  const logout = () => {
    setCurrentUser(null);
  };

  // --- REGISTER ---
  const registerUser = (name, startWeight) => {
    // Create new user structure
    const newUser = {
      name: name,
      startWeight: parseFloat(startWeight),
      history: [
        { date: new Date().toLocaleDateString(), weight: parseFloat(startWeight) }
      ],
      currentPlan: null,
      // USAGE TRACKING
      usage: {
        lastDate: new Date().toLocaleDateString(),
        count: 0
      }
    };

    const updatedDB = { ...allUsers, [name]: newUser };
    saveDB(updatedDB);
    setCurrentUser(newUser);
  };

  // --- ADD CHECK-IN (With Logic) ---
  const addCheckIn = (weight, dietPlanHTML) => {
    if (!currentUser) return;

    const today = new Date().toLocaleDateString();
    let updatedUser = { ...currentUser };
    
    // 1. UPDATE HISTORY (Graph Logic)
    const existingIndex = updatedUser.history.findIndex(h => h.date === today);
    if (existingIndex >= 0) {
      updatedUser.history[existingIndex].weight = parseFloat(weight); // Overwrite today
    } else {
      updatedUser.history.push({ date: today, weight: parseFloat(weight) }); // Add new dot
    }

    // 2. UPDATE PLAN
    if (dietPlanHTML) {
      updatedUser.currentPlan = dietPlanHTML;
    }

    // 3. UPDATE USAGE COUNT
    if (updatedUser.usage.lastDate !== today) {
      // Reset for new day
      updatedUser.usage = { lastDate: today, count: 1 };
    } else {
      // Increment for today
      updatedUser.usage.count += 1;
    }

    // Save
    const updatedDB = { ...allUsers, [currentUser.name]: updatedUser };
    saveDB(updatedDB);
    setCurrentUser(updatedUser);
  };

  const saveDB = (db) => {
    setAllUsers(db);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  };

  return { currentUser, login, logout, registerUser, addCheckIn };
};