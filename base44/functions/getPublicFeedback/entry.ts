import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Public, sanitized feedback read path.
// Returns ONLY: the aggregate average rating + count, and reviews the admin
// explicitly approved AND featured AND the user consented to make public.
// No emails, ids, or any other personal data ever leave this function.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    const all = await base44.asServiceRole.entities.Feedback.list('-created_date', 200);
    const rated = (all || []).filter(f => typeof f.rating === 'number');

    const avg = rated.length > 0
      ? rated.reduce((s, f) => s + f.rating, 0) / rated.length
      : null;
    const count = rated.length;

    const testimonials = (all || [])
      .filter(f =>
        f.status === 'approved' &&
        f.feature_on_landing === true &&
        f.public_consent === true &&
        f.message
      )
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 10)
      .map(f => ({
        display_name: f.display_name || 'Member',
        rating: f.rating,
        message: f.message
      }));

    return Response.json({ avg, count, testimonials });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}