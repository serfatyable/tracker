import type { RotationPetition } from '../../types/rotationPetitions';

/**
 * Send email notification when a petition is approved
 */
export async function sendPetitionApprovedEmail(
  petition: RotationPetition,
  residentEmail: string,
  rotationName: string,
): Promise<void> {
  // TODO: Integrate with email service (e.g., SendGrid, AWS SES)
  // For now, we'll log the email that would be sent
  console.log('📧 Email Notification - Petition Approved:', {
    to: residentEmail,
    subject: 'Rotation Petition Approved',
    body: `Your petition to ${petition.type === 'activate' ? 'activate' : 'finish'} the rotation "${rotationName}" has been approved.`,
    petitionId: petition.id,
  });

  // Example implementation:
  // await emailService.send({
  //   to: residentEmail,
  //   subject: 'Rotation Petition Approved',
  //   html: generatePetitionApprovedEmail(petition, rotationName),
  // });
}

/**
 * Send email notification when a petition is denied
 */
export async function sendPetitionDeniedEmail(
  petition: RotationPetition,
  residentEmail: string,
  rotationName: string,
): Promise<void> {
  // TODO: Integrate with email service (e.g., SendGrid, AWS SES)
  // For now, we'll log the email that would be sent
  console.log('📧 Email Notification - Petition Denied:', {
    to: residentEmail,
    subject: 'Rotation Petition Denied',
    body: `Your petition to ${petition.type === 'activate' ? 'activate' : 'finish'} the rotation "${rotationName}" has been denied.`,
    petitionId: petition.id,
  });

  // Example implementation:
  // await emailService.send({
  //   to: residentEmail,
  //   subject: 'Rotation Petition Denied',
  //   html: generatePetitionDeniedEmail(petition, rotationName),
  // });
}

/**
 * Generate HTML email template for approved petition
 */
function generatePetitionApprovedEmail(petition: RotationPetition, rotationName: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #059669;">Rotation Petition Approved</h2>
      <p>Your petition to ${petition.type === 'activate' ? 'activate' : 'finish'} the rotation <strong>${rotationName}</strong> has been approved.</p>
      ${petition.reason ? `<p><strong>Your reason:</strong> ${petition.reason}</p>` : ''}
      <p>You can now proceed with this rotation.</p>
    </div>
  `;
}

/**
 * Generate HTML email template for denied petition
 */
function generatePetitionDeniedEmail(petition: RotationPetition, rotationName: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Rotation Petition Denied</h2>
      <p>Your petition to ${petition.type === 'activate' ? 'activate' : 'finish'} the rotation <strong>${rotationName}</strong> has been denied.</p>
      ${petition.reason ? `<p><strong>Your reason:</strong> ${petition.reason}</p>` : ''}
      <p>Please contact your tutor or administrator for more information.</p>
    </div>
  `;
}
