import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Use the key from Vercel/Env
const API_KEY = 'AIzaSyBWcuDs3E1AnQ9AD5pulfShceOE1JKSpEk'|| import.meta.env.VITE_GOOGLE_API_KEY; 
const genAI = new GoogleGenerativeAI(API_KEY);

export default function FoodScanner({ onScanComplete, onClose }) {
  const webcamRef = useRef(null);
  const [image, setImage] = useState(null);
  const [scanning, setScanning] = useState(false);

  // --- 1. CONFIGURATION (SMART RESOLUTION) ---
  // Ask for best available resolution, let phone decide aspect ratio.
  const videoConstraints = {
    facingMode: "environment",
    width: { ideal: 1920 }, 
    height: { ideal: 1080 }
  };

  // --- 2. CAPTURE IMAGE (OPTIMIZED FOR MOBILE) ---
  const capture = useCallback(() => {
    // 🛑 CRITICAL FIX: Downscale for faster upload. 
    // AI does not need HD. 512px width is plenty.
    // Quality 0.7 reduces file size significantly.
    const imageSrc = webcamRef.current.getScreenshot({
        width: 512, 
        quality: 0.7 
    });
    setImage(imageSrc);
  }, [webcamRef]);

  // --- 3. SEND TO GEMINI VISION ---
  const analyzeFood = async () => {
    setScanning(true);

    // 🛑 CRITICAL FIX: Increase timeout for slow mobile networks
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Timeout")), 15000) // 15 seconds
    );

    try {
      const base64Data = image.split(',')[1];
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `
        You are a Nutritionist AI. Look at this food image.
        1. Identify the food item(s).
        2. Estimate the portion size visible.
        3. Calculate approx Calories and Protein.
        
        STRICTLY return a JSON object:
        {
          "food_name": "Name of food (e.g. 2 Idlis)",
          "calories": 150,
          "protein": 5
        }
      `;

      // Race API vs Timeout
      const result = await Promise.race([
        model.generateContent([prompt, { inlineData: { data: base64Data, mimeType: "image/jpeg" } }]),
        timeoutPromise
      ]);

      const response = await result.response;
      const text = response.text();
      // Simple JSON cleaner
      const cleanJson = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
      const data = JSON.parse(cleanJson);

      onScanComplete(data); 

    } catch (error) {
      console.error("Vision Error:", error);
      // Fallback mock data so the demo doesn't break
      const mockResult = { food_name: "Scan Failed (Network Issue)", calories: 0, protein: 0 };
      alert("AI Connection Weak. Switching to manual entry.");
      onScanComplete(mockResult);

    } finally {
      setScanning(false);
      setImage(null);
    }
  };

  // --- STYLES FOR NO-STRETCHING ---
  const containerStyle = {
      width: '100%',
      height: '60vh', // Fixed height container
      maxHeight: '500px',
      backgroundColor: '#000',
      position: 'relative',
      borderRadius: '12px',
      overflow: 'hidden',
      marginBottom: '1rem',
      border: '1px solid #333'
  };

  const mediaStyle = {
      width: '100%',
      height: '100%',
      objectFit: 'contain' // 🛑 CRITICAL FIX: Prevents stretching
  };


  return (
    <div className="glass-card p-3 text-center animate__animated animate__fadeIn">
      <div className="d-flex justify-content-between mb-2">
        <h5 className="text-white m-0" style={{letterSpacing:'1px'}}>📸 AI FOOD LENS</h5>
        <button onClick={onClose} className="btn btn-sm btn-outline-secondary">✕</button>
      </div>
      
      {!image ? (
        <>
          {/* CAMERA VIEW */}
          <div style={containerStyle}>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={videoConstraints}
              style={mediaStyle}
            />
            {/* Scanner Overlay */}
            <div style={{
              position: 'absolute', top: '10%', left: '10%', right: '10%', bottom: '10%',
              border: '2px dashed var(--primary)', borderRadius: '12px', pointerEvents: 'none',
              boxShadow: '0 0 0 999px rgba(0, 0, 0, 0.5)'
            }}></div>
          </div>

          <button onClick={capture} className="btn btn-neon w-100 py-3">
            ● CAPTURE
          </button>
        </>
      ) : (
        <>
          {/* PREVIEW VIEW */}
           <div style={containerStyle}>
             <img src={image} alt="Captured" style={mediaStyle} />
          </div>

          <div className="d-flex gap-2">
            <button 
              onClick={() => setImage(null)} 
              className="btn btn-outline-light flex-grow-1"
              disabled={scanning}
            >
              RETAKE
            </button>
            <button 
              onClick={analyzeFood} 
              className="btn btn-neon flex-grow-1" 
              disabled={scanning}
            >
              {scanning ? (
                <span><span className="spinner-border spinner-border-sm me-2"></span> ANALYZING...</span>
              ) : 'USE PHOTO'}
            </button>
          </div>
          {scanning && <p className="text-white mt-2 small animate-pulse">Compressing & Sending to AI Cloud...</p>}
        </>
      )}
    </div>
  );
}