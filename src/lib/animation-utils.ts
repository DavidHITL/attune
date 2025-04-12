
/**
 * Animation utilities for consistent micro-interactions across the application
 */

// Ripple effect function for buttons
export const createRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
  const button = event.currentTarget;
  
  // Return early if button has an existing ripple
  const existingRipple = button.querySelector('.ripple');
  if (existingRipple) {
    existingRipple.remove();
  }
  
  // Create ripple element
  const ripple = document.createElement('span');
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;
  
  // Get position relative to button
  const rect = button.getBoundingClientRect();
  
  ripple.style.width = ripple.style.height = `${diameter}px`;
  ripple.style.left = `${event.clientX - rect.left - radius}px`;
  ripple.style.top = `${event.clientY - rect.top - radius}px`;
  ripple.classList.add('ripple');
  
  // Add ripple to button
  button.appendChild(ripple);
  
  // Remove ripple after animation completes
  setTimeout(() => {
    ripple.remove();
  }, 600);
};

// Apply hover animation to any element
export const applyHoverAnimation = (element: HTMLElement) => {
  element.classList.add('hover-animation');
};

// Apply click animation to any element
export const applyClickAnimation = (element: HTMLElement) => {
  element.classList.add('click-animation');
  
  // Remove the animation class after it completes
  setTimeout(() => {
    element.classList.remove('click-animation');
  }, 300);
};

// Apply pulse animation to any element
export const applyPulseAnimation = (element: HTMLElement) => {
  element.classList.add('pulse-animation');
};

// Remove pulse animation from any element
export const removePulseAnimation = (element: HTMLElement) => {
  element.classList.remove('pulse-animation');
};
