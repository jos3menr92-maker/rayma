import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me || !me.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await req.json();
    if (!code || typeof code !== 'string') {
      return Response.json({ valid: false, error: 'Code is required' });
    }

    // Look up diagnostic code (service role bypasses RLS)
    const codes = await base44.asServiceRole.entities.PromoCode.filter({
      code: code.toUpperCase().trim(),
      is_active: true,
      reward_type: 'diagnostic_access'
    });
    const diagnosticCode = codes[0];

    if (!diagnosticCode) {
      return Response.json({ valid: false, error: 'Invalid code' });
    }

    // Check expiry
    if (diagnosticCode.expires_at && new Date(diagnosticCode.expires_at) < new Date()) {
      return Response.json({ valid: false, error: 'This code has expired' });
    }

    // Check max uses (diagnostic codes are single-use)
    if (diagnosticCode.max_uses && (diagnosticCode.times_used || 0) >= diagnosticCode.max_uses) {
      return Response.json({ valid: false, error: 'This code has already been used' });
    }

    // Consume the code — mark as used (single-use enforcement)
    await base44.asServiceRole.entities.PromoCode.update(diagnosticCode.id, {
      redeemed_by: [...(diagnosticCode.redeemed_by || []), me.id],
      times_used: (diagnosticCode.times_used || 0) + 1,
    });

    console.log(`✓ Diagnostic code redeemed: ${code} by user ${me.email}`);

    return Response.json({ valid: true });
  } catch (error) {
    console.error('verifyDiagnosticCode error:', error.message);
    return Response.json({ valid: false, error: 'Verification failed' });
  }
});