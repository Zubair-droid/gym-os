import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. SAFE KEY RETRIEVAL
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

console.log("DEBUG: Key is", API_KEY); // <--- Add this
export default function FoodScanner({ onScanComplete, onClose }) {
    const webcamRef = useRef(null);
    const [image, setImage] = useState(null);
    const [scanning, setScanning] = useState(false);
    const [statusText, setStatusText] = useState("");

    const videoConstraints = {
        facingMode: "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 }
    };

    // --- UTILITY: NUCLEAR COMPRESSION ---
    // This forces the image to be tiny (max 320px) and clean JPEG
    const compressImage = (base64Str) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = base64Str;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 320; // 🛑 Force tiny width
                const scaleSize = MAX_WIDTH / img.width;

                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Export as clean JPEG at 50% quality
                // This removes metadata and corrupt headers
                resolve(canvas.toDataURL('image/jpeg', 0.5));
            };
        });
    };

    const capture = useCallback(() => {
        if (!webcamRef.current) return;
        const imageSrc = webcamRef.current.getScreenshot(); // Take normal photo for preview
        setImage(imageSrc);
    }, [webcamRef]);

    const analyzeFood = async () => {
        if (!API_KEY) { alert("Error: API Key Missing in Vercel."); return; }

        setScanning(true);
        setStatusText("Optimizing Image...");

        try {
            // 1. Run the Compressor
            const compressedBase64 = await compressImage(image);

            // 2. Remove Header (Clean split)
            const base64Data = compressedBase64.split(',')[1];

            setStatusText("Analyzing...");
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const prompt = `
        Identify this food. Estimate calories and protein.
        Return ONLY valid JSON. Format: { "food_name": "string", "calories": number, "protein": number }
      `;

            const result = await model.generateContent({
                contents: [
                    {
                        role: "user", parts: [
                            { text: prompt },
                            { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
                        ]
                    }
                ]
            });

            const response = await result.response;
            const text = response.text();

            // 3. JSON Surgeon
            const jsonStart = text.indexOf('{');
            const jsonEnd = text.lastIndexOf('}') + 1;
            if (jsonStart === -1) throw new Error("AI did not return JSON");

            const cleanJson = text.substring(jsonStart, jsonEnd);
            const data = JSON.parse(cleanJson);

            onScanComplete(data);

        } catch (error) {
            console.error("Vision Error:", error);

            let msg = error.message;


            if (msg.includes("400")) msg = "Image Rejected (400). Try moving closer.";
            if (msg.includes("401")) msg = "API Key Invalid.";
            if (msg.includes("500")) msg = "Server Error.";
            // CHECK FOR QUOTA ERROR (429)
            if (error.message.includes("429") || error.message.includes("quota")) {
                alert("Server is busy (Too many scans). Please wait 10 seconds and try again.");
                // Optional: You could implement an auto-retry here with setTimeout
            }
            else if (error.message.includes("400")) {
                alert("Image Error. Please retake the photo.");
            }
            else {
                alert(`Error: ${error.message}`);
            }

            // Fallback so the app doesn't freeze
            onScanComplete({ food_name: "Manual Entry Required", calories: 0, protein: 0 });
        
        alert(`SCAN FAILED: ${msg}`);

       

    } finally {
        setScanning(false);
        setStatusText("");
    }
};

// Styles
const containerStyle = { width: '100%', height: '60vh', maxHeight: '500px', backgroundColor: '#000', position: 'relative', borderRadius: '12px', overflow: 'hidden', marginBottom: '1rem', border: '1px solid #333' };

return (
    <div className="glass-card p-3 text-center">
        <div className="d-flex justify-content-between mb-2">
            <h5 className="text-white m-0">📸 AI FOOD LENS</h5>
            <button onClick={onClose} className="btn btn-sm btn-outline-secondary">✕</button>
        </div>

        {!image ? (
            <>
                <div style={containerStyle}>
                    <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" videoConstraints={videoConstraints} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', top: '10%', left: '10%', right: '10%', bottom: '10%', border: '2px dashed var(--primary)', borderRadius: '12px', pointerEvents: 'none', boxShadow: '0 0 0 999px rgba(0, 0, 0, 0.5)' }}></div>
                </div>
                <button onClick={capture} className="btn btn-neon w-100 py-3">● CAPTURE</button>
            </>
        ) : (
            <>
                <div style={containerStyle}>
                    <img src={image} alt="Captured" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div className="d-flex gap-2">
                    <button onClick={() => setImage(null)} className="btn btn-outline-light grow" disabled={scanning}>RETAKE</button>
                    <button onClick={analyzeFood} className="btn btn-neon grow" disabled={scanning}>
                        {scanning ? <span className="spinner-border spinner-border-sm"></span> : 'ANALYZE'}
                    </button>
                </div>
                {scanning && <p className="text-warning mt-2 small">{statusText}</p>}
            </>
        )}
    </div>
);
}