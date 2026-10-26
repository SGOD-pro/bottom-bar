import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { buildLiquidGlassFilter } from './liquidGlass';

const getPillTravel = (menu) => {
  const menuWidth = menu.offsetWidth;
  const menuBounds = menu.getBoundingClientRect();
  const scale = menuBounds.width / menuWidth;
  const pillWidth = (menuWidth - 40) / 4 + 8;
  const minOffset = -menuBounds.left / scale - 2;
  const maxOffset = (window.innerWidth - menuBounds.left) / scale - 2 - pillWidth;
  const step = (maxOffset - minOffset) / 3;

  return { menuOrigin: menuBounds.left, scale, pillWidth, minOffset, maxOffset, step };
};

const Card = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAutoSliding, setIsAutoSliding] = useState(false);
  const indicatorRef = useRef(null);
  const autoSlideRef = useRef(null);
  const impactAnimationRef = useRef(null);
  const filterDefsRef = useRef(null);
  const dragRef = useRef(null);
  const menuRef = useRef(null);

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

  const animateEdgeImpact = (edge) => {
    const indicator = indicatorRef.current;
    if (!indicator || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    impactAnimationRef.current?.cancel();
    const transformOrigin = edge === 'right' ? 'right center' : 'center';
    const keyframes = [
      { scale: '1 1', transformOrigin, offset: 0 },
      { scale: '1 0.72', transformOrigin, offset: 0.55 },
      { scale: '1.025 1.025', transformOrigin, offset: 0.86 },
      { scale: '1 1', transformOrigin, offset: 1 },
    ];
    const animation = indicator.animate(
      keyframes,
      {
        duration: 1250,
        easing: 'cubic-bezier(0.22, 0.75, 0.25, 1)',
      },
    );
    impactAnimationRef.current = animation;
    animation.onfinish = () => {
      if (impactAnimationRef.current === animation) impactAnimationRef.current = null;
    };
  };

  const selectItemUnderPointer = (event) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;

    const menu = event.currentTarget;
    const indicator = indicatorRef.current;
    const { menuOrigin, scale, pillWidth, minOffset, maxOffset, step } = getPillTravel(menu);
    const pointerOffset = (event.clientX - menuOrigin) / scale;

    if (!drag.isDragging) {
      if (Math.abs(event.clientX - drag.startX) < 5) return;

      drag.isDragging = true;
      menu.setPointerCapture(event.pointerId);
      setIsDragging(true);
    }

    const rawOffset = pointerOffset - pillWidth / 2 - 2;
    const previousOffset = drag.targetOffset;
    drag.targetOffset = Math.min(
      Math.max(rawOffset, minOffset),
      maxOffset,
    );
    if (rawOffset < minOffset && previousOffset > minOffset) animateEdgeImpact('left');
    if (rawOffset > maxOffset && previousOffset < maxOffset) animateEdgeImpact('right');
    drag.position = (drag.targetOffset - minOffset) / step;
    drag.minOffset = minOffset;
    drag.step = step;

    if (drag.frameId === null) {
      const updatePosition = () => {
        const currentDrag = dragRef.current;
        if (!currentDrag) return;

        const distance = currentDrag.targetOffset - currentDrag.currentOffset;
        currentDrag.currentOffset += distance * 0.4;
        if (Math.abs(distance) < 0.15) currentDrag.currentOffset = currentDrag.targetOffset;

        indicator.style.setProperty('--drag-offset', `${currentDrag.currentOffset}px`);
        if (menuRef.current) {
          const smoothPosition = (currentDrag.currentOffset - currentDrag.minOffset) / currentDrag.step;
          menuRef.current.style.setProperty('--pill-position', smoothPosition);
        }
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

    if (autoSlideRef.current) {
      cancelAnimationFrame(autoSlideRef.current.frameId);
      autoSlideRef.current = null;
      indicatorRef.current?.style.removeProperty('--drag-offset');
      menuRef.current?.style.removeProperty('--pill-position');
      setIsAutoSliding(false);
    }
    impactAnimationRef.current?.cancel();
    impactAnimationRef.current = null;
    const menu = menuRef.current;
    const travel = menu ? getPillTravel(menu) : null;
    const startOffset = travel
      ? 3 + activeIndex * ((menu.offsetWidth - 34) / 4 + 8)
      : 0;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      isDragging: false,
      targetOffset: startOffset,
      currentOffset: startOffset,
      position: activeIndex,
      activeIndex,
      minOffset: travel?.minOffset ?? 0,
      step: travel?.step ?? 1,
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
    menuRef.current?.style.removeProperty('--pill-position');
    setActiveIndex(Math.round(drag.position));
    setIsDragging(false);
  };

  const selectItem = (index) => {
    if (index === activeIndex) return;

    if (autoSlideRef.current) {
      cancelAnimationFrame(autoSlideRef.current.frameId);
      autoSlideRef.current = null;
    }

    const menu = menuRef.current;
    const indicator = indicatorRef.current;
    if (!menu || !indicator) {
      setActiveIndex(index);
      return;
    }

    const { minOffset, step } = getPillTravel(menu);
    const startOffset = 3 + activeIndex * ((menu.offsetWidth - 34) / 4 + 8);
    const targetOffset = minOffset + index * step;
    const duration = 320;
    let startTime = null;
    indicator.style.setProperty('--drag-offset', `${startOffset}px`);
    menu.style.setProperty('--pill-position', activeIndex);
    setIsAutoSliding(true);

    const animateSlide = (timestamp) => {
      if (startTime === null) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easedProgress = progress < 0.5
        ? 4 * progress ** 3
        : 1 - ((-2 * progress + 2) ** 3) / 2;
      const offset = startOffset + (targetOffset - startOffset) * easedProgress;
      indicator.style.setProperty('--drag-offset', `${offset}px`);
      menu.style.setProperty('--pill-position', (offset - minOffset) / step);

      if (progress < 1) {
        autoSlideRef.current = { frameId: requestAnimationFrame(animateSlide) };
        return;
      }

      autoSlideRef.current = null;
      indicator.style.setProperty('--drag-offset', `${targetOffset}px`);
      menu.style.setProperty('--pill-position', index);
      setActiveIndex(index);
      setIsAutoSliding(false);
    };

    autoSlideRef.current = { frameId: requestAnimationFrame(animateSlide) };
  };

  return (
    <StyledWrapper>
      <svg className="filter-definitions" aria-hidden="true" colorInterpolationFilters="sRGB">
        <defs ref={filterDefsRef} />
      </svg>
      <div
        ref={menuRef}
        className={`menu${isDragging ? ' is-dragging' : ''}${isAutoSliding ? ' is-auto-sliding' : ''}`}
        style={{ '--active-index': activeIndex }}
        onPointerMove={selectItemUnderPointer}
        onPointerDown={startDragging}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
      >
        <div className="blue-overlay" aria-hidden="true">
          <div className="blue-item">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" />
              <path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" />
            </svg>
            <span>Home</span>
          </div>
          <div className="blue-item">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.5 21a3 3 0 0 0 3-3v-4.5a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3V18a3 3 0 0 0 3 3h15ZM1.5 10.146V6a3 3 0 0 1 3-3h5.379a2.25 2.25 0 0 1 1.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 0 1 3 3v1.146A4.483 4.483 0 0 0 19.5 9h-15a4.483 4.483 0 0 0-3 1.146Z" />
            </svg>
            <span>Files</span>
          </div>
          <div className="blue-item">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 0 1 7.5 3v1.5h9V3A.75.75 0 0 1 18 3v1.5h.75a3 3 0 0 1 3 3v11.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3H6V3a.75.75 0 0 1 .75-.75Zm13.5 9a1.5 1.5 0 0 0-1.5-1.5H5.25a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5v-7.5Z" clipRule="evenodd" />
            </svg>
            <span>Plans</span>
          </div>
          <div className="blue-item">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.004 10.407c.138.435-.216.842-.672.842h-3.465a.75.75 0 0 1-.65-.375l-1.732-3c-.229-.396-.053-.907.393-1.004a5.252 5.252 0 0 1 6.126 3.537ZM8.12 8.464c.307-.338.838-.235 1.066.16l1.732 3a.75.75 0 0 1 0 .75l-1.732 3c-.229.397-.76.5-1.067.161A5.23 5.23 0 0 1 6.75 12a5.23 5.23 0 0 1 1.37-3.536ZM10.878 17.13c-.447-.098-.623-.608-.394-1.004l1.733-3.002a.75.75 0 0 1 .65-.375h3.465c.457 0 .81.407.672.842a5.252 5.252 0 0 1-6.126 3.539Z" />
              <path fillRule="evenodd" d="M21 12.75a.75.75 0 1 0 0-1.5h-.783a8.22 8.22 0 0 0-.237-1.357l.734-.267a.75.75 0 1 0-.513-1.41l-.735.268a8.24 8.24 0 0 0-.689-1.192l.6-.503a.75.75 0 1 0-.964-1.149l-.6.504a8.3 8.3 0 0 0-1.054-.885l.391-.678a.75.75 0 1 0-1.299-.75l-.39.676a8.188 8.188 0 0 0-1.295-.47l.136-.77a.75.75 0 0 0-1.477-.26l-.136.77a8.36 8.36 0 0 0-1.377 0l-.136-.77a.75.75 0 1 0-1.477.26l.136.77c-.448.121-.88.28-1.294.47l-.39-.676a.75.75 0 0 0-1.3.75l.392.678a8.29 8.29 0 0 0-1.054.885l-.6-.504a.75.75 0 1 0-.965 1.149l.6.503a8.243 8.243 0 0 0-.689 1.192L3.8 8.216a.75.75 0 1 0-.513 1.41l.735.267a8.222 8.222 0 0 0-.238 1.356h-.783a.75.75 0 0 0 0 1.5h.783c.042.464.122.917.238 1.356l-.735.268a.75.75 0 0 0 .513 1.41l.735-.268c.197.417.428.816.69 1.191l-.6.504a.75.75 0 0 0 .963 1.15l.601-.505c.326.323.679.62 1.054.885l-.392.68a.75.75 0 0 0 1.3.75l.39-.679c.414.192.847.35 1.294.471l-.136.77a.75.75 0 0 0 1.477.261l.137-.772a8.332 8.332 0 0 0 1.376 0l.136.772a.75.75 0 1 0 1.477-.26l-.136-.771a8.19 8.19 0 0 0 1.294-.47l.391.677a.75.75 0 0 0 1.3-.75l-.393-.679a8.29 8.29 0 0 0 1.054-.885l.601.504a.75.75 0 0 0 .964-1.15l-.6-.503c.261-.375.492-.774.69-1.191l.735.267a.75.75 0 1 0 .512-1.41l-.734-.267c.115-.439.195-.892.237-1.356h.784Zm-2.657-3.06a6.744 6.744 0 0 0-1.19-2.053 6.784 6.784 0 0 0-1.82-1.51A6.705 6.705 0 0 0 12 5.25a6.8 6.8 0 0 0-1.225.11 6.7 6.7 0 0 0-2.15.793 6.784 6.784 0 0 0-2.952 3.489.76.76 0 0 1-.036.098A6.74 6.74 0 0 0 5.251 12a6.74 6.74 0 0 0 3.366 5.842l.009.005a6.704 6.704 0 0 0 2.18.798l.022.003a6.792 6.792 0 0 0 2.368-.004 6.704 6.704 0 0 0 2.205-.811 6.785 6.785 0 0 0 1.762-1.484l.009-.01.009-.01a6.743 6.743 0 0 0 1.18-2.066c.253-.707.39-1.469.39-2.263a6.74 6.74 0 0 0-.408-2.309Z" clipRule="evenodd" />
            </svg>
            <span>Settings</span>
          </div>
        </div>
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
        <div ref={indicatorRef} className="active-indicator" aria-hidden="true" />
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;

  .filter-definitions {
  position: fixed;
  left: 0;
  top: 0;
  width: 1px;
  height: 1px;
  overflow: visible;
  pointer-events: none;
}

  .menu {
    position: relative;
    /* position: fixed;
    left: 50%;
    bottom: 12px;
    bottom: calc(12px + env(safe-area-inset-bottom)); */
    /* transform: translateX(-50%); */
    width: calc(100% - 40px);
    max-width: 440px;
    background: #E8DCC6;
    border: 1px solid var(--glass-border);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.03);
    padding: 5px;
    border-radius: 99rem;
    display: flex;
    justify-content: center;
    gap: 8px;
    z-index: 50;
    touch-action: pan-y;
    transition:
      background-color 0.24s ease,
      transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .menu.is-dragging {
    background: #EBE0CC;
    transform: scale(1.02);
  }

  .menu.is-auto-sliding {
    background: #EBE0CC;
    transform: scale(1.02);
  }

  .menu::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    box-shadow:
      inset 0 2px 4px -3px rgba(255, 255, 255, 0.35),
      inset 0 -2px 4px -3px rgba(255, 255, 255, 0.35),
      inset 0 0 8px -4px rgba(255, 255, 255, 0.2);
    pointer-events: none;
    z-index: 4;
  }

  .active-indicator {
    position: absolute;
    z-index: 3;
    top: 1px;
    bottom: 1px;
    left: 5px;
    width: calc((100% - 34px) / 4);
    margin-left: 0;
    border-radius: 999rem;
    isolation: isolate;
    background: rgba(255, 255, 255, 0.08);
    transform: translateX(calc(var(--active-index) * (100% + 8px)));
    transition:
      transform 0.42s cubic-bezier(0.22, 1, 0.36, 1),
      width 0.24s cubic-bezier(0.22, 1, 0.36, 1),
      margin-left 0.24s cubic-bezier(0.22, 1, 0.36, 1),
      top 0.24s cubic-bezier(0.22, 1, 0.36, 1),
      bottom 0.24s cubic-bezier(0.22, 1, 0.36, 1);
    pointer-events: none;
  }

  .active-indicator::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: inherit;
    background-color: rgba(210, 190, 160, 0.22);
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
    opacity: 0;
    transition: opacity 0.25s ease;
    -webkit-mask-image:
      linear-gradient(to right, black 0%, black 26%, transparent 38%, transparent 62%, black 74%, black 100%),
      linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%);
    -webkit-mask-composite: source-in;
    mask-image:
      linear-gradient(to right, black 0%, black 26%, transparent 38%, transparent 62%, black 74%, black 100%),
      linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%);
    mask-composite: intersect;
  }
  
  
/* Safari-safe fallback: preserve the glass appearance */
@supports (-webkit-backdrop-filter: blur(1px)) {
  .active-indicator::after {
    -webkit-backdrop-filter: url(#liquid-glass-filter);
    backdrop-filter: url(#liquid-glass-filter);
    opacity: 1;
    -webkit-mask-image: none;
    mask-image: none;
  }
}

/* Keep the original custom SVG filter for browsers that support it */
@supports not (-webkit-backdrop-filter: blur(1px)) {
  .active-indicator::after {
    backdrop-filter: url(#liquid-glass-filter);
  }
}



  .menu.is-dragging .active-indicator::after {
  opacity: 1;
  -webkit-backdrop-filter: url(#liquid-glass-filter);
  backdrop-filter: url(#liquid-glass-filter);
}

  .menu.is-dragging .active-indicator {
    z-index: 3;
    top: -4px;
    bottom: -4px;
    width: calc((100% - 40px) / 4 + 8px);
    margin-left: -3px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
    transform: translateX(var(--drag-offset));
    transition:
      width 0.24s cubic-bezier(0.22, 1, 0.36, 1),
      margin-left 0.24s cubic-bezier(0.22, 1, 0.36, 1),
      top 0.24s cubic-bezier(0.22, 1, 0.36, 1),
      bottom 0.24s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .menu.is-auto-sliding .active-indicator {
    z-index: 3;
    top: -4px;
    bottom: -4px;
    width: calc((100% - 40px) / 4 + 8px);
    margin-left: -3px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
    transform: translateX(var(--drag-offset));
    transition:
      width 0.24s cubic-bezier(0.22, 1, 0.36, 1),
      margin-left 0.24s cubic-bezier(0.22, 1, 0.36, 1),
      top 0.24s cubic-bezier(0.22, 1, 0.36, 1),
      bottom 0.24s cubic-bezier(0.22, 1, 0.36, 1);
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
    padding: 2px 6px;
    border-radius: 999rem;
    -webkit-tap-highlight-color: transparent;
    -webkit-user-drag: none;
    user-select: none;
    transition:
      color 0.25s ease,
      transform 0.18s var(--ease-spring);
  }

  .menu a.active {
    color: #722F37;
  }

  .blue-overlay {
    position: absolute;
    top: 5px;
    bottom: 5px;
    left: 5px;
    right: 5px;
    display: flex;
    gap: 8px;
    pointer-events: none;
    z-index: 2;
    color: #722F37;
    --slot: calc((100% + 8px) / 4);
    --pw: calc(var(--slot) - 8px);
    --pl: calc(var(--pill-position, var(--active-index)) * var(--slot));
    clip-path: inset(0 calc(100% - var(--pl) - var(--pw)) 0 var(--pl) round 999px);
    transition: clip-path 0.42s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .blue-overlay .blue-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1 1 0;
    min-width: 0;
    padding: 2px 6px;
  }

  .blue-overlay .blue-item svg {
    width: 1.4rem;
    font-size: 1.4rem;
  }

  .blue-overlay .blue-item span {
    font-size: 0.8rem;
    font-weight: 600;
    line-height: 1;
    margin-top: 4px;
  }

  .menu.is-dragging .blue-overlay,
  .menu.is-auto-sliding .blue-overlay {
    transition: none;
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
