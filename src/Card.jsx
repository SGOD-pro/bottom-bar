import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { buildLiquidGlassFilter } from './liquidGlass';

const Card = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const indicatorRef = useRef(null);
  const filterDefsRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    const indicator = indicatorRef.current;
    const filterDefs = filterDefsRef.current;
    if (!indicator || !filterDefs) return undefined;

    let previousSize = '';
    let resizeTimer;
    const updateFilter = () => {
      const { width, height } = indicator.getBoundingClientRect();
      const size = `${Math.round(width)}x${Math.round(height)}`;
      if (size === previousSize) return;

      filterDefs.innerHTML = buildLiquidGlassFilter(indicator);
      previousSize = size;
    };

    updateFilter();
    const resizeObserver = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(updateFilter, 120);
    });
    resizeObserver.observe(indicator);

    return () => {
      resizeObserver.disconnect();
      window.clearTimeout(resizeTimer);
    };
  }, []);

  const selectItemUnderPointer = (event) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;

    const menu = event.currentTarget;
    const indicator = indicatorRef.current;
    const menuBounds = menu.getBoundingClientRect();
    const baseWidth = (menuBounds.width - 40) / 4;
    const maxOffset = 3 * (baseWidth + 8);

    if (!drag.isDragging) {
      if (Math.abs(event.clientX - drag.startX) < 5) return;

      drag.isDragging = true;
      menu.setPointerCapture(event.pointerId);
      setIsDragging(true);
    }

    drag.targetOffset = Math.min(
      Math.max(event.clientX - menuBounds.left - 8 - baseWidth / 2, 0),
      maxOffset,
    );
    drag.position = drag.targetOffset / (maxOffset / 3);

    if (drag.frameId === null) {
      const updatePosition = () => {
        const currentDrag = dragRef.current;
        if (!currentDrag) return;

        const distance = currentDrag.targetOffset - currentDrag.currentOffset;
        currentDrag.currentOffset += distance * 0.4;
        if (Math.abs(distance) < 0.15) currentDrag.currentOffset = currentDrag.targetOffset;

        indicator.style.setProperty('--drag-offset', `${currentDrag.currentOffset}px`);
        const nextIndex = Math.round(currentDrag.position);
        if (nextIndex !== currentDrag.activeIndex) {
          currentDrag.activeIndex = nextIndex;
          setActiveIndex(nextIndex);
        }

        if (currentDrag.currentOffset !== currentDrag.targetOffset) {
          currentDrag.frameId = requestAnimationFrame(updatePosition);
        } else {
          currentDrag.frameId = null;
        }
      };

      drag.frameId = requestAnimationFrame(updatePosition);
    }
  };

  const startDragging = (event) => {
    if (event.button !== 0) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      isDragging: false,
      targetOffset: 0,
      currentOffset: 0,
      position: activeIndex,
      activeIndex,
      frameId: null,
    };
  };

  const stopDragging = (event) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;

    if (!drag.isDragging) {
      dragRef.current = null;
      return;
    }

    if (drag.frameId !== null) cancelAnimationFrame(drag.frameId);
    dragRef.current = null;
    indicatorRef.current.style.removeProperty('--drag-offset');
    setActiveIndex(Math.round(drag.position));
    setIsDragging(false);
  };

  const selectItem = (index) => {
    setActiveIndex(index);
  };

  return (
    <StyledWrapper>
      <svg className="filter-definitions" aria-hidden="true" colorInterpolationFilters="sRGB">
        <defs ref={filterDefsRef} />
      </svg>
      <div
        className={`menu${isDragging ? ' is-dragging' : ''}`}
        style={{ '--active-index': activeIndex }}
        onPointerMove={selectItemUnderPointer}
        onPointerDown={startDragging}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
      >
        <div ref={indicatorRef} className="active-indicator" aria-hidden="true" />
        <a href="#" draggable="false" className={activeIndex === 0 ? 'active' : ''} data-index={0} onClick={(event) => { event.preventDefault(); selectItem(0); }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
            <path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" />
            <path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" />
          </svg>
          <span>Home</span>
        </a>
        <a href="#" draggable="false" className={activeIndex === 1 ? 'active' : ''} data-index={1} onClick={(event) => { event.preventDefault(); selectItem(1); }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
            <path d="M19.5 21a3 3 0 0 0 3-3v-4.5a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3V18a3 3 0 0 0 3 3h15ZM1.5 10.146V6a3 3 0 0 1 3-3h5.379a2.25 2.25 0 0 1 1.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 0 1 3 3v1.146A4.483 4.483 0 0 0 19.5 9h-15a4.483 4.483 0 0 0-3 1.146Z" />
          </svg>
          <span>Files</span>
        </a>
        <a href="#" draggable="false" className={activeIndex === 2 ? 'active' : ''} data-index={2} onClick={(event) => { event.preventDefault(); selectItem(2); }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
            <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 0 1 7.5 3v1.5h9V3A.75.75 0 0 1 18 3v1.5h.75a3 3 0 0 1 3 3v11.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3H6V3a.75.75 0 0 1 .75-.75Zm13.5 9a1.5 1.5 0 0 0-1.5-1.5H5.25a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5v-7.5Z" clipRule="evenodd" />
          </svg>
          <span>Plans</span>
        </a>
        <a href="#" draggable="false" className={activeIndex === 3 ? 'active' : ''} data-index={3} onClick={(event) => { event.preventDefault(); selectItem(3); }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
            <path d="M17.004 10.407c.138.435-.216.842-.672.842h-3.465a.75.75 0 0 1-.65-.375l-1.732-3c-.229-.396-.053-.907.393-1.004a5.252 5.252 0 0 1 6.126 3.537ZM8.12 8.464c.307-.338.838-.235 1.066.16l1.732 3a.75.75 0 0 1 0 .75l-1.732 3c-.229.397-.76.5-1.067.161A5.23 5.23 0 0 1 6.75 12a5.23 5.23 0 0 1 1.37-3.536ZM10.878 17.13c-.447-.098-.623-.608-.394-1.004l1.733-3.002a.75.75 0 0 1 .65-.375h3.465c.457 0 .81.407.672.842a5.252 5.252 0 0 1-6.126 3.539Z" />
            <path fillRule="evenodd" d="M21 12.75a.75.75 0 1 0 0-1.5h-.783a8.22 8.22 0 0 0-.237-1.357l.734-.267a.75.75 0 1 0-.513-1.41l-.735.268a8.24 8.24 0 0 0-.689-1.192l.6-.503a.75.75 0 1 0-.964-1.149l-.6.504a8.3 8.3 0 0 0-1.054-.885l.391-.678a.75.75 0 1 0-1.299-.75l-.39.676a8.188 8.188 0 0 0-1.295-.47l.136-.77a.75.75 0 0 0-1.477-.26l-.136.77a8.36 8.36 0 0 0-1.377 0l-.136-.77a.75.75 0 1 0-1.477.26l.136.77c-.448.121-.88.28-1.294.47l-.39-.676a.75.75 0 0 0-1.3.75l.392.678a8.29 8.29 0 0 0-1.054.885l-.6-.504a.75.75 0 1 0-.965 1.149l.6.503a8.243 8.243 0 0 0-.689 1.192L3.8 8.216a.75.75 0 1 0-.513 1.41l.735.267a8.222 8.222 0 0 0-.238 1.356h-.783a.75.75 0 0 0 0 1.5h.783c.042.464.122.917.238 1.356l-.735.268a.75.75 0 0 0 .513 1.41l.735-.268c.197.417.428.816.69 1.191l-.6.504a.75.75 0 0 0 .963 1.15l.601-.505c.326.323.679.62 1.054.885l-.392.68a.75.75 0 0 0 1.3.75l.39-.679c.414.192.847.35 1.294.471l-.136.77a.75.75 0 0 0 1.477.261l.137-.772a8.332 8.332 0 0 0 1.376 0l.136.772a.75.75 0 1 0 1.477-.26l-.136-.771a8.19 8.19 0 0 0 1.294-.47l.391.677a.75.75 0 0 0 1.3-.75l-.393-.679a8.29 8.29 0 0 0 1.054-.885l.601.504a.75.75 0 0 0 .964-1.15l-.6-.503c.261-.375.492-.774.69-1.191l.735.267a.75.75 0 1 0 .512-1.41l-.734-.267c.115-.439.195-.892.237-1.356h.784Zm-2.657-3.06a6.744 6.744 0 0 0-1.19-2.053 6.784 6.784 0 0 0-1.82-1.51A6.705 6.705 0 0 0 12 5.25a6.8 6.8 0 0 0-1.225.11 6.7 6.7 0 0 0-2.15.793 6.784 6.784 0 0 0-2.952 3.489.76.76 0 0 1-.036.098A6.74 6.74 0 0 0 5.251 12a6.74 6.74 0 0 0 3.366 5.842l.009.005a6.704 6.704 0 0 0 2.18.798l.022.003a6.792 6.792 0 0 0 2.368-.004 6.704 6.704 0 0 0 2.205-.811 6.785 6.785 0 0 0 1.762-1.484l.009-.01.009-.01a6.743 6.743 0 0 0 1.18-2.066c.253-.707.39-1.469.39-2.263a6.74 6.74 0 0 0-.408-2.309Z" clipRule="evenodd" />
          </svg>
          <span>Settings</span>
        </a>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;

  .filter-definitions {
    position: absolute;
    width: 0;
    height: 0;
    overflow: hidden;
  }

  .menu {
    position: relative;
    /* position: fixed;
    left: 50%;
    bottom: 12px;
    bottom: calc(12px + env(safe-area-inset-bottom)); */
    /* transform: translateX(-50%); */
    width: calc(100% - 20px);
    max-width: 460px;
    background: rgba(0, 122, 255, 0.38);
    border: 1px solid var(--glass-border);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
    padding: 8px;
    border-radius: 99rem;
    display: flex;
    justify-content: center;
    gap: 8px;
    z-index: 50;
    touch-action: pan-y;
  }

  .menu::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    box-shadow:
      inset 2px 2px 5px -2px rgba(255, 255, 255, 0.4),
      inset -2px -2px 5px 2px rgba(255, 255, 255, 0.4),
      inset 0 -2px 0 rgba(255, 255, 255, 0.2);
    pointer-events: none;
    z-index: 2;
  }

  .active-indicator {
    position: absolute;
    z-index: 0;
    top: 8px;
    bottom: 8px;
    left: 8px;
    width: calc((100% - 40px) / 4);
    margin-left: 0;
    border-radius: 999rem;
    isolation: isolate;
    background: rgba(255, 254, 254, 0.18);
    transform: translateX(calc(var(--active-index) * (100% + 8px)));
    transition:
      transform 0.42s cubic-bezier(0.22, 1, 0.36, 1),
      width 0.24s cubic-bezier(0.22, 1, 0.36, 1),
      margin-left 0.24s cubic-bezier(0.22, 1, 0.36, 1);
    pointer-events: none;
  }

  .active-indicator::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    border: 1px solid rgba(0, 122, 255, 0.38);
    border-radius: inherit;
    background-color: rgba(153, 202, 254, 0.38);
    box-shadow:
      inset 0 0 20px -5px rgba(255, 255, 255, 0.91),
      inset 0 1px 1px rgb(255, 255, 255);
    pointer-events: none;
  }

  .active-indicator::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    border-radius: inherit;
    backdrop-filter: url(#liquid-glass-filter);
    -webkit-backdrop-filter: url(#liquid-glass-filter);
    isolation: isolate;
  }

  .menu.is-dragging .active-indicator {
    z-index: 2;
    width: calc((100% - 40px) / 4 + 12px);
    margin-left: -6px;
    transform: translateX(var(--drag-offset));
    transition:
      width 0.24s cubic-bezier(0.22, 1, 0.36, 1),
      margin-left 0.24s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .menu a {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1 1 0;
    min-width: 0;
    color: rgba(255, 255, 255, 90%);
    text-decoration: none;
    padding: 10px 6px;
    border-radius: 999rem;
    -webkit-tap-highlight-color: transparent;
    -webkit-user-drag: none;
    user-select: none;
    transition:
      color 0.18s var(--ease-spring),
      transform 0.18s var(--ease-spring);
  }

  .menu a:hover,
  .menu a.active {
    color: rgba(0, 122, 255, 70%);
  }

  .menu a svg {
    width: 1.4rem;
    font-size: 1.4rem;
  }

  .menu a span {
    font-size: 0.8rem;
    font-weight: 600;
    line-height: 1;
    margin-top: 4px;
  }

  .menu a:active {
    transform: scale(0.98);
  }

  @media (prefers-reduced-motion: reduce) {
    .active-indicator {
      transition-duration: 0.01ms;
    }
  }`;

export default Card;
