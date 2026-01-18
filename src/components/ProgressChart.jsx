import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

// Register "Filler" for the area effect
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const ProgressChart = ({ history }) => {
  const data = {
    labels: history.map(entry => entry.date),
    datasets: [
      {
        label: 'Weight',
        data: history.map(entry => entry.weight),
        borderColor: '#FF003C', // Neon Red
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
          gradient.addColorStop(0, 'rgba(255, 0, 60, 0.5)'); // Top
          gradient.addColorStop(1, 'rgba(255, 0, 60, 0)');   // Bottom
          return gradient;
        },
        fill: true, // Fill area under line
        tension: 0.4, // Smooth curves
        pointRadius: 6,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#FF003C',
        pointBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false }, // Hide legend for cleaner look
      tooltip: { 
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleColor: '#FF003C',
        bodyFont: { size: 14 }
      }
    },
    scales: {
      x: { 
        grid: { display: false }, 
        ticks: { color: '#666' } 
      },
      y: { 
        grid: { color: '#333', borderDash: [5, 5] }, 
        ticks: { color: '#666' } 
      }
    }
  };

  return (
    <div>
      <h5 className="mb-4 text-white">PERFORMANCE TREND</h5>
      <Line data={data} options={options} />
    </div>
  );
};

export default ProgressChart;