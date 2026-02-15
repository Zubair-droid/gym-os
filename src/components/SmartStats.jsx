import React from 'react';

const SmartStats = ({ history, startWeight }) => {
  if (!history || history.length === 0) return null;

  // Get current and previous data
  const currentWeight = history[history.length - 1].weight;
  
  // Calculate Total Loss
  const totalChange = startWeight - currentWeight;
  const isLoss = totalChange > 0;
  
  // Calculate Recent Change (Since last check-in)
  let recentChange = 0;
  if (history.length > 1) {
    const previousWeight = history[history.length - 2].weight;
    recentChange = previousWeight - currentWeight;
  }

  return (
    <div className="row mb-4">
      {/* CARD 1: Current Status */}
      <div className="col-6">
        <div className="p-3 rounded bg-dark border border-secondary text-center h-100">
          <p className="text-muted small text-uppercase mb-1">Current Weight</p>
          <h2 className="text-white fw-bold mb-0">{currentWeight} <span className="fs-6">kg</span></h2>
        </div>
      </div>

      {/* CARD 2: The Motivation (Total Change) */}
      <div className="col-6">
        <div className={`p-3 rounded border text-center h-100 ${isLoss ? 'bg-success bg-opacity-10 border-success' : 'bg-warning bg-opacity-10 border-warning'}`}>
          <p className={`small text-uppercase mb-1 ${isLoss ? 'text-success' : 'text-warning'}`}>
            {isLoss ? 'Total Lost' : 'Total Gained'}
          </p>
          <h2 className={`fw-bold mb-0 ${isLoss ? 'text-success' : 'text-warning'}`}>
             {Math.abs(totalChange).toFixed(1)} <span className="fs-6">kg</span>
          </h2>
          {recentChange !== 0 && (
             <small className={`d-block mt-1 text-white`} style={{fontSize: '0.7rem'}}>
               {recentChange > 0 ? '⬇️' : '⬆️'} {Math.abs(recentChange).toFixed(1)}kg since last check-in
             </small>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartStats;