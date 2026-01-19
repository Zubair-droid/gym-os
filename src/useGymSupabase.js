import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

export const useGymSupabase = (session) => {
  const [history, setHistory] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loadingData, setLoadingData] = useState(false);

  // 1. STABILIZED FETCH FUNCTION
  // We use useCallback so this function doesn't get re-created on every render
  const fetchHistory = useCallback(async () => {
    // Safety Check: If no user ID, stop.
    if (!session?.user?.id) return;

    try {
      setLoadingData(true);
      const { data, error } = await supabase
        .from('checkins')
        .select('*')
        .eq('user_id', session.user.id) // Ensure we only fetch OUR data
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        // Format for the Graph
        const formattedHistory = data.map(entry => ({
          date: new Date(entry.created_at).toLocaleDateString(),
          weight: entry.weight
        }));
        setHistory(formattedHistory);

        // Get the latest plan
        if (data.length > 0) {
          const lastEntry = data[data.length - 1];
          if (lastEntry.diet_plan?.html) {
            setCurrentPlan(lastEntry.diet_plan.html);
          }
        }
      }
    } catch (error) {
      console.error('Error loading data:', error.message);
    } finally {
      setLoadingData(false);
    }
  }, [session?.user?.id]); // ⚠️ Dependency is ONLY the User ID string

  // 2. TRIGGER FETCH
  // Only runs when the User ID changes (Login)
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // 3. SAVE FUNCTION
  const addCheckIn = async (weight, dietPlanHTML, name) => {
    if (!session?.user?.id) return;

    try {

      // 1. UPDATE PROFILE NAME (If provided)
      if (name) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ full_name: name })
          .eq('id', session.user.id);
          
        if (profileError) console.error("Name Update Failed:", profileError.message);
      }

      const { error } = await supabase
        .from('checkins')
        .insert({
          user_id: session.user.id,
          weight: parseFloat(weight),
          diet_plan: { html: dietPlanHTML }
        });

      if (error) throw error;

      // Refresh the list immediately
      await fetchHistory();

    } catch (error) {
      console.error(error);
      alert("Save Failed: " + error.message);
    }
  };

  
  return {
    history,
    currentPlan,
    addCheckIn,
    loadingData,
    startWeight: history.length > 0 ? history[0].weight : 0
  };
};