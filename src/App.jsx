import { useState, useEffect, useMemo } from 'react';
import { Body, MakeTime, HelioVector } from 'astronomy-engine';
import { Button, ButtonGroup, Stack, Box, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs from 'dayjs';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

const TRAIL_LENGTH_DAYS = 30;
const AHEAD_LENGTH_DAYS = 30;

const planets = [
  { name: 'Mercury', body: Body.Mercury, color: '#aaaaaa', radius: 3, period: 88 },
  { name: 'Venus', body: Body.Venus, color: '#e0b885', radius: 5, period: 225 },
  { name: 'Earth', body: Body.Earth, color: '#6b93d6', radius: 6, period: 365.25 },
  { name: 'Mars', body: Body.Mars, color: '#c1440e', radius: 4, period: 687 },
  { name: 'Jupiter', body: Body.Jupiter, color: '#d39c7e', radius: 10, period: 4333 },
  { name: 'Saturn', body: Body.Saturn, color: '#c5ab6e', radius: 9, period: 10759 },
  { name: 'Uranus', body: Body.Uranus, color: '#b5e3e3', radius: 7, period: 30687 },
  { name: 'Neptune', body: Body.Neptune, color: '#175e9e', radius: 7, period: 60190 },
  { name: 'Pluto', body: Body.Pluto, color: '#fff4f3', radius: 2, period: 90560 }
];

const project = (vec, tiltDegrees, rotationDegrees, currentScale, cx, cy) => {
  const theta = tiltDegrees * (Math.PI / 180); 
  const phi = rotationDegrees * (Math.PI / 180); 
  
  const x_zRot = vec.x * Math.cos(phi) - vec.y * Math.sin(phi);
  const y_zRot = vec.x * Math.sin(phi) + vec.y * Math.cos(phi);
  const z_zRot = vec.z; 

  const y_final = y_zRot * Math.cos(theta) - z_zRot * Math.sin(theta);
  const x_final = x_zRot; 
  
  return {
    x: cx + (x_final * currentScale),
    y: cy - (y_final * currentScale)
  };
};

function generateOrbitPath(body, period, tiltDeg, rotationDeg, currentScale, cx, cy) {
  let pathString = "";
  const points = 120; 
  const stepSizeDays = period / points;
  const baseTimeMs = new Date('2026-01-01T00:00:00Z').getTime();

  for (let i = 0; i <= points; i++) {
    const calcDate = new Date(baseTimeMs + (i * stepSizeDays * 86400000));
    const time = MakeTime(calcDate);
    const vec = HelioVector(body, time);
    
    const { x, y } = project(vec, tiltDeg, rotationDeg, currentScale, cx, cy);

    if (i === 0) {
      pathString += `M ${x} ${y} `;
    } else {
      pathString += `L ${x} ${y} `;
    }
  }
  return pathString + "Z"; 
}

export default function SolarSystem2D() {
  const [date, setDate] = useState(new Date('2026-05-08T00:00:00Z'));
  const [timeDirection, setTimeDirection] = useState(1); 
  
  const [dimensions, setDimensions] = useState({ 
    width: window.innerWidth, 
    height: window.innerHeight 
  });

  const [tiltDeg, setTiltDeg] = useState(45); 
  const [rotationDeg, setRotationDeg] = useState(0); 
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(150); 
  const [dragState, setDragState] = useState({ isDragging: false, button: null, lastX: 0, lastY: 0 });

  const cx = dimensions.width / 2;
  const cy = dimensions.height / 2;

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const orbitPaths = useMemo(() => {
    return planets.map(planet => ({
      name: planet.name,
      path: generateOrbitPath(planet.body, planet.period, tiltDeg, rotationDeg, scale, cx, cy)
    }));
  }, [tiltDeg, rotationDeg, scale, cx, cy]);

  useEffect(() => {
    let timer;
    if (timeDirection !== 0) {
      timer = setInterval(() => {
        setDate(prev => new Date(prev.getTime() + (86400000 * timeDirection))); 
      }, 50);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [timeDirection]);

  const handlePointerDown = (e) => {
    if (e.button !== 0 && e.button !== 2) return;
    
    e.target.setPointerCapture(e.pointerId);
    setDragState({ 
      isDragging: true, 
      button: e.button, 
      lastX: e.clientX, 
      lastY: e.clientY 
    });
  };

  const handlePointerMove = (e) => {
    if (!dragState.isDragging) return;

    const dx = e.clientX - dragState.lastX;
    const dy = e.clientY - dragState.lastY;

    if (dragState.button === 0) {
      // left click -> pan
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    } else if (dragState.button === 2) {
      // right click -> rotate (dx) and tilt (dy)
      setRotationDeg(prev => (prev + (dx * 0.5)) % 360);
      setTiltDeg(prev => {
        const newTilt = prev - (dy * 0.5); 
        return Math.max(0, Math.min(90, newTilt)); 
      });
    }

    setDragState(prev => ({ ...prev, lastX: e.clientX, lastY: e.clientY }));
  };

  const handlePointerUp = (e) => {
    if (dragState.isDragging) {
      e.target.releasePointerCapture(e.pointerId);
      setDragState({ isDragging: false, button: null, lastX: 0, lastY: 0 });
    }
  };

  const handleWheel = (e) => {
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1; 
    setScale(prev => Math.max(0.5, Math.min(2000, prev * zoomFactor)));
  };

  const handleDateChange = (newValue) => {
    if (newValue && newValue.isValid()) setDate(newValue.toDate()); 
  };

  const time = MakeTime(date);
  const baseTimeMs = date.getTime();

  return (
    <Box sx={{ width: '100vw', height: '100vh', overflow: 'hidden', bgcolor: '#0a0a0a', position: 'relative', fontFamily: 'sans-serif' }}>
      
      <Box 
        sx={{ 
          position: 'absolute', 
          top: 24, 
          left: 24, 
          zIndex: 10, 
          bgcolor: 'rgba(30, 30, 30, 0.85)', 
          p: 3, 
          borderRadius: 2, 
          backdropFilter: 'blur(8px)',
          boxShadow: 3,
          color: 'text.primary',
          maxWidth: { xs: 'calc(100vw - 48px)', sm: 'auto' }
        }}
      >
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
          Solar System
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
          <ButtonGroup variant="outlined" sx={{ height: '56px', bgcolor: 'rgba(0,0,0,0.3)' }}>
            <Button variant={timeDirection === -1 ? 'contained' : 'outlined'} onClick={() => setTimeDirection(-1)}>
              <PlayArrowIcon sx={{ transform: 'rotate(180deg)' }}/>
            </Button>
            <Button variant={timeDirection === 0 ? 'contained' : 'outlined'} onClick={() => setTimeDirection(0)}>
              <PauseIcon/>
            </Button>
            <Button variant={timeDirection === 1 ? 'contained' : 'outlined'} onClick={() => setTimeDirection(1)}>
              <PlayArrowIcon/>
            </Button>
          </ButtonGroup>
          
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker 
              label="Date" 
              value={dayjs(date)} 
              onChange={handleDateChange} 
              sx={{ '& .MuiInputBase-root': { bgcolor: 'rgba(0,0,0,0.3)' } }}
            />
          </LocalizationProvider>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 3, maxWidth: 300 }}>
          Left Drag: Pan <br/> Right Drag: Rotate & Tilt <br/> Scroll: Zoom
        </Typography>
      </Box>

      <svg 
        viewBox={`${-pan.x} ${-pan.y} ${dimensions.width} ${dimensions.height}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }}
        onContextMenu={(e) => e.preventDefault()}
        style={{ 
          display: 'block', 
          width: '100%',
          height: '100%',
          cursor: dragState.isDragging && dragState.button === 0 ? 'grabbing' 
                : dragState.isDragging && dragState.button === 2 ? 'move'
                : 'crosshair',
          touchAction: 'none',
          overscrollBehavior: 'none'
        }}
      >
        
        {orbitPaths.map(({ name, path }) => (
          <path key={`${name}-orbit`} d={path} fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1" />
        ))}

        <circle cx={cx} cy={cy} r={12} fill="#ffcc00" />
        
        {planets.map(({ name, body, color, radius }) => {
          const vec = HelioVector(body, time);
          const { x, y } = project(vec, tiltDeg, rotationDeg, scale, cx, cy); 
          
          const ahead = [];
          const trails = [];
          for (let i = 0; i < TRAIL_LENGTH_DAYS; i++) {
            const t1 = MakeTime(new Date(baseTimeMs - (i * 86400000)));
            const t2 = MakeTime(new Date(baseTimeMs - ((i + 1) * 86400000)));
            const t3 = MakeTime(new Date(baseTimeMs + (i * 86400000)));
            const t4 = MakeTime(new Date(baseTimeMs + ((i + 1) * 86400000)));

            const p1 = project(HelioVector(body, t1), tiltDeg, rotationDeg, scale, cx, cy);
            const p2 = project(HelioVector(body, t2), tiltDeg, rotationDeg, scale, cx, cy);
            const p3 = project(HelioVector(body, t3), tiltDeg, rotationDeg, scale, cx, cy);
            const p4 = project(HelioVector(body, t4), tiltDeg, rotationDeg, scale, cx, cy);

            trails.push(
              <line
                key={`${name}-trail-${i}`}
                x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke="#585858" strokeWidth={radius * 0.5} strokeLinecap="round"
                strokeOpacity={0.8 * (1 - (i / TRAIL_LENGTH_DAYS))} 
              />
            );
            ahead.push(
              <line
                key={`${name}-ahead-${i}`}
                x1={p3.x} y1={p3.y} x2={p4.x} y2={p4.y}
                stroke="#151515" strokeWidth={radius * 0.5} strokeLinecap="round"
                strokeOpacity={1 * (1 - (i / AHEAD_LENGTH_DAYS))}
              />
            );
          }

          return (
            <g key={name}>
              {trails}
              {ahead}
              <circle cx={x} cy={y} r={radius} fill={color} />
              <text x={x + 10} y={y + 4} fill="white" fontSize="10" opacity={0.8}>{name}</text>
            </g>
          );
        })}
      </svg>
    </Box>
  );
}