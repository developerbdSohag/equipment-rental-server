import cron from 'node-cron';
import { getDB } from '../db.js';

export function startCronJobs() {
  // Run every hour to check for completed bookings
  // Cron format: minute, hour, day of month, month, day of week
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('⏰ [Cron Job] Running automated booking status update check...');
      const db = getDB();
      const now = new Date();

      // Find active or confirmed bookings where endDate < now
      const cursor = await db.collection('bookings').find({
        bookingStatus: { $in: ['Active', 'Confirmed'] }
      });
      const activeBookings = await cursor.toArray();

      let updatedCount = 0;
      for (const booking of activeBookings) {
        if (booking.endDate) {
          const end = new Date(booking.endDate);
          if (end < now) {
            await db.collection('bookings').updateOne(
              { _id: booking._id },
              { $set: { bookingStatus: 'Completed', completedAt: now.toISOString() } }
            );
            updatedCount++;
          }
        }
      }

      if (updatedCount > 0) {
        console.log(`✅ [Cron Job] Successfully marked ${updatedCount} booking(s) as Completed.`);
      } else {
        console.log('ℹ️ [Cron Job] No overdue bookings to update.');
      }
    } catch (err) {
      console.error('❌ [Cron Job Error]:', err.message);
    }
  });

  console.log('🚀 [Cron Service] Booking status cron job scheduled.');
}
