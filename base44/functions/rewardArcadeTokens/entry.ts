import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, message: "Unauthorized: Please log in." }, { status: 401 });
    }

    const body = await req.json();
    const { gameId, level } = body;

    if (!level || level < 10) {
      return Response.json({ success: false, message: "Nice try! You must reach Level 10 to earn a reward." }, { status: 400 });
    }

    const currentBars = user.energy_bars || 0;
    const newEnergyTotal = currentBars + 1;

    await base44.auth.updateMe({ energy_bars: newEnergyTotal });

    return Response.json({
      success: true,
      rewardGranted: true,
      message: `Congratulations! You beat Level 10 in ${gameId} and earned 1 Energy Bar.`
    });

  } catch (error) {
    console.error("[Base44] Error rewarding arcade tokens:", error);
    return Response.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
});