export const twilioPhoneNumber: string = (process.env.TWILIO_PHONE_NUMBER || '').toString();
// export const twilioClient: twilio.Twilio = twilio(accountSid, authToken);
// url to handle questions
export const voiceEndpoint = 'handle-phone-survey-input';
export const voiceURL = `${process?.env?.TWILIO_STATUS_CALLBACK_URL || ''}/${voiceEndpoint}`;
// url to update status of phone calls
export const eventEndpoint = 'handle-phone-survey-event-update';
export const eventURL = `${process?.env?.TWILIO_STATUS_CALLBACK_URL || ''}/${eventEndpoint}`;
// url to update status of phone calls
export const failureEndpoint = 'handle-phone-survey-failed';
export const failureURL = `${process?.env?.TWILIO_STATUS_CALLBACK_URL || ''}/${failureEndpoint}`;
// url to handle recording updates
export const recordingEndpoint = 'recording-events';
export const recordingURL = `${process?.env?.TWILIO_STATUS_CALLBACK_URL || ''}/${recordingEndpoint}`;
// url to handle transcription updates
export const transcriptionEndpoint = 'transcription-events';
export const transcriptionURL = `${process?.env?.TWILIO_STATUS_CALLBACK_URL || ''}/${transcriptionEndpoint}`;
// export const transcriptionURL = `https://40ec-68-234-129-32.ngrok-free.app/tsc-phone-survey/us-central1/app/${transcriptionEndpoint}`;
