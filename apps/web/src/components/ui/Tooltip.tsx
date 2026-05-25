import { cn } from '@/lib/utils/cn';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const positionStyles = {
  top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
  bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
  left: 'right-full mr-2 top-1/2 -translate-y-1/2',
  right: 'left-full ml-2 top-1/2 -translate-y-1/2',
};

export function Tooltip({
  content,
  children,
  position = 'top',
  className,
}: TooltipProps) {
  return (
    <div className="relative group/tooltip inline-flex">
      {children}
      <div
        className={cn(
          'absolute z-50 px-2.5 py-1.5 text-xs font-medium text-white',
          'glass rounded-lg whitespace-nowrap pointer-events-none',
          'opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200',
          positionStyles[position],
          className,
        )}
      >
        {content}
      </div>
    </div>
  );
}
