import { useEffect, useState, useMemo } from 'react';
import { Sparkles, Star, Circle } from 'lucide-react';

// 获取文件类型主题
export function getFileTheme(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
  const videoExts = ['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv'];
  const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'];
  const codeExts = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'go', 'rs', 'php', 'rb', 'swift'];
  const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'];
  
  if (imageExts.includes(ext)) return 'theme-image';
  if (videoExts.includes(ext)) return 'theme-video';
  if (audioExts.includes(ext)) return 'theme-audio';
  if (codeExts.includes(ext)) return 'theme-code';
  if (archiveExts.includes(ext)) return 'theme-archive';
  return 'theme-document';
}

// 浮动粒子组件
interface FloatingParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

export function FloatingParticles({ count = 20, className = '' }: { count?: number; className?: string }) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * 5,
      opacity: Math.random() * 0.3 + 0.1,
    }));
  }, [count]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full bg-primary animate-float"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            opacity: particle.opacity,
            animationDuration: `${particle.duration}s`,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// 星星装饰组件
export function StarDecoration({ className = '' }: { className?: string }) {
  const stars = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => ({
      id: i,
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 80,
      size: Math.random() * 16 + 8,
      delay: Math.random() * 2,
    }));
  }, []);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {stars.map((star) => (
        <Sparkles
          key={star.id}
          className="absolute text-primary/30 animate-sparkle"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// 渐变光晕背景
export function GradientOrbs({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* 主光晕 */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full animate-float"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)',
          left: '-10%',
          top: '-20%',
          animationDuration: '20s',
        }}
      />
      {/* 次光晕 */}
      <div
        className="absolute w-[400px] h-[400px] rounded-full animate-float"
        style={{
          background: 'radial-gradient(circle, hsl(var(--accent) / 0.12) 0%, transparent 70%)',
          right: '-5%',
          bottom: '-10%',
          animationDuration: '15s',
          animationDelay: '2s',
        }}
      />
      {/* 小光晕 */}
      <div
        className="absolute w-[200px] h-[200px] rounded-full animate-float"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.1) 0%, transparent 70%)',
          right: '20%',
          top: '10%',
          animationDuration: '12s',
          animationDelay: '4s',
        }}
      />
    </div>
  );
}

// 网格背景
export function GridBackground({ className = '' }: { className?: string }) {
  return (
    <div
      className={`absolute inset-0 pointer-events-none opacity-[0.03] ${className}`}
      style={{
        backgroundImage: `
          linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
          linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }}
    />
  );
}

// 动态数字计数器
export function AnimatedCounter({ 
  value, 
  duration = 1000,
  className = '' 
}: { 
  value: number; 
  duration?: number;
  className?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const startValue = displayValue;
    const diff = value - startValue;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + diff * eased);
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span className={className}>{displayValue.toLocaleString()}</span>;
}

// 打字机效果
export function TypewriterText({ 
  text, 
  speed = 50,
  className = '' 
}: { 
  text: string; 
  speed?: number;
  className?: string;
}) {
  const [displayText, setDisplayText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    setDisplayText('');
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
        // 光标闪烁一会后消失
        setTimeout(() => setShowCursor(false), 2000);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  return (
    <span className={className}>
      {displayText}
      {showCursor && <span className="animate-pulse">|</span>}
    </span>
  );
}

// 进度环
export function ProgressRing({
  progress,
  size = 80,
  strokeWidth = 6,
  className = '',
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        {/* 背景环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-muted"
        />
        {/* 进度环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-primary transition-all duration-500 ease-out"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            strokeLinecap: 'round',
          }}
        />
      </svg>
      <span className="absolute text-sm font-medium">{Math.round(progress)}%</span>
    </div>
  );
}

// 脉冲效果按钮包装器
export function PulseWrapper({ 
  children, 
  active = true,
  className = '' 
}: { 
  children: React.ReactNode; 
  active?: boolean;
  className?: string;
}) {
  if (!active) return <>{children}</>;

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 rounded-xl bg-primary/20 animate-ping" />
      <div className="relative">{children}</div>
    </div>
  );
}

// 霓虹文字效果
export function NeonText({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span 
      className={`relative ${className}`}
      style={{
        textShadow: `
          0 0 5px hsl(var(--primary) / 0.5),
          0 0 10px hsl(var(--primary) / 0.4),
          0 0 20px hsl(var(--primary) / 0.3),
          0 0 40px hsl(var(--primary) / 0.2)
        `,
      }}
    >
      {children}
    </span>
  );
}

// 悬浮卡片效果
export function HoverCard3D({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  const [transform, setTransform] = useState('');
  const [glare, setGlare] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = (y - centerY) / 20;
    const rotateY = (centerX - x) / 20;
    
    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`);
    setGlare({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 });
  };

  const handleMouseLeave = () => {
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg)');
    setGlare({ x: 50, y: 50 });
  };

  return (
    <div
      className={`relative transition-transform duration-200 ease-out ${className}`}
      style={{ transform, transformStyle: 'preserve-3d' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* 光泽效果 */}
      <div
        className="absolute inset-0 rounded-xl pointer-events-none opacity-0 hover:opacity-100 transition-opacity"
        style={{
          background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, hsl(var(--primary) / 0.15), transparent 50%)`,
        }}
      />
      {children}
    </div>
  );
}
