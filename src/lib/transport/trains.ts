import 'server-only';

import { prisma } from '@/lib/prisma';

/**
 * Train schedules.
 *
 * Bangladesh Railway publishes no open API, so there is no live source to fall
 * back from — these timings are maintained in the dashboard against the
 * published timetable. That is stated on the page rather than left implied: a
 * schedule presented without provenance reads as live, and someone will plan a
 * connection around it.
 *
 * The shape mirrors the flight adapter so the page can label both the same way,
 * and so a live provider can be slotted in later without the page changing.
 */

export interface TrainResult {
  id: string;
  trainName: string;
  trainNumber: string | null;
  originStation: string;
  destinationStation: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number | null;
  offDay: string | null;
  routeStops: string | null;
  classesAvailable: string | null;
  source: 'agency';
  updatedAt: Date;
}

export function isLiveTrainDataConfigured(): boolean {
  // No public feed exists today. Kept as a function rather than a constant so
  // the page's provenance label reads from one place when one appears.
  return false;
}

export async function searchTrainSchedules(params: {
  origin?: string;
  destination?: string;
}): Promise<{ results: TrainResult[]; source: 'agency'; liveAvailable: boolean }> {
  const origin = params.origin?.trim();
  const destination = params.destination?.trim();

  const rows = await prisma.trainSchedule
    .findMany({
      where: {
        active: true,
        ...(origin
          ? { originStation: { contains: origin, mode: 'insensitive' as const } }
          : {}),
        ...(destination
          ? { destinationStation: { contains: destination, mode: 'insensitive' as const } }
          : {}),
      },
      orderBy: { departureTime: 'asc' },
      take: 60,
    })
    .catch(() => []);

  return {
    results: rows.map((row) => ({
      id: row.id,
      trainName: row.trainName,
      trainNumber: row.trainNumber,
      originStation: row.originStation,
      destinationStation: row.destinationStation,
      departureTime: row.departureTime,
      arrivalTime: row.arrivalTime,
      durationMinutes: row.durationMinutes,
      offDay: row.offDay,
      routeStops: row.routeStops,
      classesAvailable: row.classesAvailable,
      source: 'agency' as const,
      updatedAt: row.sourceUpdatedAt,
    })),
    source: 'agency',
    liveAvailable: isLiveTrainDataConfigured(),
  };
}
