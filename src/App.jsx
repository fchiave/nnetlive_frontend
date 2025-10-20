import { useRef, useState, useEffect } from 'react'
import './App.css'

function App() {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mnistData, setMnistData] = useState([]);
  const ws = useRef(null);
  const [prediction, setPrediction] = useState(null)

  let lastPredictionTime = 0;
  const PREDICTION_INTERVAL = 150; // in ms (~10 fps)
  
  // Websocket setup
  useEffect(() => {
    ws.current = new WebSocket("ws://localhost:8000/nn/ws")
    ws.current.onopen = () => console.log("Websocket connected");
    ws.current.onmessage = (e) => {
      console.log(e)
      const data = JSON.parse(e.data);
      setPrediction(data)
      console.log("Prediction: ", data);
    };
    ws.current.onclose = () => console.log("Websocket closed");

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      };
    };
  }, []);

  // Drawing setup
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Set 'paintbrush' options
    ctx.lineWidth = 20;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = "white";
    
    // Handling mouse events for drawing
    const handleMouseDown = (e) => {
      setIsDrawing(true);
      ctx.beginPath();
      ctx.moveTo(e.offsetX, e.offsetY);
    };

    const handleMouseMove = (e) => {
      if (!isDrawing) return;
      ctx.lineTo(e.offsetX, e.offsetY);
      ctx.stroke();
    }

    const handleMouseUp = () => setIsDrawing(false);
    const handlemouseOut = () => setIsDrawing(false);

    // Add handlers to events
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseout", handlemouseOut);
    canvas.addEventListener("mousemove", handleMouseMove);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mouseout", handlemouseOut);
      canvas.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isDrawing]);

  // Export setup
  useEffect (() => {
    let animationId;

    const exportLoop = (timestamp) => {
      const now = timestamp;
      if (now - lastPredictionTime >= PREDICTION_INTERVAL) {
        lastPredictionTime = now;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const exportCanvas = document.createElement("canvas")
        exportCanvas.width = 28;
        exportCanvas.height = 28;
        const exportCtx = exportCanvas.getContext("2d");

        // downscale user canvas to export canvas size
        exportCtx.drawImage(canvas, 0, 0, 28, 28);

        //convert to grayscale
        const imageData = exportCtx.getImageData(0, 0, 28, 28);
        const pixels = [];
        for (let i = 0; i < imageData.data.length; i+= 4){
          const r = imageData.data[i];
          const g = imageData.data[i + 1];
          const b = imageData.data[i + 2];
          const gray = (r + g + b) / 3;
          pixels.push(gray / 255);
        }
        
        setMnistData(pixels);
        
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ pixels }));
        }
        
      }

      animationId = requestAnimationFrame(exportLoop)
    };

    animationId = requestAnimationFrame(exportLoop);
    return () => cancelAnimationFrame(animationId);
  })

  // Canvas clearing setup
  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  return (
    <div style={{ display: "flex", gap: "20px", flexDirection: "row", alignItems: "center" }}>
      <div style={{padding: "20px"}}>
        <h1>Drawing Canvas</h1>
        <canvas
          ref={canvasRef}
          width={280}
          height={280}
          style={{
            border: "2px solid red",
            background: "black",
            cursor: "crosshair",
            display: "block",
            marginTop: "20px",
          }}
        />
        <button onClick={handleClear} style={{ marginTop: "20px" }}>
          Clear Canvas
        </button>
      </div>
      <div style={{ fontSize: "1.2rem", width: "200px"}}>
        <h3>Predictions:</h3>
        {prediction ? (
          <ul>
            {["p1", "p2", "p3"].map((key) => (
              <li key={key}>
                {prediction[key].label} — {(prediction[key].confidence * 100).toFixed(3)}%
              </li>
            ))}
          </ul>
        ) : (
          <p>Waiting for prediction...</p>
        )}
      </div>
    </div>
  )
}

export default App
