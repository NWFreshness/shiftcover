import Twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const client =
  accountSid?.startsWith('AC') && authToken ? Twilio(accountSid, authToken) : null;

function sanitizeError(error) {
  console.error('SMS error:', error);
  return 'Failed to send SMS';
}

export async function sendShiftNotification(phone, shiftDetails) {
  if (!client) {
    console.log('SMS disabled: Twilio not configured');
    return { success: false, reason: 'SMS disabled' };
  }

  const message = `ShiftCover: You have been assigned a shift on ${shiftDetails.date} from ${shiftDetails.startTime} to ${shiftDetails.endTime} at ${shiftDetails.site || shiftDetails.role}. Reply YES to confirm.`;

  try {
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: phone,
    });
    return { success: true, sid: result.sid };
  } catch (error) {
    throw new Error(sanitizeError(error));
  }
}

export async function sendOpenShiftAlert(phone, shiftDetails) {
  if (!client) {
    console.log('SMS disabled: Twilio not configured');
    return { success: false, reason: 'SMS disabled' };
  }

  const message = `ShiftCover: An open shift needs coverage! ${shiftDetails.date} ${shiftDetails.startTime}-${shiftDetails.endTime} at ${shiftDetails.site || shiftDetails.role}. Open the app to claim it.`;

  try {
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: phone,
    });
    return { success: true, sid: result.sid };
  } catch (error) {
    throw new Error(sanitizeError(error));
  }
}

export async function sendSms(phone, message) {
  if (!client) {
    console.log('SMS disabled: Twilio not configured');
    return { success: false, reason: 'SMS disabled' };
  }
  try {
    const result = await client.messages.create({ body: message, from: fromNumber, to: phone });
    return { success: true, sid: result.sid };
  } catch (error) {
    throw new Error(sanitizeError(error));
  }
}

export function isSMSEnabled() {
  return client !== null;
}