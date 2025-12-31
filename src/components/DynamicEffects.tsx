import { useEffect, useState, useRef } from 'react';
import { Shield, Zap, Lock, Cloud, Globe, Server } from 'lucide-react';

// 动态渐变背景
export function AnimatedGradientBg({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -20%, hsl(var(--primary) / 0.3), transparent),
            radial-gradient(ellipse 60% 40% at 100% 50%, hsl(var(--accent) / 0.2), transparent),
            radial-gradient(ellipse 50% 30% at 0% 80%, hsl(var(--primary) / 0.15), transparent)
          `,
        }}
      />
    </div>
  );
}

// 竖线背景效果
export function FlowingLines({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      <div 
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: `linear-gradient(90deg, hsl(var(--primary) / 0.5) 1px, transparent 1px)`,
          backgroundSize: '80px 100%',
          animation: 'gridPulse 4s ease-in-out infinite',
        }}
      />
      <div 
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px)`,
          backgroundSize: '20px 100%',
        }}
      />
      <style>{`
        @keyframes gridPulse {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.25; }
        }
      `}</style>
    </div>
  );
}

// 特性卡片滚动展示
const features = [
  { icon: Shield, text: '端到端加密', color: 'text-green-500' },
  { icon: Zap, text: '极速传输', color: 'text-yellow-500' },
  { icon: Lock, text: '阅后即焚', color: 'text-blue-500' },
  { icon: Cloud, text: '云端存储', color: 'text-purple-500' },
  { icon: Globe, text: '全球加速', color: 'text-cyan-500' },
  { icon: Server, text: '边缘计算', color: 'text-orange-500' },
];

export function FeatureMarquee({ className = '' }: { className?: string }) {
  return (
    <div className={`overflow-hidden py-4 ${className}`}>
      <div className="flex animate-marquee">
        {[...features, ...features].map((feature, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-6 py-2 mx-2 rounded-full bg-muted/50 border border-border/50 whitespace-nowrap"
          >
            <feature.icon className={`h-4 w-4 ${feature.color}`} />
            <span className="text-sm text-muted-foreground">{feature.text}</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}

// 打字机标题
export function TypewriterTitle({ 
  texts, 
  className = '' 
}: { 
  texts: string[];
  className?: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentText = texts[currentIndex];
    const speed = isDeleting ? 50 : 100;

    const timer = setTimeout(() => {
      if (!isDeleting) {
        if (displayText.length < currentText.length) {
          setDisplayText(currentText.slice(0, displayText.length + 1));
        } else {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        if (displayText.length > 0) {
          setDisplayText(displayText.slice(0, -1));
        } else {
          setIsDeleting(false);
          setCurrentIndex((prev) => (prev + 1) % texts.length);
        }
      }
    }, speed);

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, currentIndex, texts]);

  return (
    <span className={className}>
      {displayText}
      <span className="animate-pulse text-primary">|</span>
    </span>
  );
}

// 统计数字动画
export function AnimatedStats({ className = '' }: { className?: string }) {
  const stats = [
    { value: 99.9, suffix: '%', label: '可用性' },
    { value: 50, suffix: 'ms', label: '响应速度' },
    { value: 256, suffix: 'bit', label: '加密强度' },
  ];

  return (
    <div className={`flex justify-center gap-8 ${className}`}>
      {stats.map((stat, i) => (
        <div key={i} className="text-center">
          <div className="text-2xl font-bold text-primary">
            <CountUp end={stat.value} duration={2} delay={i * 0.2} />
            <span className="text-sm ml-1">{stat.suffix}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

function CountUp({ 
  end, 
  duration = 2, 
  delay = 0 
}: { 
  end: number; 
  duration?: number; 
  delay?: number;
}) {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const animate = (timestamp: number) => {
        if (!startRef.current) startRef.current = timestamp;
        const progress = Math.min((timestamp - startRef.current) / (duration * 1000), 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(end * eased);
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    }, delay * 1000);

    return () => clearTimeout(timeout);
  }, [end, duration, delay]);

  return <>{value.toFixed(end % 1 === 0 ? 0 : 1)}</>;
}

// 脉冲点装饰
export function PulsingDots({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-primary/30"
          style={{
            left: `${15 + (i % 3) * 35}%`,
            top: `${20 + Math.floor(i / 3) * 60}%`,
            animation: `pulse 2s ease-in-out infinite`,
            animationDelay: `${i * 0.3}s`,
          }}
        />
      ))}
    </div>
  );
}

// 渐变边框卡片
export function GradientBorderCard({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative p-[1px] rounded-xl overflow-hidden ${className}`}>
      <div 
        className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary animate-gradient-x"
        style={{ backgroundSize: '200% 100%' }}
      />
      <div className="relative bg-card rounded-xl">
        {children}
      </div>
      <style>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          animation: gradient-x 3s ease infinite;
        }
      `}</style>
    </div>
  );
}

// 悬浮提示气泡
export function FloatingTips({ tips, className = '' }: { tips: string[]; className?: string }) {
  const [currentTip, setCurrentTip] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrentTip((prev) => (prev + 1) % tips.length);
        setVisible(true);
      }, 300);
    }, 4000);

    return () => clearInterval(interval);
  }, [tips.length]);

  return (
    <div className={`text-center ${className}`}>
      <div
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border/50 text-sm text-muted-foreground transition-all duration-300 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
      >
        <span className="text-primary">💡</span>
        {tips[currentTip]}
      </div>
    </div>
  );
}

// 波浪分隔线
export function WaveDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`relative h-12 overflow-hidden ${className}`}>
      <svg
        className="absolute bottom-0 w-full h-12"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
      >
        <path
          d="M0,60 C150,120 350,0 600,60 C850,120 1050,0 1200,60 L1200,120 L0,120 Z"
          className="fill-muted/30"
        />
        <path
          d="M0,80 C200,120 400,40 600,80 C800,120 1000,40 1200,80 L1200,120 L0,120 Z"
          className="fill-muted/20"
        />
      </svg>
    </div>
  );
}
