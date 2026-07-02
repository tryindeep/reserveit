-- CreateTable
CREATE TABLE "Movie" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "casts" TEXT[],
    "trailerUrl" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'English',
    "releaseDate" TEXT NOT NULL,
    "director" TEXT NOT NULL,
    "releaseStatus" TEXT NOT NULL DEFAULT 'RELEASED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);
