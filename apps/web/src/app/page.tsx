'use client';

import { motion } from 'framer-motion';

import { Header } from '@/components/layout/Header';
import { Hero } from '@/components/media/Hero';
import { MediaRow } from '@/components/media/MediaRow';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 40 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {/* Hero */}
        <Hero />

        {/* Media rows */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative z-10 -mt-40 md:-mt-48 pb-20"
        >
          <motion.div variants={item}>
            <MediaRow title="热门推荐" endpoint="/media/trending" />
          </motion.div>

          <motion.div variants={item}>
            <MediaRow title="最新更新" endpoint="/media/latest" />
          </motion.div>

          <motion.div variants={item}>
            <MediaRow title="电影" endpoint="/media/by-genre/action" />
          </motion.div>

          <motion.div variants={item}>
            <MediaRow title="电视剧" endpoint="/media/by-genre/drama" />
          </motion.div>

          <motion.div variants={item}>
            <MediaRow title="动漫" endpoint="/media/by-genre/animation" />
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
