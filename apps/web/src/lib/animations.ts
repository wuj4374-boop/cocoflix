import type { Variants } from 'framer-motion';

const cinematicEase = [0.25, 0.1, 0.25, 1] as const;
const springEase = [0.34, 1.56, 0.64, 1] as const;

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: cinematicEase },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: springEase },
  },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: cinematicEase },
  },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: cinematicEase },
  },
};

export const heroCrossfade = {
  initial: { opacity: 0, scale: 1.05 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 1.2, ease: cinematicEase },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.8, ease: 'easeIn' },
  },
};

export const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: cinematicEase },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2 },
  },
};

export const hoverLift: Variants = {
  rest: {
    y: 0,
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  },
  hover: {
    y: -8,
    boxShadow:
      '0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(229,9,20,0.15)',
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};
