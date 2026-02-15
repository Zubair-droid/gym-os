import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from './supabaseClient';


// --- CUSTOM COMPONENTS ---
import Auth from './Auth';
import DietForm from './components/DietForm';
import DietResult from './components/DietResult';
import ProgressChart from './components/ProgressChart';
import SmartStats from './components/SmartStats';
import AdminDashboard from './AdminDashboard'; // Ensure you have this file
import { useGymSupabase } from './useGymSupabase';
import FoodScanner from './components/FoodScanner';
import.meta.env.VITE_GOOGLE_API_KEY;

// --- CONFIGURATION ---
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// ⚡ SET TO 'true' FOR TESTING (Saves API Quota)
const DEMO_MODE = false;

// --- UTILITY: JSON SURGEON ---
// Extracts clean JSON from a messy AI response
const cleanAIResponse = (text) => {
  try {
    // 1. If it's already clean, just parse
    return JSON.parse(text);
  } catch (e) {
    // 2. If it fails, find the curly braces
    const firstBracket = text.indexOf('{');
    const lastBracket = text.lastIndexOf('}');

    if (firstBracket !== -1 && lastBracket !== -1) {
      const jsonString = text.substring(firstBracket, lastBracket + 1);
      return JSON.parse(jsonString);
    }
    throw new Error("AI response did not contain valid JSON");
  }
};

function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState('member'); // 'admin' or 'member'
  const [showScanner, setShowScanner] = useState(false);

  // --- 1. AUTHENTICATION LISTENER ---
  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- 2. ROLE CHECKER (STABILIZED) ---
  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchRole = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      // Only update if role is different (Prevents Loop)
      if (data && data.role !== userRole) {
        setUserRole(data.role);
      }
    };
    fetchRole();
  }, [session?.user?.id, userRole]);

  // --- 3. CONNECT TO CLOUD DB ---
  const { history, currentPlan, addCheckIn, loadingData, startWeight } = useGymSupabase(session);

  // UI States
  const [loadingAI, setLoadingAI] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  // --- HELPER: HTML GENERATOR (Fixes Math Errors) ---
  const generateHTML = (meals, trainerNote) => {
    let totalCalories = 0;
    let totalProtein = 0;

    const tableRows = meals.map(meal => {
      const cals = parseInt(meal.calories) || 0;
      const prot = parseInt(meal.protein) || 0;
      totalCalories += cals;
      totalProtein += prot;

      return `
        <tr>
          <td style="color:black; font-weight:bold;">${meal.name}</td>
          <td>${meal.items}</td>
          <td>${cals} cal</td>
        </tr>
      `;
    }).join('');

    return `
      <h3>Today's Fuel Plan</h3>
      <table class="table">
        <thead>
          <tr>
            <th style="color:black;">Meal</th>
            <th style="color:#888;">Items</th>
            <th style="color:#888;">Energy</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>

      <div class="total-summary">
        <div><strong>${totalCalories}</strong><span>CALORIES</span></div>
        <div><strong>${totalProtein}g</strong><span>PROTEIN</span></div>
      </div>

      <div class="trainer-note">
        💡 <strong>TRAINER'S INTEL:</strong> ${trainerNote}
      </div>
    `;
  };

  // --- 4. HANDLE UPDATE (AI + CLOUD) ---
  const handleUpdate = async (formData) => {
    setLoadingAI(true);
    setShowUpdateForm(false);


    // SCENARIO A - IF API FAILs,
    // --- HELPER: MOCK DATA GENERATOR (The Safety Net) ---
    const runBackupPlan = async () => {
      console.log("⚠️ API FAILURE DETECTED: Switching to Auto-Pilot Backup");

      // Simulate "Thinking" time so client doesn't suspect
      await new Promise(r => setTimeout(r, 2000));

      const backupMeals = [
        { name: "Breakfast", items: "3 Idlis + Sambar (Backup Plan)", calories: 300, protein: 8 },
        { name: "Lunch", items: "Curd Rice + Pickle", calories: 450, protein: 6 },
        { name: "Dinner", items: "2 Chapati + Dal", calories: 350, protein: 12 }
      ];

      const backupHTML = generateHTML(backupMeals, "Excellent progress. Keep hydration high! (Offline Mode)");
      await addCheckIn(formData.weight, backupHTML, formData.name);
      setLoadingAI(false);
    };

    try {
      // SCENARIO B: DEMO MODE
      if (DEMO_MODE) {
        await runBackupPlan();
        return;
      }

      // SCENARIO c: REAL AI
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `
        Act as a strict Gym Trainer. User Weight: ${formData.weight}kg, Goal: ${formData.goal}.
        Breakfast Preference: ${formData.breakfast}.
        
        STRICTLY return a JSON OBJECT with this structure:
        {
          "meals": [
            { "name": "Breakfast", "items": "Food names", "calories": 300, "protein": 10 },
            { "name": "Lunch", "items": "Food names", "calories": 500, "protein": 20 },
            { "name": "Snack", "items": "Food names", "calories": 150, "protein": 5 },
            { "name": "Dinner", "items": "Food names", "calories": 400, "protein": 15 }
          ],
          "trainer_note": "Short motivation."
        }
      `;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const data = cleanAIResponse(text);

      const finalHTML = generateHTML(data.meals, data.trainer_note);
      await addCheckIn(formData.weight, finalHTML, formData.name);

    } catch (err) {
      console.error(err);
      alert("AI Error: " + err.message);
      setShowUpdateForm(true);
      await runBackupPlan();
    } finally {
      if (!DEMO_MODE) setLoadingAI(false);
    }
  };


  // --- VIEW 1: AUTH SCREEN ---
  if (!session) {
    return <Auth />;
  }

  // --- VIEW 2: ADMIN DASHBOARD ---
  if (userRole === 'admin') {
    return (
      <div className="container py-4">
        <div className="d-flex justify-content-between align-items-center mb-5">
          <h2 className="text-white m-0">GYM<span className="text-danger">OS</span> ADMIN</h2>
          <button className="btn btn-sm btn-outline-secondary" onClick={() => supabase.auth.signOut()}>LOGOUT</button>
        </div>
        <AdminDashboard />
      </div>
    );
  }

  // --- HANDLE VISION RESULT ---
  const handleScanComplete = async (foodData) => {
    setShowScanner(false);

    // 1. Show the user what we found (Instant Gratification)
    const confirmSave = window.confirm(
      `📷 AI DETECTED:\n\n` +
      `Item: ${foodData.food_name}\n` +
      `Calories: ${foodData.calories} kcal\n` +
      `Protein: ${foodData.protein} g\n\n` +
     // `Analysis: ${foodData.analysis}` +
      `Add this to your daily log?`
    );

    if (confirmSave) {
      // 2. Generate HTML snippet for this item
      const mealHTML = `
        <div style="border-left: 3px solid #00F0FF; padding-left: 10px; margin-bottom: 10px;">
          <strong>📸 SCANNED: ${foodData.food_name}</strong><br/>
          <span style="color:#ccc;">${foodData.calories} cal | ${foodData.protein}g protein</span>
          <div className="bg-gray-100 p-3 rounded mt-2">
              <p className="text-gray-700 italic">${foodData.analysis}</p>
          </div>
        </div>
         

            
      `;

      // 3. Save to Cloud (Using current weight as placeholder since we are just logging food)
      // Note: We reuse the last known weight to keep the graph steady.
      const currentWeight = history.length > 0 ? history[history.length - 1].weight : startWeight;
      await addCheckIn(currentWeight, mealHTML, session.user.email); // or name
    }
  };


  // --- VIEW 3: MEMBER DASHBOARD ---
  return (
    <div className="container py-4">
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-5">
        <div>
          <h2 className="text-white m-0" style={{ fontFamily: 'Bebas Neue', letterSpacing: '2px' }}>
            GYM<span className="text-danger">OS</span>
          </h2>
          <p className="small  m-0">
            <span className="badge bg-danger me-2">MEMBER</span>
            {session.user.email}
          </p>
        </div>
        <button className="btn btn-sm btn-outline-secondary" onClick={() => supabase.auth.signOut()}>LOGOUT</button>
      </div>

      {/* CONTENT */}
      {loadingData ? (
        <div className="text-center p-5  glass-card">
          <div className="spinner-border text-danger mb-3"></div>
          <h4>Syncing Cloud Data...</h4>
        </div>
      ) : (
        <>
          {/* FIRST TIME USER */}
          {history.length === 0 && (
            <div className="glass-card p-5 text-center animate__animated animate__fadeIn">
              <h1 className="display-4 fw-bold">WELCOME TO THE TEAM</h1>
              <p className="lead  mb-4">Let's initialize your profile. Record your starting weight below.</p>
              <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                <DietForm onGenerate={handleUpdate} initialWeight={""} />
              </div>
              {loadingAI && <p className="mt-3 text-danger animate-pulse">Initializing AI Protocol...</p>}
            </div>
          )}

          {!showScanner && (
            <button
              onClick={() => setShowScanner(true)}
              className="btn btn-outline-danger w-100 mb-3"
              style={{ borderStyle: 'dashed' }}
            >
              📸 SCAN FOOD (BETA)
            </button>
          )}

          {showScanner && (
            <div className="mb-4">
              <FoodScanner
                onScanComplete={handleScanComplete}
                onClose={() => setShowScanner(false)}

              />


            </div>
          )}

          {/* RETURNING USER */}
          {history.length > 0 && (
            <div className="row">
              <div className="col-lg-5 mb-4">
                <SmartStats history={history} startWeight={startWeight} />

                {!showUpdateForm && !loadingAI && (
                  <div className="d-grid mt-4">
                    <button onClick={() => setShowUpdateForm(true)} className="btn btn-neon py-3">
                      ➕ UPDATE TODAY'S PROGRESS
                    </button>
                  </div>
                )}

                {showUpdateForm && (
                  <div className="glass-card mt-4 animate__animated animate__fadeInLeft">
                    <div className="d-flex justify-content-between mb-3">
                      <h5 className="text-white">DAILY CHECK-IN</h5>
                      <button onClick={() => setShowUpdateForm(false)} className="btn btn-sm">✕</button>
                    </div>
                    <DietForm onGenerate={handleUpdate} initialWeight={history[history.length - 1]?.weight} />
                  </div>
                )}

                {loadingAI && (
                  <div className="glass-card mt-4 text-center p-4">
                    <div className="spinner-border text-danger mb-2"></div>
                    <p className="m-0 text-white">Analyzing biometric data...</p>
                  </div>
                )}
              </div>

              <div className="col-lg-7">
                <div className="glass-card mb-4 animate__animated animate__fadeInRight">
                  <ProgressChart history={history} />
                </div>

                {currentPlan && (
                  <div className="glass-card animate__animated animate__fadeInUp">
                    <DietResult plan={currentPlan} clientName={session.user.email.split('@')[0]} />
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
