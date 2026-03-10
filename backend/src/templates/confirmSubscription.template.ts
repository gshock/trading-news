export class ConfirmSubscriptionTemplate {
  render(email: string, confirmUrl: string): string {
    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Confirm your subscription</title>
      </head>
      <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Georgia,'Times New Roman',serif;">

        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;">
          <tr>
            <td align="center" style="padding:40px 16px;">

              <table width="520" cellpadding="0" cellspacing="0" border="0"
                style="max-width:520px;width:100%;background-color:#ffffff;border-radius:4px;overflow:hidden;border:1px solid #e2e8f0;">

                <!-- Top accent -->
                <tr>
                  <td style="background-color:#1e40af;height:4px;font-size:0;line-height:0;">&nbsp;</td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding:32px 32px 24px;">
                    <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;color:#0f172a;">
                      Confirm your subscription
                    </h1>
                    <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#475569;">
                      You're subscribing with <strong style="color:#0f172a;">${email}</strong>.
                    </p>
                    <p style="margin:0 0 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#475569;">
                      Click the button below to confirm and start receiving Market Snapshot updates.
                    </p>
                  </td>
                </tr>

                <!-- CTA -->
                <tr>
                  <td style="padding:0 32px 32px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color:#1e40af;border-radius:4px;">
                          <a href="${confirmUrl}" target="_blank"
                            style="display:inline-block;padding:12px 32px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.3px;">
                            Confirm Subscription
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Fallback link -->
                <tr>
                  <td style="padding:0 32px 28px;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#94a3b8;">
                      If the button doesn't work, copy and paste this link into your browser:<br>
                      <a href="${confirmUrl}" style="color:#1e40af;word-break:break-all;">${confirmUrl}</a>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding:16px 32px;border-top:1px solid #e2e8f0;background-color:#f8fafc;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#94a3b8;text-align:center;">
                      If you didn't request this, you can safely ignore this email.
                    </p>
                  </td>
                </tr>

              </table>

            </td>
          </tr>
        </table>

      </body>
      </html>`;
  }
}
