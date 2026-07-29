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

    // Save the bug report to the Base44 database — admins can view it from the Admin panel
    const report = await base44.entities.BugReport.create({
      title,
      description: description || '',
      code_snippet,
      page_url: page_url || '',
      status: 'submitted'
    });

    return Response.json({
      success: true,
      report_id: report.id
    });
  } catch (error) {
    console.error('submitBugReport error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}