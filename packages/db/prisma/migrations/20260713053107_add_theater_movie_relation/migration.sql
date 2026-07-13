-- CreateTable
CREATE TABLE "TheaterMovie" (
    "id" TEXT NOT NULL,
    "theaterId" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TheaterMovie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TheaterMovie_theaterId_movieId_key" ON "TheaterMovie"("theaterId", "movieId");

-- AddForeignKey
ALTER TABLE "TheaterMovie" ADD CONSTRAINT "TheaterMovie_theaterId_fkey" FOREIGN KEY ("theaterId") REFERENCES "Theater"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TheaterMovie" ADD CONSTRAINT "TheaterMovie_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
