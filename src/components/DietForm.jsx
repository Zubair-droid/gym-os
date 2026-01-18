import React, { useState } from 'react';

const DietForm = ({ onGenerate }) => {
  const [formData, setFormData] = useState({
    age: '',
    weight: '',
    goal: 'weight_loss',
    dietType: 'non_veg',
    breakfast: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onGenerate(formData);
  };

  return (
    <div className="card bg-dark text-white shadow-lg p-4 mb-4" style={{border: '1px solid #dc3545'}}>
      <div className="card-body">
        <h3 className="card-title text-center text-uppercase mb-4" style={{color: '#dc3545', fontWeight: 'bold'}}>
          <i className="bi bi-lightning-fill"></i> Custom Diet Generator
        </h3>
        
        <form onSubmit={handleSubmit}>
          <div className="row">
            {/* Age & Weight */}
            <div className="col-md-6 mb-3">
              <label className="form-label">Age</label>
              <input 
                type="number" 
                name="age" 
                className="form-control bg-secondary text-white border-0" 
                placeholder="e.g. 25"
                onChange={handleChange} required 
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Weight (kg)</label>
              <input 
                type="number" 
                name="weight" 
                className="form-control bg-secondary text-white border-0" 
                placeholder="e.g. 75"
                onChange={handleChange} required 
              />
            </div>

            {/* Goals & Type */}
            <div className="col-md-6 mb-3">
              <label className="form-label">Goal</label>
              <select name="goal" className="form-select bg-secondary text-white border-0" onChange={handleChange}>
                <option value="weight_loss">🔥 Fat Loss</option>
                <option value="muscle_gain">💪 Muscle Gain</option>
                <option value="maintenance">⚖️ Maintenance</option>
              </select>
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Diet Preference</label>
              <select name="dietType" className="form-select bg-secondary text-white border-0" onChange={handleChange}>
                <option value="non_veg">🍗 Non-Veg (South Indian)</option>
                <option value="veg">🥦 Pure Veg (South Indian)</option>
                <option value="egg">🥚 Eggetarian</option>
              </select>
            </div>

            {/* The Magic Field */}
            <div className="col-12 mb-4">
              <label className="form-label text-warning">What do you usually eat for breakfast?</label>
              <input 
                type="text" 
                name="breakfast" 
                className="form-control bg-secondary text-white border-0" 
                placeholder="e.g., 3 Idlis with Coconut Chutney or Poha"
                onChange={handleChange} required 
              />
              <small className="text-light opacity-50">We use this to calibrate your local taste.</small>
            </div>

            <div className="d-grid gap-2">
              <button type="submit" className="btn btn-danger btn-lg text-uppercase fw-bold">
                Generate Plan ⚡
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DietForm;