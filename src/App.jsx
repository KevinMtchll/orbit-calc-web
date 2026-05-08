import { useState, useEffect, useMemo } from 'react';
import { Body, MakeTime, HelioVector } from 'astronomy-engine';
import { Button, ButtonGroup, Stack, Box, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs from 'dayjs';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import FastRewindIcon from '@mui/icons-material/FastRewind';

// Viewport settings
const width = 600;
const height = 600;
const cx = width / 2;
const cy = height / 2;
const scale = 150; // 1 AU = 150 pixels
const TRAIL_LENGTH_DAYS = 30;
const AHEAD_LENGTH_DAYS = 30;

// Define bodies with their orbital periods (in days)
const planets = [
  { name: 'Mercury', body: Body.Mercury, color: '#aaaaaa', radius: 3, period: 88 },
  { name: 'Venus', body: Body.Venus, color: '#e0b885', radius: 5, period: 225 },
  { name: 'Earth', body: Body.Earth, color: '#6b93d6', radius: 6, period: 365.25 },
  { name: 'Mars', body: Body.Mars, color: '#c1440e', radius: 4, period: 687 },
];

function generateOrbitPath(body, period) {
  let pathString = "";
  const points = 60; 
  const stepSizeDays = period / points;
  const baseTimeMs = new Date('2026-01-01T00:00:00Z').getTime();

  for (let i = 0; i <= points; i++) {
    const calcDate = new Date(baseTimeMs + (i * stepSizeDays * 86400000));
    const time = MakeTime(calcDate);
    const vec = HelioVector(body, time);
    
    const x = cx + (vec.x * scale);
    const y = cy - (vec.y * scale);

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
  
  // 1 = Forwards, 0 = Paused, -1 = Backwards
  const [timeDirection, setTimeDirection] = useState(1); 

  const orbitPaths = useMemo(() => {
    return planets.map(planet => ({
      name: planet.name,
      path: generateOrbitPath(planet.body, planet.period)
    }));
  }, []);

  // Effect handles movement based on timeDirection
  useEffect(() => {
    let timer;
    if (timeDirection !== 0) {
      timer = setInterval(() => {
        // Multiply 86,400,000ms (1 day) by the direction (-1 or 1)
        setDate(prev => new Date(prev.getTime() + (86400000 * timeDirection))); 
      }, 50);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [timeDirection]);

  const handleDateChange = (newValue) => {
    // newValue is a dayjs object provided by the picker
    if (newValue && newValue.isValid()) {
      setDate(newValue.toDate()); 
    }
  };

  const time = MakeTime(date);
  const baseTimeMs = date.getTime();

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        p: 3, 
        bgcolor: '#121212', 
        minHeight: '100vh', 
        color: 'text.primary', 
        fontFamily: 'sans-serif' 
      }}
    >
      <Typography variant="h4" sx={{mb: 4}}>
        Solar System Orbit Predictor
      </Typography>

      {/* MUI Control Panel */}
      <Stack 
        direction={{ xs: 'column', sm: 'row' }} 
        spacing={{ xs: 2, sm: 4 }}
        sx={{ mb: 4, width: '100%', justifyContent: 'center' }}
      >
        
        <ButtonGroup variant="outlined" aria-label="playback controls" sx={{ height: '56px' }}>
          <Button 
            variant={timeDirection === -1 ? 'contained' : 'outlined'}
            color="primary"
            onClick={() => setTimeDirection(-1)}
          >
            <FastRewindIcon/>
          </Button>
          <Button 
            variant={timeDirection === 0 ? 'contained' : 'outlined'}
            color="primary"
            onClick={() => setTimeDirection(0)}
          >
            <PauseIcon/>
          </Button>
          <Button 
            variant={timeDirection === 1 ? 'contained' : 'outlined'}
            color="primary"
            onClick={() => setTimeDirection(1)}
          >
            <PlayArrowIcon/>
          </Button>
        </ButtonGroup>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label="Date"
            value={dayjs(date)}
            onChange={handleDateChange}
            />
        </LocalizationProvider>
      </Stack>
      
      <Box sx={{ boxShadow: 5, borderRadius: '8px', overflow: 'hidden', width: '100%', maxWidth: 600 }}>
        <svg 
          viewBox={`0 0 ${width} ${height}`} // Maintains the 600x600 internal coordinate system
          style={{ 
            backgroundColor: '#0a0a0a', 
            display: 'block', 
            width: '100%',   // Scales to fit the Box
            height: 'auto'   // Maintains aspect ratio
          }}
        >
          
          {/* Static Background Orbit Lines */}
          {orbitPaths.map(({ name, path }) => (
            <path 
              key={`${name}-orbit`} 
              d={path} 
              fill="none" 
              stroke="rgba(255, 255, 255, 0.15)" 
              strokeWidth="1" 
            />
          ))}

          {/* The Sun */}
          <circle cx={cx} cy={cy} r={12} fill="#ffcc00" />
          
          {/* Planets & Trails */}
          {planets.map(({ name, body, color, radius }) => {
            // Current position
            const vec = HelioVector(body, time);
            const x = cx + (vec.x * scale);
            const y = cy - (vec.y * scale); 
            
            const ahead = [];
            const trails = [];
            for (let i = 0; i < TRAIL_LENGTH_DAYS; i++) {
              const t1 = MakeTime(new Date(baseTimeMs - (i * 86400000)));
              const t2 = MakeTime(new Date(baseTimeMs - ((i + 1) * 86400000)));
              const t3 = MakeTime(new Date(baseTimeMs + (i * 86400000)));
              const t4 = MakeTime(new Date(baseTimeMs + ((i + 1) * 86400000)));

              const v1 = HelioVector(body, t1);
              const v2 = HelioVector(body, t2);
              const v3 = HelioVector(body, t3);
              const v4 = HelioVector(body, t4);

              trails.push(
                <line
                  key={`${name}-trail-${i}`}
                  x1={cx + (v1.x * scale)}
                  y1={cy - (v1.y * scale)}
                  x2={cx + (v2.x * scale)}
                  y2={cy - (v2.y * scale)}
                  stroke="#585858"
                  strokeWidth={radius * 0.5}
                  strokeOpacity={0.8 * (1 - (i / TRAIL_LENGTH_DAYS))} 
                  strokeLinecap="round"
                />
              );
              ahead.push(
                <line
                  key={`${name}-ahead-${i}`}
                  x1={cx + (v3.x * scale)}
                  y1={cy - (v3.y * scale)}
                  x2={cx + (v4.x * scale)}
                  y2={cy - (v4.y * scale)}
                  stroke="#0a0a0a"
                  strokeWidth={radius * 0.5}
                  strokeOpacity={1 * (1 - (i / AHEAD_LENGTH_DAYS))}
                  strokeLinecap="round"
                />
              );
            }

            return (
              <g key={name}>
                {trails}
                {ahead}
                {/* Render planet and label */}
                <circle cx={x} cy={y} r={radius} fill={color} />
                <text x={x + 10} y={y + 4} fill="white" fontSize="10">{name}</text>
              </g>
            );
          })}
        </svg>
      </Box>
      <Typography sx={{mt: 4}}>
        All calculations are credited to Astronomical Algorithms by Jean Meeus.
      </Typography>
    </Box>
  );
}