import React, { useEffect, useRef } from 'react';

const TooltipWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const currentTarget = useRef<HTMLElement | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const showTooltip = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const title = target.getAttribute('title') || target.getAttribute('data-tooltip');

      if (!title) return;

      if (target.getAttribute('title')) {
        target.setAttribute('data-tooltip', title);
        target.removeAttribute('title');
      }

      currentTarget.current = target;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        if (!tooltipRef.current) {
          tooltipRef.current = document.createElement('div');
          tooltipRef.current.className = 'fixed z-[9999] bg-primary-tip bg-opacity-80 text-white text-xs rounded py-2 px-2 shadow-lg pointer-events-none whitespace-nowrap';
          tooltipRef.current.style.transition = 'opacity 0.2s ease-in-out';
          document.body.appendChild(tooltipRef.current);
        }

        tooltipRef.current.textContent = title;
        tooltipRef.current.style.opacity = '1';

        const rect = target.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        let top = rect.top - tooltipRect.height - 8;

        // Keep tooltip within viewport
        if (left < 8) left = 8;
        if (left + tooltipRect.width > window.innerWidth - 8) {
          left = window.innerWidth - tooltipRect.width - 8;
        }
        if (top < 8) {
          // If no space above, show below
          top = rect.bottom + 8;
        }

        tooltipRef.current.style.left = `${left}px`;
        tooltipRef.current.style.top = `${top}px`;
      }, 300);
    };

    const hideTooltip = (e: MouseEvent) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (tooltipRef.current) {
        tooltipRef.current.style.opacity = '0';
        setTimeout(() => {
          if (tooltipRef.current && tooltipRef.current.parentNode) {
            tooltipRef.current.parentNode.removeChild(tooltipRef.current);
            tooltipRef.current = null;
          }
        }, 200);
      }

      // Restore title attribute
      const target = e.target as HTMLElement;
      const dataTooltip = target.getAttribute('data-tooltip');
      if (dataTooltip && !target.getAttribute('title')) {
        target.setAttribute('title', dataTooltip);
      }

      currentTarget.current = null;
    };

    // Add event listeners
    document.addEventListener('mouseover', showTooltip, true);
    document.addEventListener('mouseout', hideTooltip, true);

    return () => {
      document.removeEventListener('mouseover', showTooltip, true);
      document.removeEventListener('mouseout', hideTooltip, true);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      if (tooltipRef.current && tooltipRef.current.parentNode) {
        tooltipRef.current.parentNode.removeChild(tooltipRef.current);
      }
    };
  }, []);

  return <div ref={containerRef}>{children}</div>;
};

export default TooltipWrapper;
