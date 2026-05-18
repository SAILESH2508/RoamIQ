import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const DownloadReportButton = ({ weatherData, predictionData, hourlyData, locationName }) => {
    const generatePDF = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const today = new Date().toLocaleDateString();

        // --- Header ---
        doc.setFillColor(255, 107, 0); // Strict Orange
        doc.rect(0, 0, pageWidth, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text("Weather Forecast Report", pageWidth / 2, 18, { align: 'center' });

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        const locationText = locationName ? locationName.toUpperCase() : "UNKNOWN LOCATION";
        doc.text(`Location: ${locationText}`, pageWidth / 2, 28, { align: 'center' });
        doc.text(`Date: ${today}`, pageWidth / 2, 35, { align: 'center' });

        let yPos = 50;

        // --- Current Weather Section ---
        if (weatherData) {
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text("Current Conditions", 14, yPos);
            yPos += 10;

            // Extract current data safely
            const temp = weatherData.temperature ?? weatherData.current_weather?.temperature ?? 'N/A';
            const wind = weatherData.wind_speed ?? weatherData.current_weather?.windspeed ?? 'N/A';
            const rain = weatherData.rainfall ?? weatherData.current_weather?.rain ?? 'N/A';
            const condition = weatherData.description ?? 'N/A';

            const currentData = [
                ['Temperature', `${temp}°C`],
                ['Condition', condition],
                ['Wind Speed', `${wind} km/h`],
                ['Rainfall', `${rain} mm`],
            ];

            autoTable(doc, {
                startY: yPos,
                head: [['Metric', 'Value']],
                body: currentData,
                theme: 'grid',
                headStyles: { fillColor: [255, 107, 0] },
                styles: { fontSize: 11 },
                margin: { left: 14, right: 14 }
            });

            yPos = doc.lastAutoTable.finalY + 15;
        }

        // --- Hourly Forecast Section ---
        if (hourlyData && hourlyData.time && hourlyData.time.length > 0) {
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text("Hourly Forecast (Next 24 Hours)", 14, yPos);
            yPos += 10;

            // Prepare 24-hour data
            // Open-Meteo returns a long list. We usually want the next ~24 hours from now.
            // For simplicity, we'll take the first 12-24 entries or based on current index if possible.
            // Here we just take the first 12 entries for brevity in the PDF.


            // Simple logic: If time is ISO string, find closest current hour. 
            // Assuming hourlyData.time corresponds to now onwards or full day.
            // We'll just take the first 10 rows to not overflow the page too much initially.

            const rows = [];
            const limit = Math.min(hourlyData.time.length, 12);

            for (let i = 0; i < limit; i++) {
                const timeVal = hourlyData.time[i];
                const t = timeVal ? new Date(timeVal) : null;
                const timeStr = (t && !isNaN(t)) ? t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
                const dateStr = (t && !isNaN(t)) ? `${t.getDate()}/${t.getMonth() + 1}` : '--/--';
                
                rows.push([
                    `${dateStr} ${timeStr}`,
                    `${hourlyData.temperature_2m?.[i] ?? '--'}°C`,
                    `${hourlyData.rain?.[i] ?? '--'} mm`,
                    `${hourlyData.weather_code?.[i] ?? '--'}`
                ]);
            }

            autoTable(doc, {
                startY: yPos,
                head: [['Time', 'Temp', 'Rain', 'Code']],
                body: rows,
                theme: 'striped',
                headStyles: { fillColor: [255, 133, 51] }, // Lighter Orange for Hourly
                styles: { fontSize: 10 },
                margin: { left: 14, right: 14 }
            });

            yPos = doc.lastAutoTable.finalY + 15;
        }

        // --- AI Prediction Section ---
        if (predictionData) {
            // Check if we need new page
            if (yPos > 240) {
                doc.addPage();
                yPos = 20;
            }

            doc.setTextColor(0, 0, 0);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text("AI Forecast Studio", 14, yPos);
            yPos += 10;

            let predictionRows = [];
            const pTemp = predictionData.predicted_temperature ?? predictionData.predicted_avg_temp;
            const pRain = predictionData.predicted_rainfall ?? predictionData.predicted_total_rainfall;

            const displayTemp = (pTemp !== undefined && pTemp !== null && !isNaN(Number(pTemp))) 
                ? `${Number(pTemp).toFixed(1)}°C` 
                : 'N/A';
            const displayRain = (pRain !== undefined && pRain !== null && !isNaN(Number(pRain))) 
                ? `${Number(pRain).toFixed(1)} mm` 
                : 'N/A';

            predictionRows = [[
                'AI Analysis',
                displayTemp,
                displayRain
            ]];

            if (predictionData.alerts && predictionData.alerts.length > 0) {
                predictionRows.push(['ALERTS', predictionData.alerts.join(', '), '']);
            }

            autoTable(doc, {
                startY: yPos,
                head: [['Type', 'Predicted Temp', 'Predicted Rain']],
                body: predictionRows,
                theme: 'striped',
                headStyles: { fillColor: [230, 81, 0] }, // Deep Orange for AI
                styles: { fontSize: 11 },
                margin: { left: 14, right: 14 }
            });

            // Footer might need adjustment if on new page, but simplistic for now
        }

        // --- Footer ---
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.setTextColor(150, 150, 150);
            const footerText = `Generated by AI Weather System - Page ${i} of ${pageCount}`;
            doc.text(footerText, pageWidth / 2, 285, { align: 'center' });
        }

        // Save
        const fileName = `Weather_Report_${locationName || 'Location'}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
    };

    return (
        <button
            onClick={generatePDF}
            className="btn w-100 fw-black text-uppercase border-0 py-3 mt-3 d-flex align-items-center justify-content-center gap-2"
            disabled={!weatherData}
            style={{ 
                background: 'linear-gradient(135deg, #34d399 0%, #059669 100%)', 
                color: 'white', 
                borderRadius: '8px',
                fontSize: '0.88rem',
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                letterSpacing: '0.7px',
                boxShadow: '0 4px 18px rgba(5, 150, 105, 0.3)'
            }}
            onMouseOver={(e) => {
                e.currentTarget.style.transform = 'scale(1.02) translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(5, 150, 105, 0.48)';
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.transform = 'scale(1.0)';
                e.currentTarget.style.boxShadow = '0 4px 18px rgba(5, 150, 105, 0.3)';
            }}
        >
            <span className="fs-6">📥</span>
            <span>Download Full Intelligence Report</span>
        </button>
    );
};

export default DownloadReportButton;
