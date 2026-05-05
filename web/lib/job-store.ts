import prisma from './db';

interface JobState {
  isRunning: boolean;
  totalListings: number;
  totalReviews: number;
  currentAsin: string | null;
  completedAsins: number;
  error?: string | null;
}

export const jobStore = {
  async set(jobId: string, state: JobState) {
    await prisma.scrapeJob.upsert({
      where: { id: jobId },
      update: {
        isRunning: state.isRunning,
        totalListings: state.totalListings,
        totalReviews: state.totalReviews,
        currentAsin: state.currentAsin,
        completedAsins: state.completedAsins,
        error: state.error || null,
      },
      create: {
        id: jobId,
        isRunning: state.isRunning,
        totalListings: state.totalListings,
        totalReviews: state.totalReviews,
        currentAsin: state.currentAsin,
        completedAsins: state.completedAsins,
        error: state.error || null,
      },
    });
  },

  async update(jobId: string, patch: Partial<JobState>) {
    await prisma.scrapeJob.update({
      where: { id: jobId },
      data: {
        isRunning: patch.isRunning,
        totalListings: patch.totalListings,
        totalReviews: patch.totalReviews,
        currentAsin: patch.currentAsin,
        completedAsins: patch.completedAsins,
        error: patch.error === undefined ? undefined : (patch.error || null),
      },
    });
  },

  async get(jobId: string): Promise<JobState | null> {
    const job = await prisma.scrapeJob.findUnique({ where: { id: jobId } });
    if (!job) return null;
    return {
      isRunning: job.isRunning,
      totalListings: job.totalListings,
      totalReviews: job.totalReviews,
      currentAsin: job.currentAsin,
      completedAsins: job.completedAsins,
      error: job.error,
    };
  },

  async getLatest(): Promise<JobState | null> {
    const job = await prisma.scrapeJob.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    if (!job) return null;
    return {
      isRunning: job.isRunning,
      totalListings: job.totalListings,
      totalReviews: job.totalReviews,
      currentAsin: job.currentAsin,
      completedAsins: job.completedAsins,
      error: job.error,
    };
  },
};
