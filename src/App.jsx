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

// --- CONFIGURATION ---
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY; 
const genAI = new GoogleGenerativeAI(API_KEY);

// ⚡ SET TO 'true' FOR TESTING (Saves API Quota)
const DEMO_MODE = false; 

function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState('member'); // 'admin' or 'member'

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
          <td style="color:white; font-weight:bold;">${meal.name}</td>
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
            <th style="color:#888;">Meal</th>
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

    try {
      // SCENARIO A: DEMO MODE
      if (DEMO_MODE) {
        console.log("⚠️ DEMO MODE: Skipping API Call");
        setTimeout(async () => {
          const mockMeals = [
            { name: "Breakfast", items: "3 Idlis + Sambar", calories: 300, protein: 8 },
            { name: "Lunch", items: "Curd Rice + Pickle", calories: 450, protein: 6 },
            { name: "Dinner", items: "2 Chapati + Dal", calories: 350, protein: 12 }
          ];
          const finalHTML = generateHTML(mockMeals, "Great consistency! Focus on hydration today.");
          
          await addCheckIn(formData.weight, finalHTML);
          setLoadingAI(false);
        }, 1500); 
        return; 
      }

      // SCENARIO B: REAL AI
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
      const cleanJson = text.replace(/```json|```/g, '').trim();
      const data = JSON.parse(cleanJson);

      const finalHTML = generateHTML(data.meals, data.trainer_note);
      await addCheckIn(formData.weight, finalHTML);

    } catch (err) {
      console.error(err);
      alert("System Error: " + err.message);
      setShowUpdateForm(true); 
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

  // --- VIEW 3: MEMBER DASHBOARD ---
  return (
    <div className="container py-4">
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-5">
         <div>
            <h2 className="text-white m-0" style={{fontFamily: 'Bebas Neue', letterSpacing: '2px'}}>
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
               <div style={{maxWidth: '500px', margin: '0 auto'}}>
                 <DietForm onGenerate={handleUpdate} initialWeight={""} />
               </div>
               {loadingAI && <p className="mt-3 text-danger animate-pulse">Initializing AI Protocol...</p>}
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
                      <DietForm onGenerate={handleUpdate} initialWeight={history[history.length-1]?.weight} />
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