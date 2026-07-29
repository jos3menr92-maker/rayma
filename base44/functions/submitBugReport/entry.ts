import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { title, description, code_snippet, page_url } = body;

    if (!title || !code_snippet) {
      return Response.json({ error: 'Title and code snippet are required' }, { status: 400 });
    }

    // 1. Save the bug report
    const report = await base44.entities.BugReport.create({
      title,
      description: description || '',
      code_snippet,
      page_url: page_url || '',
      status: 'submitted'
    });

    // 2. Fetch all active admin emails
    const adminEmails = await base44.asServiceRole.entities.AdminEmail.filter({ is_active: true });

    if (!adminEmails || adminEmails.length === 0) {
      console.warn('No active admin emails configured for bug reports');
      return Response.json({
        success: true,
        report_id: report.id,
        emails_sent: 0,
        message: 'Bug report saved, but no admin emails are configured.'
      });
    }

    // 3. Send email to each admin
    const emailResults = [];
    const submitterName = user.full_name || user.email || 'Unknown user';
    const submitDate = new Date().toLocaleString();

    for (const adminEmail of adminEmails) {
      try {
        const emailBody = [
          `<div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto;">`,
          `<h2 style="color: #0d9488;">🐛 New Bug Report</h2>`,
          `<p style="color: #64748b; font-size: 13px;">Submitted by <strong>${submitterName}</strong> on ${submitDate}</p>`,
          `<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />`,
          `<p><strong style="color: #1e293b;">Title:</strong> ${title}</p>`,
          description ? `<p><strong style="color: #1e293b;">Description:</strong></p><div style="background: #f8fafc; padding: 12px; border-radius: 8px; font-size: 14px; color: #334155;">${description}</div>` : '',
          page_url ? `<p><strong style="color: #1e293b;">Page:</strong> <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${page_url}</code></p>` : '',
          `<p><strong style="color: #1e293b;">Troubleshooting Code:</strong></p>`,
          `<pre style="background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 13px; line-height: 1.5;"><code>${code_snippet.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`,
          `<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />`,
          `<p style="color: #94a3b8; font-size: 12px;">This bug report was submitted via Rayma AI Diagnostics &amp; Repair.</p>`,
          `</div>`
        ].join('\n');

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: adminEmail.email,
          subject: `🐛 Bug Report: ${title}`,
          body: emailBody
        });
        emailResults.push({ email: adminEmail.email, success: true });
      } catch (err) {
        console.error(`Failed to email ${adminEmail.email}:`, err.message);
        emailResults.push({ email: adminEmail.email, success: false, error: err.message });
      }
    }

    const sent = emailResults.filter(r => r.success).length;
    const failed = emailResults.filter(r => !r.success).length;

    return Response.json({
      success: true,
      report_id: report.id,
      emails_sent: sent,
      emails_failed: failed,
      email_results: emailResults
    });
  } catch (error) {
    console.error('submitBugReport error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}