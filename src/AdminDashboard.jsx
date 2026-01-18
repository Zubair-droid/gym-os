import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function AdminDashboard() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGymData();
  }, []);

  const fetchGymData = async () => {
    try {
      // 1. Get all profiles
      const { data: profiles } = await supabase.from('profiles').select('*');
      
      // 2. Get latest checkin for each user
      const { data: checkins } = await supabase.from('checkins').select('user_id, created_at, weight');

      // 3. The Algorithm: Calculate Risk & Progress
      const dashboardData = profiles.map(user => {
        const userHistory = checkins.filter(c => c.user_id === user.id);
        
        let lastActive = 'Never';
        let status = 'new'; // new | active | risk
        let weightChange = 0;
        let lastDateObj = null;

        if (userHistory.length > 0) {
          // Sort by date descending (Newest first)
          userHistory.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          
          lastDateObj = new Date(userHistory[0].created_at);
          lastActive = lastDateObj.toLocaleDateString();

          // STATUS LOGIC: 
          // If inactive > 3 days = RISK
          const diffTime = Math.abs(new Date() - lastDateObj);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
          
          if (diffDays > 3) status = 'risk';
          else status = 'active';

          // Weight Change (Start - Current)
          if (userHistory.length > 1) {
             const start = userHistory[userHistory.length - 1].weight;
             const current = userHistory[0].weight;
             weightChange = (start - current).toFixed(1);
          }
        }

        return { ...user, lastActive, status, weightChange, daysInactive: status === 'risk' ? '3+' : 0 };
      });

      setMembers(dashboardData);
      setLoading(false);

    } catch (error) {
      console.error("Admin Error:", error);
    }
  };

  // --- THE SALES FEATURE: WHATSAPP NUDGE ---
  const sendNudge = (phone, name) => {
    // In a real app, you'd store phone numbers. For now, we assume a placeholder or ask.
    // This opens WhatsApp Web with a pre-filled message.
    const text = `Hey ${name}! We missed you at Iron Muscle Gym. It's been a few days. Come crush a workout today! 💪`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (loading) return <div className="text-white text-center p-5">Loading Command Center...</div>;

  return (
    <div className="container animate__animated animate__fadeIn">
      
      {/* KPI STATS ROW */}
      <div className="row mb-5">
        <div className="col-md-4">
           <div className="glass-card text-center p-4">
             <h1 className="display-4 fw-bold text-white">{members.length}</h1>
             <p className=" letter-spacing-2">TOTAL MEMBERS</p>
           </div>
        </div>
        <div className="col-md-4">
           <div className="glass-card text-center p-4" style={{borderColor: '#00ff88'}}>
             <h1 className="display-4 fw-bold text-success">
               {members.filter(m => m.status === 'active').length}
             </h1>
             <p className=" letter-spacing-2">ACTIVE SQUAD</p>
           </div>
        </div>
        <div className="col-md-4">
           <div className="glass-card text-center p-4" style={{borderColor: '#ff003c'}}>
             <h1 className="display-4 fw-bold text-danger animate-pulse">
               {members.filter(m => m.status === 'risk').length}
             </h1>
             <p className=" letter-spacing-2">CHURN RISK</p>
           </div>
        </div>
      </div>

      {/* THE "LIST OF SHAME" (MEMBER TABLE) */}
      <div className="glass-card p-0 overflow-hidden">
        <div className="p-4 border-bottom border-secondary d-flex justify-content-between align-items-center">
            <h4 className="m-0 text-white">MEMBER INTELLIGENCE</h4>
            <button className="btn btn-sm btn-outline-light" onClick={fetchGymData}>↻ REFRESH DATA</button>
        </div>
        
        <div className="table-responsive">
            <table className="table table-dark table-hover mb-0" style={{background: 'transparent'}}>
              <thead>
                <tr>
                  <th className="p-3">MEMBER</th>
                  <th className="p-3">STATUS</th>
                  <th className="p-3">LAST SEEN</th>
                  <th className="p-3">PROGRESS</th>
                  <th className="p-3 text-end">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id} style={{verticalAlign: 'middle'}}>
                    <td className="p-3 fw-bold text-white">
                        <div className="d-flex align-items-center">
                            <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center me-3" style={{width:'35px', height:'35px', fontSize:'0.8rem'}}>
                                {m.full_name ? m.full_name.charAt(0) : '?'}
                            </div>
                            {m.full_name || "Unknown Member"}
                        </div>
                    </td>
                    <td className="p-3">
                      {m.status === 'active' && <span className="badge bg-success bg-opacity-25 text-success border border-success px-3 py-2">ACTIVE</span>}
                      {m.status === 'risk' && <span className="badge bg-danger bg-opacity-25 text-danger border border-danger px-3 py-2">MISSING</span>}
                      {m.status === 'new' && <span className="badge bg-primary bg-opacity-25 text-primary border border-primary px-3 py-2">NEW JOINER</span>}
                    </td>
                    <td className="p-3">{m.lastActive}</td>
                    <td className="p-3">
                      {m.weightChange > 0 
                        ? <span className="text-success fw-bold">📉 Lost {m.weightChange}kg</span> 
                        : <span className="text-secondary">-</span>}
                    </td>
                    <td className="p-3 text-end">
                      {m.status === 'risk' && (
                        <button 
                            onClick={() => sendNudge('0000000000', m.full_name)}
                            className="btn btn-sm btn-outline-danger"
                        >
                           💬 WAKE UP
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}